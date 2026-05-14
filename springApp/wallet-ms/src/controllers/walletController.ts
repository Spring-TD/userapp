import { Request, Response, NextFunction } from 'express';
import { WalletService } from '../services';
import { logger } from '../utils/logger';
import { validateInput, createMerchantWalletSchema, createUserWalletSchema, updateWalletBalanceSchema, filterTransactionSchema, transferOutSchema, debitWalletSchema, debitTreasurySchema, operationToKycTransferSchema, kycToOperationTransferSchema, userApiCallSchema } from '../utils/validation';
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

interface OperationToKycTransferData {
  amount: number;
  description: string;
}

interface KycToOperationTransferData {
  amount: number;
  description: string;
}

interface OperationDebitData {
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

      const result = await WalletService.createMerchantWallet({
        merchantId,
        complianceShareholderUserId: complianceShareholderUserId || req.user.userId,
        appId,
        appName,
        payonusSubaccountCode,
        name: name || `${merchantWalletType} Wallet`,
        currency: currency || 'USD',
        merchantWalletType
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
   * Create all required merchant wallets (Treasury, Operation, KYC)
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
        currency || 'USD',
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

      // Validate wallet type
      if (!Object.values(MerchantWalletType).includes(walletType as MerchantWalletType)) {
        res.status(400).json({
          success: false,
          error: 'Invalid merchant wallet type'
        });
        return;
      }

      const result = await WalletService.getMerchantWalletByType(merchantId, walletType as MerchantWalletType);

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

      const result = await WalletService.updateWalletBalance(userId, amount, description);

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
      const { startDate, endDate, type } = req.query;

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
      const { error, value } = validateInput<FilterTransactionData>(filterTransactionSchema, { startDate, endDate, type });
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
        type: type as TransactionType
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
        transactionCount: result.transactions?.length
      });

      res.status(200).json({
        success: true,
        data: {
          transactions: result.transactions
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
   * GET /api/v1/wallets/treasury/:merchantId/transactions
   * Filter Treasury Wallet transactions by date range and type
   */
  static async filterTreasuryTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { merchantId } = req.params;
      const { startDate, endDate, type } = req.query;

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
      const { error, value } = validateInput<FilterTransactionData>(filterTransactionSchema, { startDate, endDate, type });
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      // Get Treasury Wallet for the merchant
      const treasuryResult = await WalletService.getTreasuryWallet(merchantId);
      if (!treasuryResult.success || !treasuryResult.wallet) {
        res.status(404).json({
          success: false,
          error: 'Treasury wallet not found'
        });
        return;
      }

      // Filter transactions
      const filterData = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        type: type as TransactionType
      };

      const result = await WalletService.filterWalletTransactions(treasuryResult.wallet.id, filterData);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('Treasury wallet transactions filtered', {
        merchantId,
        transactionCount: result.transactions?.length
      });

      res.status(200).json({
        success: true,
        data: {
          transactions: result.transactions
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
          fromWallet: result.fromWallet,
          toWallet: result.toWallet,
          transaction: result.transaction
        }
      });
    } catch (error) {
      logger.error('Error transferring money from Treasury Wallet', { error });
      next(error);
    }
  }

  /**
   * POST /api/v1/wallets/operation-to-kyc
   * Transfer money from Operation Wallet to KYC Wallet
   */
  static async transferFromOperationToKyc(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      const { error, value } = validateInput<OperationToKycTransferData>(operationToKycTransferSchema, req.body);
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
      const result = await WalletService.transferFromOperationToKyc({
        merchantId,
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

      logger.info('Money transferred from Operation to KYC Wallet', {
        merchantId,
        amount
      });

      res.status(200).json({
        success: true,
        message: 'Money transferred successfully from Operation to KYC Wallet',
        data: {
          fromWallet: result.fromWallet,
          toWallet: result.toWallet,
          transaction: result.transaction
        }
      });
    } catch (error) {
      logger.error('Error transferring money from Operation to KYC Wallet', { error });
      next(error);
    }
  }

  /**
   * POST /api/v1/wallets/kyc-to-operation
   * Transfer money from KYC Wallet to Operation Wallet
   */
  static async transferFromKycToOperation(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      const { error, value } = validateInput<KycToOperationTransferData>(kycToOperationTransferSchema, req.body);
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
      const result = await WalletService.transferFromKycToOperation({
        merchantId,
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

      logger.info('Money transferred from KYC to Operation Wallet', {
        merchantId,
        amount
      });

      res.status(200).json({
        success: true,
        message: 'Money transferred successfully from KYC to Operation Wallet',
        data: {
          fromWallet: result.fromWallet,
          toWallet: result.toWallet,
          transaction: result.transaction
        }
      });
    } catch (error) {
      logger.error('Error transferring money from KYC to Operation Wallet', { error });
      next(error);
    }
  }

  /**
   * GET /api/v1/wallets/operation/:merchantId/transactions
   * Filter Operation Wallet transactions by date range and type
   */
  static async filterOperationTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { merchantId } = req.params;
      const { startDate, endDate, type } = req.query;

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
      const { error, value } = validateInput<FilterTransactionData>(filterTransactionSchema, { startDate, endDate, type });
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
        type: type as TransactionType
      };

      const result = await WalletService.filterOperationTransactions(merchantId, filterData);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('Operation wallet transactions filtered', {
        merchantId,
        transactionCount: result.transactions?.length
      });

      res.status(200).json({
        success: true,
        data: {
          transactions: result.transactions
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
      const { startDate, endDate, type } = req.query;

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
      const { error, value } = validateInput<FilterTransactionData>(filterTransactionSchema, { startDate, endDate, type });
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
        type: type as TransactionType
      };

      const result = await WalletService.filterKycTransactions(merchantId, filterData);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('KYC wallet transactions filtered', {
        merchantId,
        transactionCount: result.transactions?.length
      });

      res.status(200).json({
        success: true,
        data: {
          transactions: result.transactions
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

      // Perform the debit on the Operation Wallet
      const result = await WalletService.debitOperationWallet({
        merchantId,
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

      logger.info('Operation wallet debited by merchant', {
        merchantId,
        amount
      });

      res.status(200).json({
        success: true,
        message: 'Operation wallet debited successfully',
        data: {
          wallet: result.wallet,
          transaction: result.transaction
        }
      });
    } catch (error) {
      logger.error('Error debiting Operation wallet', { error });
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

      // Validate input data
      const { error, value } = validateInput<KycDebitData>(debitTreasurySchema, req.body);
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

      logger.info('Treasury wallet debited by merchant', {
        merchantId,
        amount
      });

      res.status(200).json({
        success: true,
        message: 'Treasury wallet debited successfully',
        data: {
          wallet: result.wallet,
          transaction: result.transaction
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

}