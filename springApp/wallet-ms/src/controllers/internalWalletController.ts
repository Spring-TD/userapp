import { Request, Response, NextFunction } from 'express';
import { WalletService } from '../services';
import { logger } from '../utils/logger';

/**
 * POST /api/v1/internal/wallets/user
 * Creates a user wallet (and Payonus NUBAN when enabled) without an end-user JWT.
 * Called from client-auth-ms after merchant-scoped user signup.
 */
export class InternalWalletController {
  static async createUserWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, merchantId, name, currency, complianceShareholderUserId } = req.body as {
        userId?: string;
        merchantId?: string;
        name?: string;
        currency?: string;
        complianceShareholderUserId?: string;
      };

      if (!userId || typeof userId !== 'string' || !userId.trim()) {
        res.status(400).json({ success: false, error: 'userId is required' });
        return;
      }
      if (!merchantId || typeof merchantId !== 'string' || !merchantId.trim()) {
        res.status(400).json({ success: false, error: 'merchantId is required' });
        return;
      }

      const result = await WalletService.createUserWallet({
        userId: userId.trim(),
        merchantId: merchantId.trim(),
        complianceShareholderUserId: complianceShareholderUserId?.trim() || userId.trim(),
        name: (name && String(name).trim()) || 'Personal Wallet',
        currency: (currency && String(currency).trim().toUpperCase()) || 'NGN'
      });

      if (!result.success) {
        res.status(400).json({ success: false, error: result.error || 'Failed to create user wallet' });
        return;
      }

      logger.info('Internal API: user wallet created', {
        userId: userId.trim(),
        merchantId: merchantId.trim(),
        walletId: result.wallet?.id
      });

      res.status(201).json({
        success: true,
        message: 'User wallet created successfully',
        data: { wallet: result.wallet }
      });
    } catch (error) {
      logger.error('Internal API: create user wallet failed', { error });
      next(error);
    }
  }

  static async ensureProductUserWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        userId,
        merchantId,
        complianceShareholderUserId,
        applicationId,
        productId,
        productName,
        productType,
        appId,
        currency
      } = req.body as {
        userId?: string;
        merchantId?: string;
        complianceShareholderUserId?: string;
        applicationId?: string;
        productId?: string;
        productName?: string;
        productType?: string;
        appId?: string;
        currency?: string;
      };

      const required = { userId, merchantId, applicationId, productId, productType, currency };
      for (const [key, value] of Object.entries(required)) {
        if (!value || typeof value !== 'string' || !value.trim()) {
          res.status(400).json({ success: false, error: `${key} is required` });
          return;
        }
      }

      const result = await WalletService.ensureProductUserWallet({
        userId: userId!.trim(),
        merchantId: merchantId!.trim(),
        complianceShareholderUserId: complianceShareholderUserId?.trim() || undefined,
        applicationId: applicationId!.trim(),
        productId: productId!.trim(),
        productName: productName?.trim() || undefined,
        productType: productType!.trim().toUpperCase(),
        appId: appId?.trim() || undefined,
        currency: currency!.trim().toUpperCase()
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error || 'Failed to ensure product wallet',
          data: result.wallet ? { wallet: result.wallet } : undefined
        });
        return;
      }

      logger.info('Internal API: product user wallet ensured', {
        userId: userId!.trim(),
        merchantId: merchantId!.trim(),
        applicationId: applicationId!.trim(),
        walletId: result.wallet?.id,
        reusedUpstreamAccount: result.reusedUpstreamAccount
      });

      res.status(result.skipped ? 200 : 201).json({
        success: true,
        skipped: result.skipped,
        reusedUpstreamAccount: result.reusedUpstreamAccount,
        message: result.reusedUpstreamAccount
          ? 'Product wallet linked to existing upstream account'
          : 'Product wallet created successfully',
        data: { wallet: result.wallet }
      });
    } catch (error) {
      logger.error('Internal API: ensure product user wallet failed', { error });
      next(error);
    }
  }

  static async applyProductApplicationApproval(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        userId,
        applicationId,
        merchantId,
        productId,
        productName,
        productType,
        appId,
        amount,
        currency,
        referenceId,
        description,
        metadata,
        upstreamAccount
      } = req.body as {
        userId?: string;
        applicationId?: string;
        merchantId?: string;
        productId?: string;
        productName?: string;
        productType?: string;
        appId?: string;
        amount?: number;
        currency?: string;
        referenceId?: string;
        description?: string;
        metadata?: Record<string, unknown>;
        upstreamAccount?: {
          accountNumber?: string;
          bankName?: string;
          bankCode?: string;
          providerReference?: string;
          accountType?: 'static' | 'reserved' | 'dynamic';
          provisionStatus?: 'active' | 'failed';
          provisionError?: string;
          provisionedAt?: string;
        };
      };

      const required = { userId, applicationId, merchantId, productId, productType, referenceId };
      for (const [key, value] of Object.entries(required)) {
        if (!value || typeof value !== 'string' || !value.trim()) {
          res.status(400).json({ success: false, error: `${key} is required` });
          return;
        }
      }
      if (typeof amount !== 'number' || !Number.isFinite(amount) || amount === 0) {
        res.status(400).json({ success: false, error: 'amount must be a non-zero finite number' });
        return;
      }

      const result = await WalletService.applyProductApplicationApproval({
        userId: userId!.trim(),
        applicationId: applicationId!.trim(),
        merchantId: merchantId!.trim(),
        productId: productId!.trim(),
        productName: productName?.trim() || undefined,
        productType: productType!.trim().toUpperCase(),
        appId: appId?.trim() || undefined,
        amount,
        currency: currency?.trim().toUpperCase(),
        referenceId: referenceId!.trim(),
        description: description?.trim() || undefined,
        metadata,
        upstreamAccount
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error || 'Failed to apply product application approval'
        });
        return;
      }

      logger.info('Internal API: product application approval applied', {
        userId: userId!.trim(),
        applicationId: applicationId!.trim(),
        walletId: result.wallet?.id,
        transactionId: result.transaction?.id,
        duplicate: result.duplicate === true
      });

      res.status(200).json({
        success: true,
        duplicate: result.duplicate === true,
        message: result.duplicate
          ? 'Product application approval already applied'
          : 'Product application approval applied',
        data: {
          wallet: result.wallet,
          transaction: result.transaction
        }
      });
    } catch (error) {
      logger.error('Internal API: apply product application approval failed', { error });
      next(error);
    }
  }

  static async chargeKycLinkFee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        merchantId,
        appId,
        amount,
        description,
        referenceId,
        userId
      } = req.body as {
        merchantId?: string;
        appId?: string;
        amount?: number;
        description?: string;
        referenceId?: string;
        userId?: string;
      };

      if (!merchantId?.trim() || !appId?.trim()) {
        res.status(400).json({ success: false, error: 'merchantId and appId are required' });
        return;
      }
      if (!referenceId?.trim()) {
        res.status(400).json({ success: false, error: 'referenceId is required' });
        return;
      }
      if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
        res.status(400).json({ success: false, error: 'amount must be a positive finite number' });
        return;
      }

      const result = await WalletService.chargeKycLinkFee({
        merchantId: merchantId.trim(),
        appId: appId.trim(),
        amount,
        description: description?.trim() || 'KYC verification link fee',
        referenceId: referenceId.trim(),
        userId: userId?.trim() || undefined
      });

      if (result.insufficientFunds) {
        res.status(402).json({
          success: false,
          error: result.error || 'Insufficient balance in KYC wallet',
          code: 'INSUFFICIENT_KYC_WALLET_BALANCE',
          data: {
            wallet: result.wallet,
            fundingInstructions: result.fundingInstructions
          }
        });
        return;
      }

      if (!result.success) {
        res.status(400).json({ success: false, error: result.error || 'Failed to charge KYC link fee' });
        return;
      }

      res.status(result.duplicate ? 200 : 201).json({
        success: true,
        duplicate: result.duplicate === true,
        message: result.duplicate ? 'KYC link fee already charged' : 'KYC link fee charged successfully',
        data: {
          wallet: result.wallet,
          transaction: result.transaction
        }
      });
    } catch (error) {
      logger.error('Internal API: charge KYC link fee failed', { error });
      next(error);
    }
  }

  static async refundKycLinkFee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        merchantId,
        appId,
        amount,
        description,
        referenceId,
        originalReferenceId,
        userId
      } = req.body as {
        merchantId?: string;
        appId?: string;
        amount?: number;
        description?: string;
        referenceId?: string;
        originalReferenceId?: string;
        userId?: string;
      };

      if (!merchantId?.trim() || !appId?.trim()) {
        res.status(400).json({ success: false, error: 'merchantId and appId are required' });
        return;
      }
      if (!referenceId?.trim()) {
        res.status(400).json({ success: false, error: 'referenceId is required' });
        return;
      }
      if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
        res.status(400).json({ success: false, error: 'amount must be a positive finite number' });
        return;
      }

      const result = await WalletService.refundKycLinkFee({
        merchantId: merchantId.trim(),
        appId: appId.trim(),
        amount,
        description: description?.trim() || 'KYC verification link fee refund',
        referenceId: referenceId.trim(),
        originalReferenceId: originalReferenceId?.trim() || undefined,
        userId: userId?.trim() || undefined
      });

      if (!result.success) {
        res.status(400).json({ success: false, error: result.error || 'Failed to refund KYC link fee' });
        return;
      }

      res.status(result.duplicate ? 200 : 201).json({
        success: true,
        duplicate: result.duplicate === true,
        message: result.duplicate ? 'KYC link fee already refunded' : 'KYC link fee refunded successfully',
        data: {
          wallet: result.wallet,
          transaction: result.transaction
        }
      });
    } catch (error) {
      logger.error('Internal API: refund KYC link fee failed', { error });
      next(error);
    }
  }

  /**
   * POST /internal/api/v1/wallets/repayment/collect
   * Credit the app-scoped Repayment wallet (formerly "Settlement"; optionally debit user wallet first).
   * Legacy alias: POST /internal/api/v1/wallets/settlement/collect
   */
  static async collectToRepayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as {
        merchantId?: string;
        appId?: string;
        userId?: string;
        amount?: number;
        referenceId?: string;
        source?: string;
        category?: string;
        description?: string;
        applicationId?: string;
        productId?: string;
        productType?: string;
        installmentNumber?: number;
        currency?: string;
        metadata?: Record<string, unknown>;
        debitUserWallet?: boolean;
      };

      const merchantId = (body.merchantId || '').trim();
      const referenceId = (body.referenceId || '').trim();
      const amount = Number(body.amount);

      if (!merchantId || !referenceId) {
        res.status(400).json({ success: false, error: 'merchantId and referenceId are required' });
        return;
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        res.status(400).json({ success: false, error: 'amount must be a positive number' });
        return;
      }
      if (!body.category?.trim()) {
        res.status(400).json({ success: false, error: 'category is required' });
        return;
      }

      const result = await WalletService.collectToRepayment({
        merchantId,
        appId: body.appId?.trim() || undefined,
        userId: body.userId?.trim() || undefined,
        amount,
        referenceId,
        source: body.source?.trim() || 'repayment-collection',
        category: body.category.trim(),
        description: body.description?.trim() || undefined,
        applicationId: body.applicationId?.trim() || undefined,
        productId: body.productId?.trim() || undefined,
        productType: body.productType?.trim().toUpperCase() || undefined,
        installmentNumber:
          body.installmentNumber !== undefined ? Number(body.installmentNumber) : undefined,
        currency: body.currency?.trim().toUpperCase(),
        metadata: body.metadata,
        debitUserWallet: body.debitUserWallet === true
      });

      if (result.insufficientFunds) {
        res.status(402).json({
          success: false,
          error: result.error || 'Insufficient balance in user wallet',
          code: 'INSUFFICIENT_USER_WALLET_BALANCE',
          data: {
            repaymentWallet: result.repaymentWallet,
            settlementWallet: result.repaymentWallet,
            userWallet: result.userWallet
          }
        });
        return;
      }

      if (!result.success || !result.repaymentWallet) {
        const status = result.error?.includes('not found') ? 404 : 400;
        res.status(status).json({ success: false, error: result.error || 'Failed to collect to repayment wallet' });
        return;
      }

      res.status(result.duplicate ? 200 : 201).json({
        success: true,
        duplicate: result.duplicate === true,
        data: {
          wallet: result.repaymentWallet,
          repaymentWallet: result.repaymentWallet,
          settlementWallet: result.repaymentWallet,
          userWallet: result.userWallet,
          transaction: result.repaymentTransaction ?? result.transaction,
          repaymentTransaction: result.repaymentTransaction ?? result.transaction,
          settlementTransaction: result.repaymentTransaction ?? result.transaction,
          userTransaction: result.userTransaction
        }
      });
    } catch (error) {
      logger.error('Internal API: collect to repayment failed', { error });
      next(error);
    }
  }

  /** @deprecated use collectToRepayment */
  static async collectToSettlement(req: Request, res: Response, next: NextFunction): Promise<void> {
    return this.collectToRepayment(req, res, next);
  }

  /**
   * POST /api/v1/internal/wallets/commodity/purchase
   * Debit user PRIMARY; credit offering SETTLEMENT (commission) + creator SETTLEMENT (principal).
   */
  static async collectCommodityPurchase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as {
        userId?: string;
        offeringMerchantId?: string;
        offeringAppId?: string;
        creatorMerchantId?: string;
        creatorAppId?: string;
        baseAmount?: number;
        commissionAmount?: number;
        referenceId?: string;
        productId?: string;
        currency?: string;
        allowExternalPrincipalSettlement?: boolean;
        integratorMerchantId?: string;
        integratorAppId?: string;
        metadata?: Record<string, unknown>;
      };

      const result = await WalletService.collectCommodityPurchase({
        userId: (body.userId || '').trim(),
        offeringMerchantId: (body.offeringMerchantId || '').trim(),
        offeringAppId: (body.offeringAppId || '').trim(),
        creatorMerchantId: (body.creatorMerchantId || '').trim(),
        creatorAppId: (body.creatorAppId || '').trim(),
        baseAmount: Number(body.baseAmount),
        commissionAmount: Number(body.commissionAmount ?? 0),
        referenceId: (body.referenceId || '').trim(),
        productId: (body.productId || '').trim(),
        currency: body.currency?.trim().toUpperCase(),
        allowExternalPrincipalSettlement: body.allowExternalPrincipalSettlement === true,
        integratorMerchantId: body.integratorMerchantId?.trim() || undefined,
        integratorAppId: body.integratorAppId?.trim() || undefined,
        metadata: body.metadata
      });

      if (result.insufficientFunds) {
        res.status(402).json({
          success: false,
          error: result.error || 'Insufficient balance in user wallet',
          code: 'INSUFFICIENT_USER_WALLET_BALANCE',
          data: { userWallet: result.userWallet }
        });
        return;
      }

      if (!result.success) {
        const status = result.error?.includes('not found') ? 404 : 400;
        res.status(status).json({ success: false, error: result.error || 'Failed to collect commodity purchase' });
        return;
      }

      res.status(result.duplicate ? 200 : 201).json({
        success: true,
        duplicate: result.duplicate === true,
        data: {
          totalAmount: result.totalAmount,
          principalSettledOnCreator: result.principalSettledOnCreator,
          principalPendingExternalSettlement: result.principalPendingExternalSettlement,
          userWallet: result.userWallet,
          offeringSettlementWallet: result.offeringSettlementWallet,
          creatorSettlementWallet: result.creatorSettlementWallet,
          userTransaction: result.userTransaction,
          commissionTransaction: result.commissionTransaction,
          principalDepositTransaction: result.principalDepositTransaction
        }
      });
    } catch (error) {
      logger.error('Internal API: commodity purchase collect failed', { error });
      next(error);
    }
  }

  /** POST /api/v1/internal/wallets/commodity/purchase/reverse */
  static async reverseCommodityPurchase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as {
        userId?: string;
        offeringMerchantId?: string;
        offeringAppId?: string;
        integratorMerchantId?: string;
        integratorAppId?: string;
        baseAmount?: number;
        commissionAmount?: number;
        referenceId?: string;
        productId?: string;
        currency?: string;
        creatorMerchantId?: string;
        creatorAppId?: string;
        metadata?: Record<string, unknown>;
      };

      const result = await WalletService.reverseCommodityPurchase({
        userId: (body.userId || '').trim(),
        offeringMerchantId: (body.offeringMerchantId || '').trim(),
        offeringAppId: (body.offeringAppId || '').trim(),
        creatorMerchantId: (body.creatorMerchantId || '').trim(),
        creatorAppId: (body.creatorAppId || '').trim(),
        baseAmount: Number(body.baseAmount),
        commissionAmount: Number(body.commissionAmount ?? 0),
        referenceId: (body.referenceId || '').trim(),
        productId: (body.productId || '').trim(),
        currency: body.currency?.trim().toUpperCase(),
        integratorMerchantId: body.integratorMerchantId?.trim() || undefined,
        integratorAppId: body.integratorAppId?.trim() || undefined,
        metadata: body.metadata
      });

      if (!result.success) {
        res.status(400).json({ success: false, error: result.error || 'Failed to reverse commodity purchase' });
        return;
      }

      res.status(200).json({ success: true });
    } catch (error) {
      logger.error('Internal API: commodity purchase reversal failed', { error });
      next(error);
    }
  }

  /** POST /api/v1/internal/wallets/commodity/maturity-payout */
  static async payoutCommodityMaturity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as {
        userId?: string;
        offeringMerchantId?: string;
        creatorMerchantId?: string;
        creatorAppId?: string;
        principalAmount?: number;
        interestAmount?: number;
        referenceId?: string;
        applicationId?: string;
        currency?: string;
        metadata?: Record<string, unknown>;
      };

      const result = await WalletService.payoutCommodityMaturity({
        userId: (body.userId || '').trim(),
        offeringMerchantId: (body.offeringMerchantId || '').trim(),
        creatorMerchantId: (body.creatorMerchantId || '').trim(),
        creatorAppId: (body.creatorAppId || '').trim(),
        principalAmount: Number(body.principalAmount),
        interestAmount: Number(body.interestAmount ?? 0),
        referenceId: (body.referenceId || '').trim(),
        applicationId: (body.applicationId || '').trim(),
        currency: body.currency?.trim().toUpperCase(),
        metadata: body.metadata
      });

      if (!result.success) {
        const status = result.error?.includes('not found') ? 404 : result.error?.includes('Insufficient') ? 402 : 400;
        res.status(status).json({ success: false, error: result.error || 'Failed to pay commodity maturity payout' });
        return;
      }

      res.status(result.duplicate ? 200 : 201).json({
        success: true,
        duplicate: result.duplicate === true,
        data: {
          totalPayout: result.totalPayout,
          userWallet: result.userWallet
        }
      });
    } catch (error) {
      logger.error('Internal API: commodity maturity payout failed', { error });
      next(error);
    }
  }

  /** POST /api/v1/internal/wallets/maturity-payout — savings/investment (Plata treasury-funded credit). */
  static async payoutMaturity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as {
        userId?: string;
        offeringMerchantId?: string;
        creatorMerchantId?: string;
        creatorAppId?: string;
        principalAmount?: number;
        interestAmount?: number;
        referenceId?: string;
        applicationId?: string;
        currency?: string;
        productType?: string;
        treasuryFundedExternally?: boolean;
        metadata?: Record<string, unknown>;
      };

      const result = await WalletService.payoutMaturity({
        userId: (body.userId || '').trim(),
        offeringMerchantId: (body.offeringMerchantId || '').trim(),
        creatorMerchantId: (body.creatorMerchantId || '').trim(),
        creatorAppId: (body.creatorAppId || '').trim(),
        principalAmount: Number(body.principalAmount),
        interestAmount: Number(body.interestAmount ?? 0),
        referenceId: (body.referenceId || '').trim(),
        applicationId: (body.applicationId || '').trim(),
        currency: body.currency?.trim().toUpperCase(),
        productType: body.productType,
        treasuryFundedExternally: body.treasuryFundedExternally === true,
        metadata: body.metadata
      });

      if (!result.success) {
        const status = result.error?.includes('not found')
          ? 404
          : result.error?.includes('Insufficient')
            ? 402
            : 400;
        res.status(status).json({ success: false, error: result.error || 'Failed to pay maturity payout' });
        return;
      }

      res.status(result.duplicate ? 200 : 201).json({
        success: true,
        duplicate: result.duplicate === true,
        data: {
          totalPayout: result.totalPayout,
          userWallet: result.userWallet
        }
      });
    } catch (error) {
      logger.error('Internal API: maturity payout failed', { error });
      next(error);
    }
  }

  /** POST /api/v1/internal/wallets/investment/purchase */
  static async collectInvestmentPurchase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as {
        userId?: string;
        offeringMerchantId?: string;
        offeringAppId?: string;
        integratorMerchantId?: string;
        integratorAppId?: string;
        principalAmount?: number;
        commissionAmount?: number;
        creatorPrincipalAmount?: number;
        referenceId?: string;
        productId?: string;
        applicationId?: string;
        currency?: string;
        creatorMerchantId?: string;
        creatorAppId?: string;
        metadata?: Record<string, unknown>;
      };

      const result = await WalletService.collectInvestmentPurchase({
        userId: (body.userId || '').trim(),
        offeringMerchantId: (body.offeringMerchantId || '').trim(),
        offeringAppId: (body.offeringAppId || '').trim(),
        integratorMerchantId: body.integratorMerchantId?.trim() || undefined,
        integratorAppId: body.integratorAppId?.trim() || undefined,
        principalAmount: Number(body.principalAmount),
        commissionAmount: Number(body.commissionAmount ?? 0),
        creatorPrincipalAmount:
          body.creatorPrincipalAmount != null ? Number(body.creatorPrincipalAmount) : undefined,
        referenceId: (body.referenceId || '').trim(),
        productId: (body.productId || '').trim(),
        applicationId: body.applicationId?.trim() || undefined,
        currency: body.currency?.trim().toUpperCase(),
        creatorMerchantId: body.creatorMerchantId?.trim() || undefined,
        creatorAppId: body.creatorAppId?.trim() || undefined,
        metadata: body.metadata
      });

      if (result.insufficientFunds) {
        res.status(402).json({
          success: false,
          error: result.error || 'Insufficient balance in user wallet',
          code: 'INSUFFICIENT_USER_WALLET_BALANCE',
          data: { userWallet: result.userWallet }
        });
        return;
      }

      if (!result.success) {
        const status = result.error?.includes('not found') ? 404 : 400;
        res.status(status).json({ success: false, error: result.error || 'Failed to collect investment purchase' });
        return;
      }

      res.status(result.duplicate ? 200 : 201).json({
        success: true,
        duplicate: result.duplicate === true,
        data: {
          principalAmount: result.principalAmount,
          totalUserDebit: result.totalUserDebit,
          userWallet: result.userWallet,
          offeringSettlementWallet: result.offeringSettlementWallet,
          userTransaction: result.userTransaction,
          commissionTransaction: result.commissionTransaction
        }
      });
    } catch (error) {
      logger.error('Internal API: investment purchase collect failed', { error });
      next(error);
    }
  }

  /** POST /api/v1/internal/wallets/investment/purchase/reverse */
  static async reverseInvestmentPurchase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as {
        userId?: string;
        offeringMerchantId?: string;
        offeringAppId?: string;
        integratorMerchantId?: string;
        integratorAppId?: string;
        principalAmount?: number;
        commissionAmount?: number;
        creatorPrincipalAmount?: number;
        referenceId?: string;
        productId?: string;
        applicationId?: string;
        currency?: string;
        creatorMerchantId?: string;
        creatorAppId?: string;
        metadata?: Record<string, unknown>;
      };

      const result = await WalletService.reverseInvestmentPurchase({
        userId: (body.userId || '').trim(),
        offeringMerchantId: (body.offeringMerchantId || '').trim(),
        offeringAppId: (body.offeringAppId || '').trim(),
        integratorMerchantId: body.integratorMerchantId?.trim() || undefined,
        integratorAppId: body.integratorAppId?.trim() || undefined,
        principalAmount: Number(body.principalAmount),
        commissionAmount: Number(body.commissionAmount ?? 0),
        creatorPrincipalAmount:
          body.creatorPrincipalAmount != null ? Number(body.creatorPrincipalAmount) : undefined,
        referenceId: (body.referenceId || '').trim(),
        productId: (body.productId || '').trim(),
        applicationId: body.applicationId?.trim() || undefined,
        currency: body.currency?.trim().toUpperCase(),
        creatorMerchantId: body.creatorMerchantId?.trim() || undefined,
        creatorAppId: body.creatorAppId?.trim() || undefined,
        metadata: body.metadata
      });

      if (!result.success) {
        res.status(400).json({ success: false, error: result.error || 'Failed to reverse investment purchase' });
        return;
      }

      res.status(200).json({ success: true });
    } catch (error) {
      logger.error('Internal API: investment purchase reversal failed', { error });
      next(error);
    }
  }

  /** POST /api/v1/internal/wallets/savings/purchase */
  static async collectSavingsPurchase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as {
        userId?: string;
        offeringMerchantId?: string;
        offeringAppId?: string;
        integratorMerchantId?: string;
        integratorAppId?: string;
        principalAmount?: number;
        referenceId?: string;
        productId?: string;
        applicationId?: string;
        currency?: string;
        creatorMerchantId?: string;
        creatorAppId?: string;
        metadata?: Record<string, unknown>;
      };

      const result = await WalletService.collectSavingsPurchase({
        userId: (body.userId || '').trim(),
        offeringMerchantId: (body.offeringMerchantId || '').trim(),
        offeringAppId: (body.offeringAppId || '').trim(),
        integratorMerchantId: body.integratorMerchantId?.trim() || undefined,
        integratorAppId: body.integratorAppId?.trim() || undefined,
        principalAmount: Number(body.principalAmount),
        referenceId: (body.referenceId || '').trim(),
        productId: (body.productId || '').trim(),
        applicationId: body.applicationId?.trim() || undefined,
        currency: body.currency?.trim().toUpperCase(),
        creatorMerchantId: body.creatorMerchantId?.trim() || undefined,
        creatorAppId: body.creatorAppId?.trim() || undefined,
        metadata: body.metadata
      });

      if (result.insufficientFunds) {
        res.status(402).json({
          success: false,
          error: result.error || 'Insufficient balance in user wallet',
          code: 'INSUFFICIENT_USER_WALLET_BALANCE',
          data: { userWallet: result.userWallet }
        });
        return;
      }

      if (!result.success) {
        const status = result.error?.includes('not found') ? 404 : 400;
        res.status(status).json({ success: false, error: result.error || 'Failed to collect savings deposit' });
        return;
      }

      res.status(result.duplicate ? 200 : 201).json({
        success: true,
        duplicate: result.duplicate === true,
        data: {
          principalAmount: result.principalAmount,
          userWallet: result.userWallet,
          userTransaction: result.userTransaction
        }
      });
    } catch (error) {
      logger.error('Internal API: savings deposit collect failed', { error });
      next(error);
    }
  }

  /** POST /api/v1/internal/wallets/savings/purchase/reverse */
  static async reverseSavingsPurchase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as {
        userId?: string;
        offeringMerchantId?: string;
        offeringAppId?: string;
        integratorMerchantId?: string;
        integratorAppId?: string;
        principalAmount?: number;
        referenceId?: string;
        productId?: string;
        applicationId?: string;
        currency?: string;
        creatorMerchantId?: string;
        creatorAppId?: string;
        metadata?: Record<string, unknown>;
      };

      const result = await WalletService.reverseSavingsPurchase({
        userId: (body.userId || '').trim(),
        offeringMerchantId: (body.offeringMerchantId || '').trim(),
        offeringAppId: (body.offeringAppId || '').trim(),
        integratorMerchantId: body.integratorMerchantId?.trim() || undefined,
        integratorAppId: body.integratorAppId?.trim() || undefined,
        principalAmount: Number(body.principalAmount),
        referenceId: (body.referenceId || '').trim(),
        productId: (body.productId || '').trim(),
        applicationId: body.applicationId?.trim() || undefined,
        currency: body.currency?.trim().toUpperCase(),
        creatorMerchantId: body.creatorMerchantId?.trim() || undefined,
        creatorAppId: body.creatorAppId?.trim() || undefined,
        metadata: body.metadata
      });

      if (!result.success) {
        res.status(400).json({ success: false, error: result.error || 'Failed to reverse savings deposit' });
        return;
      }

      res.status(200).json({ success: true });
    } catch (error) {
      logger.error('Internal API: savings deposit reversal failed', { error });
      next(error);
    }
  }

  static async chargeMonthlyCustomerBilling(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        merchantId,
        appId,
        amount,
        description,
        referenceId,
        billingPeriod,
        customerCount,
        pricePerCustomer,
        appName
      } = req.body as {
        merchantId?: string;
        appId?: string;
        amount?: number;
        description?: string;
        referenceId?: string;
        billingPeriod?: string;
        customerCount?: number;
        pricePerCustomer?: number;
        appName?: string;
      };

      if (!merchantId?.trim() || !appId?.trim() || !referenceId?.trim() || !billingPeriod?.trim()) {
        res.status(400).json({
          success: false,
          error: 'merchantId, appId, referenceId, and billingPeriod are required'
        });
        return;
      }
      if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
        res.status(400).json({ success: false, error: 'amount must be a non-negative finite number' });
        return;
      }
      if (typeof customerCount !== 'number' || !Number.isFinite(customerCount) || customerCount < 0) {
        res.status(400).json({ success: false, error: 'customerCount must be a non-negative finite number' });
        return;
      }
      if (typeof pricePerCustomer !== 'number' || !Number.isFinite(pricePerCustomer) || pricePerCustomer < 0) {
        res.status(400).json({ success: false, error: 'pricePerCustomer must be a non-negative finite number' });
        return;
      }

      const result = await WalletService.chargeMonthlyCustomerBilling({
        merchantId: merchantId.trim(),
        appId: appId.trim(),
        amount,
        description: description?.trim() || 'Monthly platform billing (per customer)',
        referenceId: referenceId.trim(),
        billingPeriod: billingPeriod.trim(),
        customerCount,
        pricePerCustomer,
        appName: appName?.trim() || undefined
      });

      if (result.skippedZeroAmount) {
        res.status(200).json({
          success: true,
          skipped: true,
          message: 'No charge — zero customers or zero amount',
          data: { customerCount, amount }
        });
        return;
      }

      if (result.insufficientFunds) {
        res.status(402).json({
          success: false,
          error: result.error || 'Insufficient balance in Billing wallet',
          code: 'INSUFFICIENT_BILLING_WALLET_BALANCE',
          data: {
            wallet: result.wallet,
            fundingInstructions: result.fundingInstructions
          }
        });
        return;
      }

      if (!result.success) {
        res.status(400).json({ success: false, error: result.error || 'Failed to charge monthly customer billing' });
        return;
      }

      res.status(result.duplicate ? 200 : 201).json({
        success: true,
        duplicate: result.duplicate === true,
        message: result.duplicate
          ? 'Monthly customer billing already charged for this period'
          : 'Monthly customer billing charged successfully',
        data: {
          wallet: result.wallet,
          transaction: result.transaction
        }
      });
    } catch (error) {
      logger.error('Internal API: charge monthly customer billing failed', { error });
      next(error);
    }
  }

  static async provisionUserNuban(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req.params.userId || '').trim();
      if (!userId) {
        res.status(400).json({ success: false, error: 'userId is required' });
        return;
      }

      const result = await WalletService.provisionUserWalletNuban(userId);

      if (result.skipped) {
        res.status(200).json({
          success: true,
          skipped: true,
          message: 'NUBAN already provisioned',
          data: { wallet: result.wallet }
        });
        return;
      }

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error || 'NUBAN provisioning failed',
          data: result.wallet ? { wallet: result.wallet } : undefined
        });
        return;
      }

      logger.info('Internal API: user wallet NUBAN provisioned after KYC', {
        userId,
        walletId: result.wallet?.id
      });

      res.status(200).json({
        success: true,
        message: 'User wallet NUBAN provisioned',
        data: { wallet: result.wallet }
      });
    } catch (error) {
      logger.error('Internal API: provision user NUBAN failed', { error });
      next(error);
    }
  }
}
