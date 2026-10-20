import type { Request, Response } from 'express';
import { enqueueMaturityWithdrawalRequest } from '../services/maturityWithdrawalRequestService';
import { logger } from '../utils/logger';
import { requestAmountToKobo } from '../utils/money';
import { transactionForApi, walletForApi } from '../utils/walletApiMoney';

/**
 * Gateway: enqueue maturity withdrawal for merchant Approval queue (no balance debit yet).
 */
export async function requestMaturityWithdrawal(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body || {};
    const {
      creatorMerchantId,
      creatorAppId,
      amount,
      principalAmount,
      interestAmount,
      amountUnit,
      currency = 'NGN',
      referenceId,
      description,
      productId,
      productType,
      applicationId,
      offeringMerchantId,
      offeringAppId,
      userId,
      customerName,
      customerEmail,
      productName,
      maturityAt,
      springLocalApplicationId,
      metadata
    } = body;

    if (!creatorMerchantId || typeof creatorMerchantId !== 'string') {
      res.status(400).json({ success: false, error: 'creatorMerchantId is required' });
      return;
    }
    if (!creatorAppId || typeof creatorAppId !== 'string') {
      res.status(400).json({ success: false, error: 'creatorAppId is required' });
      return;
    }
    if (!referenceId || typeof referenceId !== 'string') {
      res.status(400).json({ success: false, error: 'referenceId is required' });
      return;
    }

    let payoutAmount = amount;
    if (payoutAmount == null && (principalAmount != null || interestAmount != null)) {
      const principal = Number(principalAmount ?? 0);
      const interest = Number(interestAmount ?? 0);
      if (!Number.isFinite(principal) || principal < 0 || !Number.isFinite(interest) || interest < 0) {
        res.status(400).json({
          success: false,
          error: 'principalAmount and interestAmount must be valid numbers'
        });
        return;
      }
      payoutAmount = Math.round((principal + interest) * 100) / 100;
    }

    const parsed = requestAmountToKobo(payoutAmount, amountUnit);
    if (!parsed.ok) {
      res.status(400).json({ success: false, error: parsed.error });
      return;
    }
    if (parsed.kobo <= 0) {
      res.status(400).json({ success: false, error: 'amount must be a positive number' });
      return;
    }

    const principalParsed = requestAmountToKobo(
      principalAmount != null ? principalAmount : payoutAmount,
      amountUnit
    );
    const interestParsed = requestAmountToKobo(interestAmount ?? 0, amountUnit);
    if (!principalParsed.ok || !interestParsed.ok) {
      res.status(400).json({ success: false, error: 'Invalid principalAmount or interestAmount' });
      return;
    }

    const result = await enqueueMaturityWithdrawalRequest({
      creatorMerchantId: creatorMerchantId.trim(),
      creatorAppId: creatorAppId.trim(),
      amount: parsed.kobo,
      amountUnit: 'kobo',
      principalAmount: principalParsed.kobo,
      interestAmount: interestParsed.kobo,
      currency: typeof currency === 'string' ? currency : 'NGN',
      referenceId: referenceId.trim(),
      description: typeof description === 'string' ? description : undefined,
      productId: typeof productId === 'string' ? productId : undefined,
      productType: typeof productType === 'string' ? productType : 'COMMODITY',
      applicationId: typeof applicationId === 'string' ? applicationId : undefined,
      offeringMerchantId: typeof offeringMerchantId === 'string' ? offeringMerchantId : undefined,
      offeringAppId: typeof offeringAppId === 'string' ? offeringAppId : undefined,
      userId: typeof userId === 'string' ? userId : undefined,
      customerName: typeof customerName === 'string' ? customerName : undefined,
      customerEmail: typeof customerEmail === 'string' ? customerEmail : undefined,
      productName: typeof productName === 'string' ? productName : undefined,
      maturityAt: typeof maturityAt === 'string' ? maturityAt : undefined,
      springLocalApplicationId:
        typeof springLocalApplicationId === 'string' ? springLocalApplicationId : undefined,
      metadata: metadata && typeof metadata === 'object' ? metadata : undefined
    });

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error || 'Failed to enqueue withdrawal request' });
      return;
    }

    res.status(result.duplicate ? 200 : 201).json({
      success: true,
      duplicate: result.duplicate === true,
      data: {
        status: 'pending_approval',
        treasuryWallet: result.treasuryWallet ? walletForApi(result.treasuryWallet) : undefined,
        transaction: result.transaction ? transactionForApi(result.transaction) : undefined
      }
    });
  } catch (error) {
    logger.error('Maturity withdrawal request failed', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Maturity withdrawal request failed'
    });
  }
}
