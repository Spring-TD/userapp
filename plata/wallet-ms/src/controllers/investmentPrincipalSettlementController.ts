import type { Request, Response } from 'express';
import { WalletService } from '../services';
import { logger } from '../utils/logger';
import { requestAmountToKobo } from '../utils/money';
import { walletForApi, transactionForApi } from '../utils/walletApiMoney';

const REPAYMENT_SOURCE = 'spring-investment-purchase';

/**
 * Credits product creator REPAYMENT wallet on Plata when Spring integrator sells an investment.
 * Called via account-ms-plata gateway (PLATA_PUBLIC_KEY / PLATA_SECRET_KEY).
 */
export async function collectInvestmentPrincipalSettlement(req: Request, res: Response): Promise<void> {
  try {
    const {
      creatorMerchantId,
      creatorAppId,
      amount,
      amountUnit,
      currency = 'NGN',
      referenceId,
      source,
      category,
      description,
      productId,
      productType,
      applicationId,
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
    const parsed = requestAmountToKobo(amount, amountUnit);
    if (!parsed.ok) {
      res.status(400).json({ success: false, error: parsed.error });
      return;
    }
    if (parsed.kobo <= 0) {
      res.status(400).json({ success: false, error: 'amount must be a positive number' });
      return;
    }
    if (!referenceId || typeof referenceId !== 'string') {
      res.status(400).json({ success: false, error: 'referenceId is required' });
      return;
    }

    const result = await WalletService.collectToRepayment({
      merchantId: creatorMerchantId.trim(),
      appId: creatorAppId.trim(),
      amount: parsed.kobo,
      currency: typeof currency === 'string' ? currency : 'NGN',
      referenceId: referenceId.trim(),
      source: (typeof source === 'string' && source.trim()) || REPAYMENT_SOURCE,
      category: (typeof category === 'string' && category.trim()) || 'INVESTMENT_DEPOSIT',
      description:
        (typeof description === 'string' && description.trim()) ||
        `Investment principal repayment collection: ${referenceId.trim()}`,
      productId: typeof productId === 'string' ? productId.trim() : undefined,
      productType: typeof productType === 'string' ? productType.trim().toUpperCase() : undefined,
      applicationId: typeof applicationId === 'string' ? applicationId.trim() : undefined,
      debitUserWallet: false,
      metadata: metadata && typeof metadata === 'object' ? metadata : {}
    });

    if (!result.success) {
      res.status(500).json({ success: false, error: result.error || 'Investment principal repayment collection failed' });
      return;
    }

    const repaymentWallet = result.repaymentWallet ?? result.settlementWallet ?? result.wallet;
    const repaymentTx = result.repaymentTransaction ?? result.settlementTransaction ?? result.transaction;

    res.status(200).json({
      success: true,
      duplicate: result.duplicate === true,
      data: {
        ...result,
        wallet: repaymentWallet ? walletForApi(repaymentWallet) : result.wallet,
        repaymentWallet: repaymentWallet ? walletForApi(repaymentWallet) : undefined,
        settlementWallet: repaymentWallet ? walletForApi(repaymentWallet) : undefined,
        transaction: repaymentTx ? transactionForApi(repaymentTx) : result.transaction,
        repaymentTransaction: repaymentTx ? transactionForApi(repaymentTx) : undefined,
        settlementTransaction: repaymentTx ? transactionForApi(repaymentTx) : undefined,
        userWallet: result.userWallet ? walletForApi(result.userWallet) : undefined,
        userTransaction: result.userTransaction ? transactionForApi(result.userTransaction) : undefined
      }
    });
  } catch (error) {
    logger.error('Investment principal repayment collection failed', { error });
    const message = error instanceof Error ? error.message : 'Investment principal repayment collection failed';
    res.status(500).json({ success: false, error: message });
  }
}

/** @deprecated Alias for collectInvestmentPrincipalSettlement (route naming retained for backward compat) */
export const collectInvestmentPrincipalRepayment = collectInvestmentPrincipalSettlement;
