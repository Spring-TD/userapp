import { Request, Response, NextFunction } from 'express';
import { WalletService } from '../services';
import { TransactionPinService } from '../services/transactionPinService';
import { logger } from '../utils/logger';
import { validateInput, createMerchantWalletSchema, createUserWalletSchema, updateWalletBalanceSchema, filterTransactionSchema, transferOutSchema, productApplicationTransferSchema, debitWalletSchema, debitMerchantWalletSchema, billingToKycTransferSchema, kycToBillingTransferSchema, userApiCallSchema, userBankPayoutSchema, settlementBankPayoutSchema, bankNameEnquirySchema, addUserExternalBankAccountSchema } from '../utils/validation';
import { UserExternalBankAccountService } from '../services/userExternalBankAccountService';
import { normalizeMerchantWalletType } from '../utils/merchantWalletType';
import { MerchantWalletType, TransactionType } from '../models/Wallet';

// Define interfaces for the validated data
interface CreateMerchantWalletData {
  appId?: string;
  appName?: string;
  payonusSubaccountCode?: string;
  complianceShareholderUserId?: string;
  name: string;
  currency: string;
  merchantWalletType: MerchantWalletType;
}

interface CreateUserData {
  name: string;
  currency: string;
}

interface UpdateWalletBalanceData {
  amount: number;
  description: string;
}

interface FilterTransactionData {
  startDate?: string;
  endDate?: string;
  type?: TransactionType;
  limit?: string | number;
  skip?: string | number;
}

interface TransferOutData {
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  description: string;
}

interface DebitWalletData {
  userId: string;
  amount: number;
  description: string;
}

interface DebitRepaymentData {
  merchantId: string;
  amount: number;
  description: string;
}

interface BillingToKycTransferData {
  amount: number;
  description: string;
}

interface KycToBillingTransferData {
  amount: number;
  description: string;
}

interface BillingDebitData {
  amount: number;
  description: string;
}

interface KycDebitData {
  amount: number;
  description: string;
}

interface KycFeeData {
  amount: number;
  description: string;
}

interface UserTransferOutData {
  toWalletId: string;
  amount: number;
  description: string;
}

interface ProductApplicationTransferData {
  amount: number;
  description: string;
}

interface UserFilterTransactionData {
  startDate?: string;
  endDate?: string;
  type?: TransactionType;
}

interface UserApiCallData {
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  body: any;
  amount: number;
  description: string;
  apiKey?: string;
}

interface UserBankPayoutData {
  savedBankAccountId: string;
  amount: number;
  currency?: string;
  narration?: string;
  reference?: string;
}

interface AddUserExternalBankAccountData {
  accountNumber: string;
  bankName?: string;
  bankCode?: string;
  accountName?: string;
  label?: string;
  currency?: string;
}

interface SettlementBankPayoutData {
  appId?: string;
  accountNumber: string;
  bankCode: string;
  accountName: string;
  bankName?: string;
  amount: number;
  currency?: string;
  narration?: string;
  reference?: string;
}

function canAccessUserResource(
  req: Request,
  userId: string,
  wallets: { merchantId: string }[]
): boolean {
  if (!req.user) return false;
  if (req.user.userId === userId) return true;
  if ((req.user.userType || '').toUpperCase() === 'ADMIN') return true;

  const merchantIds = [req.user.merchantId, req.user.userId].filter(
    (value): value is string => Boolean(value)
  );
  if (merchantIds.length === 0) return false;

  return wallets.some((wallet) => merchantIds.includes(wallet.merchantId));
}

