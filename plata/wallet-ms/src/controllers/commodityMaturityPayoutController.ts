import type { Request, Response } from 'express';
import { WalletService } from '../services';
import { logger } from '../utils/logger';
import { requestAmountToKobo } from '../utils/money';
import { walletForApi, transactionForApi } from '../utils/walletApiMoney';

const DEFAULT_CATEGORY_BY_TYPE: Record<string, string> = {
  COMMODITY: 'COMMODITY_MATURITY_PAYOUT',
  SAVINGS: 'SAVINGS_MATURITY_PAYOUT',
  INVESTMENT: 'INVESTMENT_MATURITY_PAYOUT'
};

/**
 * Debits product-creator TREASURY on Plata for maturity payout.
 * Counterparty credit happens on Spring wallet-ms (storefront user PRIMARY).
 * Called via account-ms-plata gateway (PLATA_PUBLIC_KEY / PLATA_SECRET_KEY).
 *
 * Mirrors enrollment: principal collects into REPAYMENT; maturity pays out from TREASURY.
 */
export async function debitMaturityFromTreasury(req: Request, res: Response): Promise<void> {
  try {
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
      category,
      metadata
    } = req.body || {};

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
        res.status(400).json({ success: false, error: 'principalAmount and interestAmount must be valid numbers' });
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

    const normalizedType =
      typeof productType === 'string' && productType.trim()
        ? productType.trim().toUpperCase()
        : 'COMMODITY';
    const resolvedCategory =
      (typeof category === 'string' && category.trim()) ||
      DEFAULT_CATEGORY_BY_TYPE[normalizedType] ||
      'COMMODITY_MATURITY_PAYOUT';

    const result = await WalletService.debitTreasuryForSettlement({
      merchantId: creatorMerchantId.trim(),
      appId: creatorAppId.trim(),
      amount: parsed.kobo,
      currency: typeof currency === 'string' ? currency : 'NGN',
      referenceId: referenceId.trim(),
      category: resolvedCategory,
      description:
        (typeof description === 'string' && description.trim()) ||
        `${normalizedType} maturity payout from Treasury: ${referenceId.trim()}`,
      productId: typeof productId === 'string' ? productId.trim() : undefined,
      productType: normalizedType,
      applicationId: typeof applicationId === 'string' ? applicationId.trim() : undefined,
      offeringMerchantId: typeof offeringMerchantId === 'string' ? offeringMerchantId.trim() : undefined
    });

    if (result.insufficientFunds) {
      res.status(402).json({
        success: false,
        error: result.error || 'Insufficient balance in Treasury wallet',
        code: 'INSUFFICIENT_TREASURY_WALLET_BALANCE',
        data: {
          treasuryWallet: result.treasuryWallet ? walletForApi(result.treasuryWallet) : undefined,
          fundingInstructions: result.fundingInstructions,
          metadata: metadata && typeof metadata === 'object' ? metadata : undefined
        }
      });
      return;
    }

    if (!result.success) {
      const status = result.error?.toLowerCase().includes('not found') ? 404 : 400;
      res.status(status).json({
        success: false,
        error: result.error || 'Maturity Treasury debit failed'
      });
      return;
    }

    res.status(result.duplicate ? 200 : 201).json({
      success: true,
      duplicate: result.duplicate === true,
      data: {
        treasuryWallet: result.treasuryWallet ? walletForApi(result.treasuryWallet) : undefined,
        treasuryTransaction: result.treasuryTransaction
          ? transactionForApi(result.treasuryTransaction)
          : undefined
      }
    });
  } catch (error) {
    logger.error('Maturity Treasury debit failed', { error });
    const message = error instanceof Error ? error.message : 'Maturity Treasury debit failed';
    res.status(500).json({ success: false, error: message });
  }
}

/** @deprecated Alias kept for commodity-specific imports */
export const debitCommodityMaturityFromTreasury = debitMaturityFromTreasury;
