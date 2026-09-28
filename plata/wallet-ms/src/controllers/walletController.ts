import { Request, Response, NextFunction } from 'express';
import { WalletService } from '../services';
import { logger } from '../utils/logger';
import { validateInput, createMerchantWalletSchema, createUserWalletSchema, updateWalletBalanceSchema, filterTransactionSchema, transferOutSchema, debitWalletSchema, debitTreasurySchema, billingToRepaymentTransferSchema, repaymentToBillingTransferSchema, userApiCallSchema, repaymentBankPayoutSchema } from '../utils/validation';
import { MerchantWalletType, TransactionType } from '../models/Wallet';
import { normalizeMerchantWalletType } from '../utils/merchantWalletType';
import { requestAmountToKobo } from '../utils/money';
import { walletForApi, walletsForApi, transactionForApi, transactionsForApi } from '../utils/walletApiMoney';

// Define interfaces for the validated data
interface CreateMerchantWalletData {
  name: string;
  currency: string;
  merchantWalletType: MerchantWalletType;
  appId?: string;
  appName?: string;
  payonusSubaccountCode?: string;
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

function parseAppIdQuery(req: Request): string | undefined {
  const appId = req.query.appId;
  return typeof appId === 'string' && appId.trim() ? appId.trim() : undefined;
}

function parseMerchantTransactionFilters(req: Request): {
  appId?: string;
  filterData: {
    startDate?: Date;
    endDate?: Date;
    type?: TransactionType;
    limit?: number;
    skip?: number;
  };
} {
  const { startDate, endDate, type, limit, skip } = req.query;
  return {
    appId: parseAppIdQuery(req),
    filterData: {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      type: type as TransactionType,
      limit: limit !== undefined ? Number(limit) : undefined,
      skip: skip !== undefined ? Number(skip) : undefined
    }
  };
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

interface DebitTreasuryData {
  merchantId: string;
  amount: number;
  description: string;
}

interface BillingToRepaymentTransferData {
  amount: number;
  description: string;
}

interface RepaymentToBillingTransferData {
  amount: number;
  description: string;
}

interface OperationDebitData {
  amount: number;
  description: string;
}

interface RepaymentDebitData {
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

interface RepaymentBankPayoutData {
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


function parseAmountOrFail(
  res: Response,
  amount: unknown,
  amountUnit?: unknown
): number | null {
  const parsed = requestAmountToKobo(amount, amountUnit);
  if (!parsed.ok) {
    res.status(400).json({ success: false, error: parsed.error });
    return null;
  }
  return parsed.kobo;
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
      const { name, currency, merchantWalletType, appId, appName, payonusSubaccountCode } = value!;
      const normalizedWalletType = normalizeMerchantWalletType(merchantWalletType);
      if (!normalizedWalletType) {
        res.status(400).json({
          success: false,
          error: 'Invalid merchant wallet type'
        });
        return;
      }

      const result = await WalletService.createMerchantWallet({
        merchantId,
        complianceShareholderUserId: req.user.userId,
        appId,
        appName,
        payonusSubaccountCode,
        name: name || `${normalizedWalletType} Wallet`,
        currency: currency || 'USD',
        merchantWalletType: normalizedWalletType
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
        walletType: normalizedWalletType
      });

      res.status(201).json({
        success: true,
        message: 'Merchant wallet created successfully',
        data: {
          wallet: result.wallet ? walletForApi(result.wallet) : result.wallet
        }
      });
    } catch (error) {
      logger.error('Error creating merchant wallet', { error });
      next(error);
    }
  }

  /**
   * POST /api/v1/wallets/merchant/all
   * Create all required merchant wallets (Billing, Treasury, Settlement)
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
      const { currency, appId, appName, payonusSubaccountCode } = req.body;

      const result = await WalletService.createAllMerchantWallets(
        merchantId,
        currency || 'USD',
        false,
        appId,
        appName,
        payonusSubaccountCode,
        req.user.userId
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
          wallets: result.wallets ? walletsForApi(result.wallets) : result.wallets
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

      const normalizedWalletType = normalizeMerchantWalletType(walletType);
      if (!normalizedWalletType) {
        res.status(400).json({
          success: false,
          error: 'Invalid merchant wallet type'
        });
        return;
      }

      const result = await WalletService.getMerchantWalletByType(merchantId, normalizedWalletType, appId);

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
          wallet: result.wallet ? walletForApi(result.wallet) : result.wallet
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
      const appId = typeof req.query.appId === 'string' ? req.query.appId : undefined;

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
          wallets: result.wallets ? walletsForApi(result.wallets) : result.wallets
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

      const amountKobo = parseAmountOrFail(res, amount, (req.body as { amountUnit?: string }).amountUnit);
      if (amountKobo === null) return;

      const result = await WalletService.updateWalletBalance(walletId, amountKobo, description);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('Merchant wallet balance updated', {
        walletId,
        amount: amountKobo,
        newBalance: result.wallet?.balance
      });

      res.status(200).json({
        success: true,
        message: 'Wallet balance updated successfully',
        data: {
          wallet: result.wallet ? walletForApi(result.wallet) : result.wallet
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
        complianceShareholderUserId: userId,
        name: name || `Personal Wallet`,
        currency: currency || 'USD'
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
          wallet: result.wallet ? walletForApi(result.wallet) : result.wallet
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

      if (!req.user && !req.gatewayMerchant) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const result = await WalletService.getUserWallet(userId);

      if (!result.success || !result.wallet) {
        res.status(404).json({
          success: false,
          error: result.error || 'User wallet not found'
        });
        return;
      }

      const walletMerchantId = String(result.wallet.merchantId || '').trim();
      if (req.gatewayMerchant) {
        if (walletMerchantId !== req.gatewayMerchant.merchantId) {
          res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'User wallet does not belong to your merchant'
          });
          return;
        }
      } else if (req.user) {
        const callerMerchantId = String(req.user.merchantId || req.user.userMerchantId || '').trim();
        const allowed =
          req.user.userType === 'ADMIN' ||
          req.user.userId === userId ||
          callerMerchantId === userId ||
          (Boolean(callerMerchantId) && callerMerchantId === walletMerchantId);
        if (!allowed) {
          res.status(403).json({
            success: false,
            error: 'Access denied'
          });
          return;
        }
      }

      res.status(200).json({
        success: true,
        data: {
          wallet: walletForApi(result.wallet)
        }
      });
    } catch (error) {
      logger.error('Error retrieving user wallet', { error });
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

      const amountKobo = parseAmountOrFail(res, amount, (req.body as { amountUnit?: string }).amountUnit);
      if (amountKobo === null) return;

      const result = await WalletService.updateWalletBalance(userId, amountKobo, description);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('User wallet balance updated', {
        userId,
        amount: amountKobo,
        newBalance: result.wallet?.balance
      });

      res.status(200).json({
        success: true,
        message: 'Wallet balance updated successfully',
        data: {
          wallet: result.wallet ? walletForApi(result.wallet) : result.wallet
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

      const { limit, skip } = req.query;
      const { error, value } = validateInput<FilterTransactionData>(filterTransactionSchema, {
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

      const result = await WalletService.getUserWalletsByMerchant(merchantId, {
        limit: value?.limit !== undefined ? Number(value.limit) : undefined,
        skip: value?.skip !== undefined ? Number(value.skip) : undefined
      });

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
          wallets: result.wallets ? walletsForApi(result.wallets) : result.wallets,
          pagination: result.pagination
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

      if (!req.user && !req.gatewayMerchant) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const ownership = await WalletService.getUserWallet(userId);
      if (!ownership.success || !ownership.wallet) {
        res.status(404).json({
          success: false,
          error: ownership.error || 'User wallet not found'
        });
        return;
      }

      const walletMerchantId = String(ownership.wallet.merchantId || '').trim();
      if (req.gatewayMerchant) {
        if (walletMerchantId !== req.gatewayMerchant.merchantId) {
          res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'User wallet does not belong to your merchant'
          });
          return;
        }
      } else if (req.user) {
        const callerMerchantId = String(req.user.merchantId || req.user.userMerchantId || '').trim();
        const allowed =
          req.user.userType === 'ADMIN' ||
          req.user.userId === userId ||
          callerMerchantId === userId ||
          (Boolean(callerMerchantId) && callerMerchantId === walletMerchantId);
        if (!allowed) {
          res.status(403).json({
            success: false,
            error: 'Access denied'
          });
          return;
        }
      }

      // Validate input data
      const { error } = validateInput<FilterTransactionData>(filterTransactionSchema, { startDate, endDate, type, limit, skip });
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
          transactions: result.transactions ? transactionsForApi(result.transactions) : result.transactions,
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
      const amountKobo = parseAmountOrFail(res, amount, (req.body as { amountUnit?: string }).amountUnit);
      if (amountKobo === null) return;

      // Perform the transfer
      const result = await WalletService.transferOutFromUser({
        userId,
        toWalletId,
        amount: amountKobo,
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
          fromWallet: result.fromWallet ? walletForApi(result.fromWallet) : result.fromWallet,
          toWallet: result.toWallet ? walletForApi(result.toWallet) : result.toWallet,
          transaction: result.transaction ? transactionForApi(result.transaction) : result.transaction
        }
      });
    } catch (error) {
      logger.error('Error transferring money from user wallet', { error });
      next(error);
    }
  }

  /**
   * GET /api/v1/wallets/treasury/:merchantId/transactions
   * Filter Treasury Wallet transactions by date range and type
   */
  static async filterTreasuryTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { merchantId } = req.params;
      const { startDate, endDate, type, limit, skip } = req.query;

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
      const { error } = validateInput<FilterTransactionData>(filterTransactionSchema, { startDate, endDate, type, limit, skip });
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      const { appId, filterData } = parseMerchantTransactionFilters(req);

      const result = await WalletService.filterTreasuryTransactions(merchantId, filterData, appId);

      if (!result.success) {
        res.status(result.error?.includes('pass appId') ? 400 : 404).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('Treasury wallet transactions filtered', {
        merchantId,
        appId,
        transactionCount: result.transactions?.length,
        pagination: result.pagination
      });

      res.status(200).json({
        success: true,
        data: {
          transactions: result.transactions ? transactionsForApi(result.transactions) : result.transactions,
          pagination: result.pagination
        }
      });
    } catch (error) {
      logger.error('Error filtering treasury transactions', { error });
      next(error);
    }
  }

  /**
   * POST /api/v1/wallets/treasury/transfer
   * Transfer money out from Treasury Wallet to another wallet
   */
  static async transferOutFromTreasury(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      const amountKobo = parseAmountOrFail(res, amount, (req.body as { amountUnit?: string }).amountUnit);
      if (amountKobo === null) return;

      // Verify that the fromWallet is the Treasury Wallet of this merchant
      const treasuryResult = await WalletService.getTreasuryWallet(merchantId);
      if (!treasuryResult.success || !treasuryResult.wallet) {
        res.status(404).json({
          success: false,
          error: 'Treasury wallet not found'
        });
        return;
      }

      if (treasuryResult.wallet.id !== fromWalletId) {
        res.status(403).json({
          success: false,
          error: 'You can only transfer from your Treasury Wallet'
        });
        return;
      }

      // Perform the transfer
      const result = await WalletService.transferOut({
        fromWalletId,
        toWalletId,
        amount: amountKobo,
        description
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('Money transferred from Treasury Wallet', {
        merchantId,
        fromWalletId,
        toWalletId,
        amount
      });

      res.status(200).json({
        success: true,
        message: 'Money transferred successfully',
        data: {
          fromWallet: result.fromWallet ? walletForApi(result.fromWallet) : result.fromWallet,
          toWallet: result.toWallet ? walletForApi(result.toWallet) : result.toWallet,
          transaction: result.transaction ? transactionForApi(result.transaction) : result.transaction
        }
      });
    } catch (error) {
      logger.error('Error transferring money from Treasury Wallet', { error });
      next(error);
    }
  }

  /**
   * POST /api/v1/wallets/billing-to-repayment
   * Transfer money from Billing Wallet to Repayment Wallet
   */
  static async transferFromBillingToRepayment(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      const { error, value } = validateInput<BillingToRepaymentTransferData>(billingToRepaymentTransferSchema, req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      const { amount, description } = value!;
      const amountKobo = parseAmountOrFail(res, amount, (req.body as { amountUnit?: string }).amountUnit);
      if (amountKobo === null) return;

      // Perform the transfer
      const result = await WalletService.transferFromBillingToRepayment({
        merchantId,
        amount: amountKobo,
        description
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('Money transferred from Billing to Repayment Wallet', {
        merchantId,
        amount
      });

      res.status(200).json({
        success: true,
        message: 'Money transferred successfully from Billing to Repayment Wallet',
        data: {
          fromWallet: result.fromWallet ? walletForApi(result.fromWallet) : result.fromWallet,
          toWallet: result.toWallet ? walletForApi(result.toWallet) : result.toWallet,
          transaction: result.transaction ? transactionForApi(result.transaction) : result.transaction
        }
      });
    } catch (error) {
      logger.error('Error transferring money from Billing to Repayment Wallet', { error });
      next(error);
    }
  }

  /** @deprecated Use transferFromBillingToRepayment */
  static async transferFromOperationToKyc(req: Request, res: Response, next: NextFunction): Promise<void> {
    return WalletController.transferFromBillingToRepayment(req, res, next);
  }

  /**
   * POST /api/v1/wallets/repayment-to-billing
   * Transfer money from Repayment Wallet to Billing Wallet
   */
  static async transferFromRepaymentToBilling(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      const { error, value } = validateInput<RepaymentToBillingTransferData>(repaymentToBillingTransferSchema, req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      const { amount, description } = value!;
      const amountKobo = parseAmountOrFail(res, amount, (req.body as { amountUnit?: string }).amountUnit);
      if (amountKobo === null) return;

      // Perform the transfer
      const result = await WalletService.transferFromRepaymentToBilling({
        merchantId,
        amount: amountKobo,
        description
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('Money transferred from Repayment to Billing Wallet', {
        merchantId,
        amount
      });

      res.status(200).json({
        success: true,
        message: 'Money transferred successfully from Repayment to Billing Wallet',
        data: {
          fromWallet: result.fromWallet ? walletForApi(result.fromWallet) : result.fromWallet,
          toWallet: result.toWallet ? walletForApi(result.toWallet) : result.toWallet,
          transaction: result.transaction ? transactionForApi(result.transaction) : result.transaction
        }
      });
    } catch (error) {
      logger.error('Error transferring money from Repayment to Billing Wallet', { error });
      next(error);
    }
  }

  /** @deprecated Use transferFromRepaymentToBilling */
  static async transferFromKycToOperation(req: Request, res: Response, next: NextFunction): Promise<void> {
    return WalletController.transferFromRepaymentToBilling(req, res, next);
  }

  /**
   * GET /api/v1/wallets/operation/:merchantId/transactions
   * Filter Operation Wallet transactions by date range and type
   */
  static async filterOperationTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { merchantId } = req.params;
      const { startDate, endDate, type, limit, skip } = req.query;

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
      const { error } = validateInput<FilterTransactionData>(filterTransactionSchema, { startDate, endDate, type, limit, skip });
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      const { appId, filterData } = parseMerchantTransactionFilters(req);

      const result = await WalletService.filterOperationTransactions(merchantId, filterData, appId);

      if (!result.success) {
        res.status(result.error?.includes('pass appId') ? 400 : 404).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('Operation wallet transactions filtered', {
        merchantId,
        appId,
        transactionCount: result.transactions?.length,
        pagination: result.pagination
      });

      res.status(200).json({
        success: true,
        data: {
          transactions: result.transactions ? transactionsForApi(result.transactions) : result.transactions,
          pagination: result.pagination
        }
      });
    } catch (error) {
      logger.error('Error filtering operation transactions', { error });
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
      const { startDate, endDate, type, limit, skip } = req.query;

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
      const { error } = validateInput<FilterTransactionData>(filterTransactionSchema, { startDate, endDate, type, limit, skip });
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      const { appId, filterData } = parseMerchantTransactionFilters(req);

      const result = await WalletService.filterRepaymentTransactions(merchantId, filterData, appId);

      if (!result.success) {
        res.status(result.error?.includes('pass appId') ? 400 : 404).json({
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
          transactions: result.transactions ? transactionsForApi(result.transactions) : result.transactions,
          pagination: result.pagination
        }
      });
    } catch (error) {
      logger.error('Error filtering repayment transactions', { error });
      next(error);
    }
  }

  /** @deprecated Use filterRepaymentTransactions */
  static async filterKycTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    return WalletController.filterRepaymentTransactions(req, res, next);
  }

  /**
   * POST /api/v1/wallets/operation/debit
   * Debit the merchant's own Operation Wallet (used for billing)
   */
  static async debitOperationWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      const { error, value } = validateInput<OperationDebitData>(debitTreasurySchema, req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      const { amount, description } = value!;
      const amountKobo = parseAmountOrFail(res, amount, (req.body as { amountUnit?: string }).amountUnit);
      if (amountKobo === null) return;

      // Perform the debit on the Operation Wallet
      const result = await WalletService.debitOperationWallet({
        merchantId,
        amount: amountKobo,
        description
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('Operation wallet debited by merchant', {
        merchantId,
        amount
      });

      res.status(200).json({
        success: true,
        message: 'Operation wallet debited successfully',
        data: {
          wallet: result.wallet ? walletForApi(result.wallet) : result.wallet,
          transaction: result.transaction ? transactionForApi(result.transaction) : result.transaction
        }
      });
    } catch (error) {
      logger.error('Error debiting Operation wallet', { error });
      next(error);
    }
  }

  /**
   * POST /api/v1/wallets/repayment/debit
   * Debit the merchant's own Repayment Wallet (used for billing)
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

      // Validate input data
      const { error, value } = validateInput<RepaymentDebitData>(debitTreasurySchema, req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      const { amount, description } = value!;
      const amountKobo = parseAmountOrFail(res, amount, (req.body as { amountUnit?: string }).amountUnit);
      if (amountKobo === null) return;

      // Perform the debit on the Repayment Wallet
      const result = await WalletService.debitRepaymentWallet({
        merchantId,
        amount: amountKobo,
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
          wallet: result.wallet ? walletForApi(result.wallet) : result.wallet,
          transaction: result.transaction ? transactionForApi(result.transaction) : result.transaction
        }
      });
    } catch (error) {
      logger.error('Error debiting Repayment wallet', { error });
      next(error);
    }
  }

  /** @deprecated Use debitRepaymentWallet */
  static async debitKycWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
    return WalletController.debitRepaymentWallet(req, res, next);
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

      // Validate input data
      const { error, value } = validateInput<KycFeeData>(debitTreasurySchema, req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      const { amount, description } = value!;
      const amountKobo = parseAmountOrFail(res, amount, (req.body as { amountUnit?: string }).amountUnit);
      if (amountKobo === null) return;

      // Process the KYC fee
      const result = await WalletService.processKycFee(
        merchantId,
        amountKobo,
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
          wallet: result.wallet ? walletForApi(result.wallet) : result.wallet,
          transaction: result.transaction ? transactionForApi(result.transaction) : result.transaction
        }
      });
    } catch (error) {
      logger.error('Error processing KYC fee', { error });
      next(error);
    }
  }

  /**
   * POST /api/v1/wallets/treasury/debit
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
      const amountKobo = parseAmountOrFail(res, amount, (req.body as { amountUnit?: string }).amountUnit);
      if (amountKobo === null) return;

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
        amount: amountKobo,
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
          wallet: result.wallet ? walletForApi(result.wallet) : result.wallet,
          transaction: result.transaction ? transactionForApi(result.transaction) : result.transaction
        }
      });
    } catch (error) {
      logger.error('Error debiting user wallet', { error });
      next(error);
    }
  }

  /**
   * POST /api/v1/wallets/treasury/debit-merchant
   * Debit the merchant's own Treasury Wallet (used for billing)
   */
  static async debitTreasuryWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      const { error, value } = validateInput<DebitTreasuryData>(debitTreasurySchema, req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      const { amount, description } = value!;
      const amountKobo = parseAmountOrFail(res, amount, (req.body as { amountUnit?: string }).amountUnit);
      if (amountKobo === null) return;

      // Verify that the merchantId in the request matches the authenticated merchant
      if (value!.merchantId !== merchantId) {
        res.status(403).json({
          success: false,
          error: 'You can only debit your own Treasury Wallet'
        });
        return;
      }

      // Perform the debit on the Treasury Wallet
      const result = await WalletService.debitTreasuryWallet({
        merchantId,
        amount: amountKobo,
        description
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('Treasury wallet debited by merchant', {
        merchantId,
        amount
      });

      res.status(200).json({
        success: true,
        message: 'Treasury wallet debited successfully',
        data: {
          wallet: result.wallet ? walletForApi(result.wallet) : result.wallet,
          transaction: result.transaction ? transactionForApi(result.transaction) : result.transaction
        }
      });
    } catch (error) {
      logger.error('Error debiting Treasury wallet', { error });
      next(error);
    }
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
      const amountKobo = parseAmountOrFail(res, amount, (req.body as { amountUnit?: string }).amountUnit);
      if (amountKobo === null) return;

      // Perform the API call
      const result = await WalletService.makeUserApiCall({
        userId,
        endpoint,
        method: method || 'POST',
        headers: headers || {},
        body: body || {},
        amount: amountKobo,
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
          wallet: result.wallet ? walletForApi(result.wallet) : result.wallet,
          transaction: result.transaction ? transactionForApi(result.transaction) : result.transaction,
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
   * Payout from Repayment wallet to an external bank account via PayOnUs.
   */
  static async payoutRepaymentWalletToBank(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const merchantId = req.user.merchantId || req.user.userId;
      const { error, value } = validateInput<RepaymentBankPayoutData>(repaymentBankPayoutSchema, req.body);
      if (error) {
        res.status(400).json({ success: false, error: 'Validation failed', details: error });
        return;
      }

      const amountKobo = parseAmountOrFail(res, value!.amount, (req.body as { amountUnit?: string }).amountUnit);
      if (amountKobo === null) return;

      const result = await WalletService.payoutRepaymentWalletToBank({
        merchantId,
        appId: value!.appId,
        accountNumber: value!.accountNumber,
        bankCode: value!.bankCode,
        accountName: value!.accountName,
        bankName: value!.bankName,
        amount: amountKobo,
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
          wallet: result.wallet ? walletForApi(result.wallet) : result.wallet,
          transaction: result.transaction ? transactionForApi(result.transaction) : result.transaction,
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

  /** @deprecated Use payoutRepaymentWalletToBank */
  static async payoutSettlementWalletToBank(req: Request, res: Response, next: NextFunction): Promise<void> {
    return WalletController.payoutRepaymentWalletToBank(req, res, next);
  }

}