export class WalletController {
  /**
   * POST /api/v1/wallets/merchant
   * Create a new merchant wallet of specific type
   */
  static async createMerchantWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Validate input data
      const { error, value } = validateInput<CreateMerchantWalletData>(createMerchantWalletSchema, req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      const merchantId = req.user.merchantId || req.user.userId;
      const { appId, appName, payonusSubaccountCode, complianceShareholderUserId, name, currency, merchantWalletType } =
        value!;
      const normalizedType = normalizeMerchantWalletType(merchantWalletType);
      if (!normalizedType) {
        res.status(400).json({ success: false, error: 'Invalid merchant wallet type' });
        return;
      }

      const result = await WalletService.createMerchantWallet({
        merchantId,
        complianceShareholderUserId: complianceShareholderUserId || req.user.userId,
        appId,
        appName,
        payonusSubaccountCode,
        name: name || `${normalizedType} Wallet`,
        currency: currency || 'NGN',
        merchantWalletType: normalizedType
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('Merchant wallet created successfully', {
        merchantId,
        appId,
        walletId: result.wallet?.id,
        walletType: merchantWalletType
      });

      res.status(201).json({
        success: true,
        message: 'Merchant wallet created successfully',
        data: {
          wallet: result.wallet
        }
      });
    } catch (error) {
      logger.error('Error creating merchant wallet', { error });
      next(error);
    }
  }

  /**
   * POST /api/v1/wallets/merchant/all
   * Create all required merchant wallets (Billing, KYC, Repayment)
   */
  static async createAllMerchantWallets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const merchantId = req.user.merchantId || req.user.userId;
      const { currency, appId, appName, payonusSubaccountCode, complianceShareholderUserId } = req.body;

      const result = await WalletService.createAllMerchantWallets(
        merchantId,
        currency || 'NGN',
        false,
        appId,
        appName,
        payonusSubaccountCode,
        complianceShareholderUserId || req.user.userId
      );

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('All merchant wallets created successfully', {
        merchantId,
        appId,
        walletCount: result.wallets?.length
      });

      res.status(201).json({
        success: true,
        message: 'All merchant wallets created successfully',
        data: {
          wallets: result.wallets
        }
      });
    } catch (error) {
      logger.error('Error creating all merchant wallets', { error });
      next(error);
    }
  }

  /**
   * GET /api/v1/wallets/merchant/:merchantId/type/:walletType
   * Get merchant wallet by merchant ID and wallet type
   */
  static async getMerchantWalletByType(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { merchantId, walletType } = req.params;
      const appId = typeof req.query.appId === 'string' ? req.query.appId : undefined;

      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Check if user has permission to access this wallet
      if (req.user.userType !== 'MERCHANT' && req.user.merchantId !== merchantId) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      const normalizedType = normalizeMerchantWalletType(walletType);
      if (!normalizedType) {
        res.status(400).json({
          success: false,
          error: 'Invalid merchant wallet type'
        });
        return;
      }

      const result = await WalletService.getMerchantWalletByType(merchantId, normalizedType, appId);

      if (!result.success) {
        res.status(404).json({
          success: false,
          error: result.error
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          wallet: result.wallet
        }
      });
    } catch (error) {
      logger.error('Error retrieving merchant wallet', { error });
      next(error);
    }
  }

  /**
   * GET /api/v1/wallets/merchant/:merchantId/all
   * Get all merchant wallets by merchant ID
   */
  static async getAllMerchantWallets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { merchantId } = req.params;

      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Check if user has permission to access these wallets
      if (req.user.userType !== 'MERCHANT' && req.user.merchantId !== merchantId && req.user.userType !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      const appId = typeof req.query.appId === 'string' ? req.query.appId : undefined;
      const result = await WalletService.getAllMerchantWallets(merchantId, appId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          wallets: result.wallets
        }
      });
    } catch (error) {
      logger.error('Error retrieving merchant wallets', { error });
      next(error);
    }
  }

  /**
   * PUT /api/v1/wallets/merchant/:merchantId/balance
   * Update merchant wallet balance (by wallet ID)
   */
  static async updateMerchantWalletBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // For updating balance, we'll use the wallet ID from the request body
      const { walletId, amount, description } = req.body;
      
      // Validate input data
      const { error, value } = validateInput<UpdateWalletBalanceData>(updateWalletBalanceSchema, { amount, description });
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // First get the wallet to check permissions
      const walletResult = await WalletService.getWalletById(walletId);
      if (!walletResult.success || !walletResult.wallet) {
        res.status(404).json({
          success: false,
          error: 'Wallet not found'
        });
        return;
      }

      // Check if user has permission to update this wallet
      if (walletResult.wallet.walletType === 'MERCHANT') {
        const merchantWallet = walletResult.wallet as import('../models/Wallet').MerchantWallet;
        if (req.user.userType !== 'MERCHANT' && req.user.merchantId !== merchantWallet.merchantId) {
          res.status(403).json({
            success: false,
            error: 'Access denied'
          });
          return;
        }
      } else if (walletResult.wallet.walletType === 'USER') {
        const userWallet = walletResult.wallet as import('../models/Wallet').UserWallet;
        if (req.user.userId !== userWallet.userId && req.user.merchantId !== userWallet.merchantId) {
          res.status(403).json({
            success: false,
            error: 'Access denied'
          });
          return;
        }
      }

      const result = await WalletService.updateWalletBalance(walletId, amount, description);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('Merchant wallet balance updated', {
        walletId,
        amount,
        newBalance: result.wallet?.balance
      });

      res.status(200).json({
        success: true,
        message: 'Wallet balance updated successfully',
        data: {
          wallet: result.wallet
        }
      });
    } catch (error) {
      logger.error('Error updating merchant wallet balance', { error });
      next(error);
    }
  }

  /**
   * POST /api/v1/wallets/user
   * Create a new user wallet
   */
  static async createUserWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Validate input data
      const { error, value } = validateInput<CreateUserData>(createUserWalletSchema, req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      const userId = req.user.userId;
      const merchantId = req.user.merchantId;
      const { name, currency } = value!;

      if (!merchantId) {
        res.status(400).json({
          success: false,
          error: 'User must be associated with a merchant'
        });
        return;
      }

      const result = await WalletService.createUserWallet({
        userId,
        merchantId,
        complianceShareholderUserId: req.user.userId,
        name: name || `Personal Wallet`,
        currency: currency || 'NGN'
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('User wallet created successfully', {
        userId,
        merchantId,
        walletId: result.wallet?.id
      });

      res.status(201).json({
        success: true,
        message: 'User wallet created successfully',
        data: {
          wallet: result.wallet
        }
      });
    } catch (error) {
      logger.error('Error creating user wallet', { error });
      next(error);
    }
  }

  /**
   * GET /api/v1/wallets/user/:userId
   * Get user wallet by user ID
   */
  static async getUserWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;

      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Check if user has permission to access this wallet
      if (req.user.userId !== userId && req.user.merchantId !== userId && req.user.userType !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      const result = await WalletService.getUserWallet(userId);

      if (!result.success) {
        res.status(404).json({
          success: false,
          error: result.error
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          wallet: result.wallet
        }
      });
    } catch (error) {
      logger.error('Error retrieving user wallet', { error });
      next(error);
    }
  }

  /**
   * GET /api/v1/wallets/user/:userId/product-type-summary
   * Per product-type totals from PRODUCT wallets (PRIMARY excluded; missing types => 0).
   */
  static async getUserProductTypeSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;

      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const listResult = await WalletService.listUserWallets(userId);
      if (!listResult.success) {
        res.status(400).json({
          success: false,
          error: listResult.error || 'Failed to load user wallets'
        });
        return;
      }

      if (!canAccessUserResource(req, userId, listResult.wallets ?? [])) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      const result = await WalletService.getUserProductTypeSummary(userId, listResult.wallets);

      if (!result.success || !result.summary) {
        res.status(400).json({
          success: false,
          error: result.error || 'Failed to build product type summary'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result.summary
      });
    } catch (error) {
      logger.error('Error retrieving user product type summary', { error });
      next(error);
    }
  }

  /**
   * PUT /api/v1/wallets/user/:userId/balance
   * Update user wallet balance
   */
  static async updateUserWalletBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      
      // Validate input data
      const { error, value } = validateInput<UpdateWalletBalanceData>(updateWalletBalanceSchema, req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      const { amount, description } = value!;

      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Check if user has permission to update this wallet
      if (req.user.userId !== userId && req.user.merchantId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      const userWalletResult = await WalletService.getUserWallet(userId);
      if (!userWalletResult.success || !userWalletResult.wallet) {
        res.status(404).json({
          success: false,
          error: 'User wallet not found'
        });
        return;
      }

      const result = await WalletService.updateWalletBalance(userWalletResult.wallet.id, amount, description);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('User wallet balance updated', {
        userId,
        amount,
        newBalance: result.wallet?.balance
      });

      res.status(200).json({
        success: true,
        message: 'Wallet balance updated successfully',
        data: {
          wallet: result.wallet
        }
      });
    } catch (error) {
      logger.error('Error updating user wallet balance', { error });
      next(error);
    }
  }

  /**
   * GET /api/v1/wallets/merchant/:merchantId/users
   * Get all user wallets associated with a merchant
   */
  static async getUserWalletsByMerchant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { merchantId } = req.params;

      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Check if user has permission to access these wallets
      if (req.user.userType !== 'MERCHANT' && req.user.merchantId !== merchantId && req.user.userType !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      const result = await WalletService.getUserWalletsByMerchant(merchantId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          wallets: result.wallets
        }
      });
    } catch (error) {
      logger.error('Error retrieving user wallets by merchant', { error });
      next(error);
    }
  }

  /**
   * GET /api/v1/wallets/user/:userId/transactions
   * Filter User Wallet transactions by date range and type
   */
  static async filterUserTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const { startDate, endDate, type, limit, skip } = req.query;

      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Check if user has permission to access this wallet
      if (req.user.userId !== userId && req.user.merchantId !== userId && req.user.userType !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      // Validate input data
      const { error } = validateInput<FilterTransactionData>(filterTransactionSchema, {
        startDate,
        endDate,
        type,
        limit,
        skip
      });
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      // Filter transactions
      const filterData = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        type: type as TransactionType,
        limit: limit !== undefined ? Number(limit) : undefined,
        skip: skip !== undefined ? Number(skip) : undefined
      };

      const result = await WalletService.filterUserTransactions(userId, filterData);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('User wallet transactions filtered', {
        userId,
        transactionCount: result.transactions?.length,
        pagination: result.pagination
      });

      res.status(200).json({
        success: true,
        data: {
          transactions: result.transactions,
          pagination: result.pagination
        }
      });
    } catch (error) {
      logger.error('Error filtering user transactions', { error });
      next(error);
    }
  }

  /**
   * POST /api/v1/wallets/user/:userId/transfer
   * Transfer money out from user wallet to another wallet
   */
  static async transferOutFromUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;

      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Check if user has permission to access this wallet
      if (req.user.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied. Only wallet owner can transfer money out.'
        });
        return;
      }

      // Validate input data
      const { error, value } = validateInput<UserTransferOutData>(transferOutSchema, req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      const { toWalletId, amount, description } = value!;

      // Require a valid transaction PIN before moving money out.
      const pinCheck = await TransactionPinService.verifyForTransfer(userId, req.body?.pin);
      if (!pinCheck.ok) {
        res.status(pinCheck.status).json({
          success: false,
          error: pinCheck.message,
          code: pinCheck.code,
          ...(pinCheck.attemptsRemaining !== undefined ? { attemptsRemaining: pinCheck.attemptsRemaining } : {}),
          ...(pinCheck.lockedUntil ? { lockedUntil: pinCheck.lockedUntil } : {})
        });
        return;
      }

      // Perform the transfer
      const result = await WalletService.transferOutFromUser({
        userId,
        toWalletId,
        amount,
        description
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('Money transferred from user wallet', {
        userId,
        toWalletId,
        amount
      });

      res.status(200).json({
        success: true,
        message: 'Money transferred successfully',
        data: {
          fromWallet: result.fromWallet,
          toWallet: result.toWallet,
          transaction: result.transaction
        }
      });
    } catch (error) {
      logger.error('Error transferring money from user wallet', { error });
      next(error);
    }
  }

  /**
   * POST /api/v1/wallets/user/:userId/product-applications/:applicationId/transfer-to-primary
   * Transfer approved loan/product wallet funds into the user's primary wallet.
   */
  static async transferProductApplicationToPrimary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, applicationId } = req.params;

      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      if (req.user.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied. Only wallet owner can transfer product application funds.'
        });
        return;
      }

      const { error, value } = validateInput<ProductApplicationTransferData>(
        productApplicationTransferSchema,
        req.body
      );
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      const { amount, description } = value!;
      const result = await WalletService.transferProductApplicationToPrimary({
        userId,
        applicationId,
        amount,
        description
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('Product application funds transferred to primary wallet', {
        userId,
        applicationId,
        amount,
        loanChargeCollection: result.loanChargeCollection
      });

      res.status(200).json({
        success: true,
        message: 'Product application funds transferred to primary wallet',
        data: {
          fromWallet: result.fromWallet,
          toWallet: result.toWallet,
          transaction: result.transaction,
          loanChargeCollection: result.loanChargeCollection
        }
      });
    } catch (error) {
      logger.error('Error transferring product application funds to primary wallet', { error });
      next(error);
    }
  }

  /**
   * POST /api/v1/wallets/user/:userId/payout
   * Send money from a user's PayOnUs-backed wallet to an external bank account
   */
  static async payoutUserWalletToBank(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;

      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      if (req.user.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied. Only wallet owner can pay out from this wallet.'
        });
        return;
      }

      const { error, value } = validateInput<UserBankPayoutData>(userBankPayoutSchema, req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      // Require a valid transaction PIN before moving money out.
      const pinCheck = await TransactionPinService.verifyForTransfer(userId, req.body?.pin);
      if (!pinCheck.ok) {
        res.status(pinCheck.status).json({
          success: false,
          error: pinCheck.message,
          code: pinCheck.code,
          ...(pinCheck.attemptsRemaining !== undefined ? { attemptsRemaining: pinCheck.attemptsRemaining } : {}),
          ...(pinCheck.lockedUntil ? { lockedUntil: pinCheck.lockedUntil } : {})
        });
        return;
      }

      const result = await WalletService.payoutUserWalletToBank({
        userId,
        savedBankAccountId: value!.savedBankAccountId,
        amount: value!.amount,
        currency: value!.currency,
        narration: value!.narration,
        reference: value!.reference
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error,
          providerReference: result.providerReference,
          providerStatus: result.providerStatus,
          payoutReference: result.payoutReference
        });
        return;
      }

      logger.info('External bank payout initiated from user wallet', {
        userId,
        amount: value!.amount,
        payoutReference: result.payoutReference,
        providerReference: result.providerReference
      });

      res.status(200).json({
        success: true,
        message: 'Payout processed successfully',
        data: {
          wallet: result.wallet,
          transaction: result.transaction,
          payoutReference: result.payoutReference,
          providerReference: result.providerReference,
          providerStatus: result.providerStatus,
          savedBankAccountId: result.savedBankAccountId
        }
      });
    } catch (error) {
      logger.error('Error paying out from user wallet', { error });
      next(error);
    }
  }

  /**
   * GET /api/v1/wallets/user/:userId/external-bank-accounts
   * List saved external bank accounts for payouts from the user's PRIMARY wallet.
   */
  static async listUserExternalBankAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }
      if (req.user.userId !== userId) {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }

      const result = await UserExternalBankAccountService.list(userId);
      if (!result.success) {
        res.status(500).json({ success: false, error: result.error });
        return;
      }

      res.status(200).json({
        success: true,
        data: { accounts: result.accounts ?? [] }
      });
    } catch (error) {
      logger.error('Error listing user external bank accounts', { error });
      next(error);
    }
  }

  /**
   * POST /api/v1/wallets/user/:userId/external-bank-accounts
   * Verify and save an external bank account the user owns (PayOnUs name enquiry).
   */
  static async addUserExternalBankAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }
      if (req.user.userId !== userId) {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }

      const { error, value } = validateInput<AddUserExternalBankAccountData>(addUserExternalBankAccountSchema, req.body);
      if (error) {
        res.status(400).json({ success: false, error: 'Validation failed', details: error });
        return;
      }

      const result = await UserExternalBankAccountService.add({
        userId,
        accountNumber: value!.accountNumber,
        bankName: value!.bankName,
        bankCode: value!.bankCode,
        accountName: value!.accountName,
        label: value!.label,
        currency: value!.currency
      });

      if (!result.success) {
        const status = result.error?.includes('already saved') ? 409 : 422;
        res.status(status).json({ success: false, error: result.error });
        return;
      }

      res.status(201).json({
        success: true,
        message: 'Bank account saved successfully',
        data: { account: result.account }
      });
    } catch (error) {
      logger.error('Error adding user external bank account', { error });
      next(error);
    }
  }

  /**
   * DELETE /api/v1/wallets/user/:userId/external-bank-accounts/:accountId
   */
  static async removeUserExternalBankAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, accountId } = req.params;
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }
      if (req.user.userId !== userId) {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }

      const result = await UserExternalBankAccountService.remove(userId, accountId);
      if (!result.success) {
        res.status(404).json({ success: false, error: result.error });
        return;
      }

      res.status(200).json({ success: true, message: 'Bank account removed' });
    } catch (error) {
      logger.error('Error removing user external bank account', { error });
      next(error);
    }
  }

  /**
   * PATCH /api/v1/wallets/user/:userId/external-bank-accounts/:accountId/default
   */
  static async setDefaultUserExternalBankAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, accountId } = req.params;
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }
      if (req.user.userId !== userId) {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }

      const result = await UserExternalBankAccountService.setDefault(userId, accountId);
      if (!result.success) {
        res.status(404).json({ success: false, error: result.error });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Default bank account updated',
        data: { account: result.account }
      });
    } catch (error) {
      logger.error('Error setting default user external bank account', { error });
      next(error);
    }
  }

  /**
   * GET /api/v1/wallets/banks
   * Return the list of banks PayOnUs supports for payouts (for a bank picker).
   * Optional query: ?key=ZAR for the EFT bank list, ?refresh=true to bypass cache.
   */
  static async getBanks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const key = typeof req.query.key === 'string' ? req.query.key : undefined;
      const forceRefresh = req.query.refresh === 'true' || req.query.refresh === '1';

      const result = await WalletService.listBanks({ key, forceRefresh });
      if (!result.success) {
        res.status(502).json({
          success: false,
          error: result.error || 'Failed to fetch bank list'
        });
        return;
      }

      res.status(200).json({
        success: true,
        cached: result.cached ?? false,
        count: result.banks.length,
        data: result.banks
      });
    } catch (error) {
      logger.error('Error fetching bank list', { error });
      next(error);
    }
  }

  /**
   * POST /api/v1/wallets/banks/name-enquiry
   * Verify a beneficiary bank account and return the bank-confirmed account name,
   * so the frontend can confirm the recipient before initiating a payout.
   */
  static async verifyBankAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = validateInput<{ accountNumber: string; bankCode: string; currency?: string }>(
        bankNameEnquirySchema,
        req.body
      );
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      const result = await WalletService.verifyBankAccount({
        accountNumber: value!.accountNumber,
        bankCode: value!.bankCode,
        currency: value!.currency
      });

      if (!result.success) {
        res.status(422).json({
          success: false,
          error: result.error || 'Bank account verification failed'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          accountName: result.accountName,
          accountNumber: result.accountNumber,
          bankCode: result.bankCode,
          bankName: result.bankName
        }
      });
    } catch (error) {
      logger.error('Error verifying bank account', { error });
      next(error);
    }
  }

  /**
   * GET /api/v1/wallets/repayment/:merchantId/transactions
   * Filter Repayment Wallet transactions by date range and type
   */
  static async filterRepaymentTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { merchantId } = req.params;
      const { startDate, endDate, type, appId, limit, skip } = req.query;

      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Check if user has permission to access this wallet
      if (req.user.userType !== 'MERCHANT' && req.user.merchantId !== merchantId) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      // Validate input data
      const { error } = validateInput<FilterTransactionData>(filterTransactionSchema, {
        startDate,
        endDate,
        type,
        limit,
        skip
      });
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      // Get Repayment Wallet for the merchant (formerly "Settlement")
      const repaymentResult = await WalletService.getRepaymentWallet(
        merchantId,
        typeof appId === 'string' ? appId : undefined
      );
      if (!repaymentResult.success || !repaymentResult.wallet) {
        res.status(404).json({
          success: false,
          error: 'Repayment wallet not found'
        });
        return;
      }

      // Filter transactions
      const filterData = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        type: type as TransactionType,
        limit: limit !== undefined ? Number(limit) : undefined,
        skip: skip !== undefined ? Number(skip) : undefined
      };

      const result = await WalletService.filterWalletTransactions(repaymentResult.wallet.id, filterData);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('Repayment wallet transactions filtered', {
        merchantId,
        appId,
        transactionCount: result.transactions?.length,
        pagination: result.pagination
      });

      res.status(200).json({
        success: true,
        data: {
          transactions: result.transactions,
          pagination: result.pagination
        }
      });
    } catch (error) {
      logger.error('Error filtering repayment transactions', { error });
      next(error);
    }
  }

  /** @deprecated use filterRepaymentTransactions */
  static async filterSettlementTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    return this.filterRepaymentTransactions(req, res, next);
  }

  /**
   * POST /api/v1/wallets/repayment/transfer
   * Transfer money out from Repayment Wallet to another wallet
   */
  static async transferOutFromRepayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const merchantId = req.user.merchantId || req.user.userId;
      const appId = typeof req.query.appId === 'string' ? req.query.appId : undefined;

      // Validate input data
      const { error, value } = validateInput<TransferOutData>(transferOutSchema, req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      const { fromWalletId, toWalletId, amount, description } = value!;

      // Verify that the fromWallet is the Repayment Wallet of this merchant (formerly "Settlement")
      const repaymentResult = await WalletService.getRepaymentWallet(merchantId);
      if (!repaymentResult.success || !repaymentResult.wallet) {
        res.status(404).json({
          success: false,
          error: 'Repayment wallet not found'
        });
        return;
      }

      if (repaymentResult.wallet.id !== fromWalletId) {
        res.status(403).json({
          success: false,
          error: 'You can only transfer from your Repayment Wallet'
        });
        return;
      }

      // Perform the transfer
      const result = await WalletService.transferOut({
        fromWalletId,
        toWalletId,
        amount,
        description
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('Money transferred from Repayment Wallet', {
        merchantId,
        fromWalletId,
        toWalletId,
        amount
      });

      res.status(200).json({
        success: true,
        message: 'Money transferred successfully',
        data: {
          fromWallet: result.fromWallet,
          toWallet: result.toWallet,
          transaction: result.transaction
        }
      });
    } catch (error) {
      logger.error('Error transferring money from Repayment Wallet', { error });
      next(error);
    }
  }

  /** @deprecated use transferOutFromRepayment */
  static async transferOutFromSettlement(req: Request, res: Response, next: NextFunction): Promise<void> {
    return this.transferOutFromRepayment(req, res, next);
  }

  /**
   * POST /api/v1/wallets/operation-to-kyc
   * Transfer money from Operation Wallet to KYC Wallet
   */
  static async transferFromBillingToKyc(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const merchantId = req.user.merchantId || req.user.userId;
      const appId = typeof req.query.appId === 'string' ? req.query.appId : undefined;

      // Validate input data
      const { error, value } = validateInput<BillingToKycTransferData>(billingToKycTransferSchema, req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      const { amount, description } = value!;

      // Perform the transfer
      const result = await WalletService.transferFromBillingToKyc({
        merchantId,
        appId,
        amount,
        description
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('Money transferred from Billing to KYC Wallet', {
        merchantId,
        amount
      });

      res.status(200).json({
        success: true,
        message: 'Money transferred successfully from Billing to KYC Wallet',
        data: {
          fromWallet: result.fromWallet,
          toWallet: result.toWallet,
          transaction: result.transaction
        }
      });
    } catch (error) {
      logger.error('Error transferring money from Billing to KYC Wallet', { error });
      next(error);
    }
  }

  /**
   * POST /api/v1/wallets/kyc-to-operation
   * Transfer money from KYC Wallet to Operation Wallet
   */
  static async transferFromKycToBilling(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const merchantId = req.user.merchantId || req.user.userId;
      const appId = typeof req.query.appId === 'string' ? req.query.appId : undefined;

      // Validate input data
      const { error, value } = validateInput<KycToBillingTransferData>(kycToBillingTransferSchema, req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      const { amount, description } = value!;

      // Perform the transfer
      const result = await WalletService.transferFromKycToBilling({
        merchantId,
        appId,
        amount,
        description
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('Money transferred from KYC to Billing Wallet', {
        merchantId,
        amount
      });

      res.status(200).json({
        success: true,
        message: 'Money transferred successfully from KYC to Billing Wallet',
        data: {
          fromWallet: result.fromWallet,
          toWallet: result.toWallet,
          transaction: result.transaction
        }
      });
    } catch (error) {
      logger.error('Error transferring money from KYC to Billing Wallet', { error });
      next(error);
    }
  }

  /**
   * GET /api/v1/wallets/operation/:merchantId/transactions
   * Filter Operation Wallet transactions by date range and type
   */
  static async filterBillingTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { merchantId } = req.params;
      const { startDate, endDate, type, appId, limit, skip } = req.query;

      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Check if user has permission to access this wallet
      if (req.user.userType !== 'MERCHANT' && req.user.merchantId !== merchantId) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      // Validate input data
      const { error } = validateInput<FilterTransactionData>(filterTransactionSchema, {
        startDate,
        endDate,
        type,
        limit,
        skip
      });
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      // Filter transactions
      const filterData = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        type: type as TransactionType,
        limit: limit !== undefined ? Number(limit) : undefined,
        skip: skip !== undefined ? Number(skip) : undefined
      };

      const result = await WalletService.filterBillingTransactions(
        merchantId,
        filterData,
        typeof appId === 'string' ? appId : undefined
      );

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('Billing wallet transactions filtered', {
        merchantId,
        appId,
        transactionCount: result.transactions?.length,
        pagination: result.pagination
      });

      res.status(200).json({
        success: true,
        data: {
          transactions: result.transactions,
          pagination: result.pagination
        }
      });
    } catch (error) {
      logger.error('Error filtering operation transactions', { error });
      next(error);
    }
  }

  /**
   * GET /api/v1/wallets/kyc/:merchantId/transactions
   * Filter KYC Wallet transactions by date range and type
   */
  static async filterKycTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { merchantId } = req.params;
      const { startDate, endDate, type, appId, limit, skip } = req.query;

      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Check if user has permission to access this wallet
      if (req.user.userType !== 'MERCHANT' && req.user.merchantId !== merchantId) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      // Validate input data
      const { error } = validateInput<FilterTransactionData>(filterTransactionSchema, {
        startDate,
        endDate,
        type,
        limit,
        skip
      });
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      // Filter transactions
      const filterData = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        type: type as TransactionType,
        limit: limit !== undefined ? Number(limit) : undefined,
        skip: skip !== undefined ? Number(skip) : undefined
      };

      const result = await WalletService.filterKycTransactions(
        merchantId,
        filterData,
        typeof appId === 'string' ? appId : undefined
      );

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('KYC wallet transactions filtered', {
        merchantId,
        appId,
        transactionCount: result.transactions?.length,
        pagination: result.pagination
      });

      res.status(200).json({
        success: true,
        data: {
          transactions: result.transactions,
          pagination: result.pagination
        }
      });
    } catch (error) {
      logger.error('Error filtering kyc transactions', { error });
      next(error);
    }
  }

  /**
   * POST /api/v1/wallets/operation/debit
   * Debit the merchant's own Operation Wallet (used for billing)
   */
  static async debitBillingWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const merchantId = req.user.merchantId || req.user.userId;
      const appId = typeof req.query.appId === 'string' ? req.query.appId : undefined;

      // Validate input data
      const { error, value } = validateInput<BillingDebitData>(debitMerchantWalletSchema, req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      const { amount, description } = value!;

      // Perform the debit on the Billing Wallet
      const result = await WalletService.debitBillingWallet({
        merchantId,
        appId,
        amount,
        description
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('Billing wallet debited by merchant', {
        merchantId,
        amount
      });

      res.status(200).json({
        success: true,
        message: 'Billing wallet debited successfully',
        data: {
          wallet: result.wallet,
          transaction: result.transaction
        }
      });
    } catch (error) {
      logger.error('Error debiting Billing wallet', { error });
      next(error);
    }
  }

  /**
   * POST /api/v1/wallets/kyc/debit
   * Debit the merchant's own KYC Wallet (used for billing)
   */
  static async debitKycWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const merchantId = req.user.merchantId || req.user.userId;
      const appId = typeof req.query.appId === 'string' ? req.query.appId : undefined;

      // Validate input data
      const { error, value } = validateInput<KycDebitData>(debitMerchantWalletSchema, req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      const { amount, description } = value!;

      // Perform the debit on the KYC Wallet
      const result = await WalletService.debitKycWallet({
        merchantId,
        appId,
        amount,
        description
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('KYC wallet debited by merchant', {
        merchantId,
        amount
      });

      res.status(200).json({
        success: true,
        message: 'KYC wallet debited successfully',
        data: {
          wallet: result.wallet,
          transaction: result.transaction
        }
      });
    } catch (error) {
      logger.error('Error debiting KYC wallet', { error });
      next(error);
    }
  }

  /**
   * POST /api/v1/wallets/kyc/fee
   * Process KYC fee by debiting the merchant's KYC wallet
   */
  static async processKycFee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const merchantId = req.user.merchantId || req.user.userId;
      const appId = typeof req.query.appId === 'string' ? req.query.appId : undefined;

      // Validate input data
      const { error, value } = validateInput<KycFeeData>(debitMerchantWalletSchema, req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      const { amount, description } = value!;

      // Process the KYC fee
      const result = await WalletService.processKycFee(
        merchantId,
        amount,
        description || 'KYC Fee'
      );

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('KYC fee processed for merchant', {
        merchantId,
        amount
      });

      res.status(200).json({
        success: true,
        message: 'KYC fee processed successfully',
        data: {
          wallet: result.wallet,
          transaction: result.transaction
        }
      });
    } catch (error) {
      logger.error('Error processing KYC fee', { error });
      next(error);
    }
  }

  /**
   * POST /api/v1/wallets/repayment/debit
   * Debit a user wallet (used for billing)
   */
  static async debitUserWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const merchantId = req.user.merchantId || req.user.userId;

      // Validate input data
      const { error, value } = validateInput<DebitWalletData>(debitWalletSchema, req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      const { userId, amount, description } = value!;

      // Verify that the user belongs to this merchant
      const userResult = await WalletService.getUserWallet(userId);
      if (!userResult.success || !userResult.wallet) {
        res.status(404).json({
          success: false,
          error: 'User wallet not found'
        });
        return;
      }

      if (userResult.wallet.merchantId !== merchantId) {
        res.status(403).json({
          success: false,
          error: 'You can only debit wallets of your own users'
        });
        return;
      }

      // Perform the debit
      const result = await WalletService.debitUserWallet({
        userId,
        amount,
        description
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('User wallet debited by merchant', {
        merchantId,
        userId,
        amount
      });

      res.status(200).json({
        success: true,
        message: 'User wallet debited successfully',
        data: {
          wallet: result.wallet,
          transaction: result.transaction
        }
      });
    } catch (error) {
      logger.error('Error debiting user wallet', { error });
      next(error);
    }
  }

  /**
   * POST /api/v1/wallets/repayment/debit-merchant
   * Debit the merchant's own Repayment Wallet
   */
  static async debitRepaymentWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const merchantId = req.user.merchantId || req.user.userId;
      const appId = typeof req.query.appId === 'string' ? req.query.appId : undefined;

      // Validate input data
      const { error, value } = validateInput<DebitRepaymentData>(debitMerchantWalletSchema, req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      const { amount, description } = value!;

      // Verify that the merchantId in the request matches the authenticated merchant
      if (value!.merchantId !== merchantId) {
        res.status(403).json({
          success: false,
          error: 'You can only debit your own Repayment Wallet'
        });
        return;
      }

      // Perform the debit on the Repayment Wallet (formerly "Settlement")
      const result = await WalletService.debitRepaymentWallet({
        merchantId,
        appId,
        amount,
        description
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('Repayment wallet debited by merchant', {
        merchantId,
        amount
      });

      res.status(200).json({
        success: true,
        message: 'Repayment wallet debited successfully',
        data: {
          wallet: result.wallet,
          transaction: result.transaction
        }
      });
    } catch (error) {
      logger.error('Error debiting Repayment wallet', { error });
      next(error);
    }
  }

  /** @deprecated use debitRepaymentWallet */
  static async debitSettlementWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
    return this.debitRepaymentWallet(req, res, next);
  }

  /**
   * POST /api/v1/wallets/user/:userId/api-call
   * Make a 3rd party API call from user wallet
   */
  static async makeUserApiCall(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;

      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Check if user has permission to access this wallet
      if (req.user.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied. Only wallet owner can make API calls.'
        });
        return;
      }

      // Validate input data
      const { error, value } = validateInput<UserApiCallData>(userApiCallSchema, req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      const { endpoint, method, headers, body, amount, description, apiKey } = value!;

      // Perform the API call
      const result = await WalletService.makeUserApiCall({
        userId,
        endpoint,
        method: method || 'POST',
        headers: headers || {},
        body: body || {},
        amount,
        description,
        apiKey
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('API call made from user wallet', {
        userId,
        endpoint,
        amount
      });

      res.status(200).json({
        success: true,
        message: 'API call completed successfully',
        data: {
          wallet: result.wallet,
          transaction: result.transaction,
          apiResponse: result.apiResponse
        }
      });
    } catch (error) {
      logger.error('Error making API call from user wallet', { error });
      next(error);
    }
  }

  /**
   * POST /api/v1/wallets/repayment/payout
   * Payout from Repayment wallet (formerly "Settlement") to an external bank account via PayOnUs.
   */
  static async payoutRepaymentWalletToBank(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const merchantId = req.user.merchantId || req.user.userId;
      const { error, value } = validateInput<SettlementBankPayoutData>(settlementBankPayoutSchema, req.body);
      if (error) {
        res.status(400).json({ success: false, error: 'Validation failed', details: error });
        return;
      }

      const result = await WalletService.payoutRepaymentWalletToBank({
        merchantId,
        appId: value!.appId,
        accountNumber: value!.accountNumber,
        bankCode: value!.bankCode,
        accountName: value!.accountName,
        bankName: value!.bankName,
        amount: value!.amount,
        currency: value!.currency,
        narration: value!.narration,
        reference: value!.reference
      });

      if (!result.success || !result.wallet) {
        res.status(400).json({ success: false, error: result.error || 'Repayment payout failed' });
        return;
      }

      res.status(result.duplicate ? 200 : 201).json({
        success: true,
        duplicate: result.duplicate === true,
        message: result.duplicate ? 'Repayment payout already processed' : 'Repayment payout initiated',
        data: {
          wallet: result.wallet,
          transaction: result.transaction,
          payoutReference: result.payoutReference,
          providerReference: result.providerReference,
          providerStatus: result.providerStatus
        }
      });
    } catch (error) {
      logger.error('Error paying out repayment wallet to bank', { error });
      next(error);
    }
  }

  /** @deprecated use payoutRepaymentWalletToBank */
  static async payoutSettlementWalletToBank(req: Request, res: Response, next: NextFunction): Promise<void> {
    return this.payoutRepaymentWalletToBank(req, res, next);
  }

}