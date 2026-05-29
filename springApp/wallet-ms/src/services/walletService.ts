import { Wallet, MerchantWallet, UserWallet, WalletStatus, Transaction, TransactionType, TransactionStatus, MerchantWalletType } from '../models/Wallet';
import { logger } from '../utils/logger';
import axios, { AxiosRequestConfig } from 'axios';
import { db } from '../db/database';
import { provisionPayonusNubanForWallet } from './payonusNubanProvisioning';
import { initiateBankPayout } from './payonusNubanClient';
import PaymentLedgerService from './paymentLedgerService';

export interface CreateMerchantWalletData {
  merchantId: string;
  /** JWT userId — matches ShareholderModel.userId in compliance-ms */
  complianceShareholderUserId?: string;
  appId?: string;
  appName?: string;
  payonusSubaccountCode?: string;
  name: string;
  currency: string;
  merchantWalletType: MerchantWalletType;
}

export interface CreateUserWalletData {
  userId: string;
  merchantId: string;
  complianceShareholderUserId?: string;
  name: string;
  currency: string;
}

export interface EnsureProductUserWalletData {
  userId: string;
  merchantId: string;
  complianceShareholderUserId?: string;
  applicationId: string;
  productId: string;
  productName?: string;
  productType: string;
  appId?: string;
  currency: string;
}

export interface UpdateWalletBalanceData {
  walletId: string;
  amount: number;
  description: string;
}

export interface FilterTransactionData {
  startDate?: Date;
  endDate?: Date;
  type?: TransactionType;
}

export interface TransferOutData {
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  description: string;
}

export interface DebitWalletData {
  userId: string;
  amount: number;
  description: string;
}

export interface UserApiCallData {
  userId: string;
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  body: any;
  amount: number;
  description: string;
  apiKey?: string;
}

export interface UserBankPayoutData {
  userId: string;
  accountNumber: string;
  bankCode: string;
  accountName: string;
  bankName?: string;
  amount: number;
  currency?: string;
  narration?: string;
  reference?: string;
}

export class WalletService {
  /**
   * Create a new merchant wallet of specific type
   * When any merchant wallet is created, automatically create all three internal wallets
   */
  static async createMerchantWallet(data: CreateMerchantWalletData, skipAutoCreate: boolean = false): Promise<{ 
    success: boolean; 
    wallet?: MerchantWallet; 
    error?: string 
  }> {
    try {
      const existing = await db.getMerchantWalletByType(data.merchantId, data.merchantWalletType, data.appId);
      if (existing) {
        return {
          success: false,
          error: `${data.merchantWalletType} wallet already exists for this merchant${data.appId ? ' app' : ''}`
        };
      }

      const newWallet = await db.createMerchantWallet({
        merchantId: data.merchantId,
        complianceShareholderUserId: data.complianceShareholderUserId,
        appId: data.appId,
        appName: data.appName,
        payonusSubaccountCode: data.payonusSubaccountCode,
        name: data.name,
        currency: data.currency,
        merchantWalletType: data.merchantWalletType
      });
      logger.info('Merchant wallet created', { 
        walletId: newWallet.id, 
        merchantId: data.merchantId,
        appId: data.appId,
        walletType: data.merchantWalletType
      });

      if (!skipAutoCreate) {
        const existingWallets = await this.getAllMerchantWallets(data.merchantId, data.appId);
        if (existingWallets.success && existingWallets.wallets) {
          const hasSettlement = existingWallets.wallets.some(
            w =>
              w.merchantWalletType === MerchantWalletType.SETTLEMENT || w.merchantWalletType === ('TREASURY' as MerchantWalletType)
          );
          const hasBilling = existingWallets.wallets.some(
            w =>
              w.merchantWalletType === MerchantWalletType.BILLING || w.merchantWalletType === ('OPERATION' as MerchantWalletType)
          );
          const hasKYC = existingWallets.wallets.some(w => w.merchantWalletType === MerchantWalletType.KYC);
          if (!hasSettlement || !hasBilling || !hasKYC) {
            const autoCreateResult = await this.createAllMerchantWallets(
              data.merchantId,
              data.currency,
              true,
              data.appId,
              data.appName,
              data.payonusSubaccountCode,
              data.complianceShareholderUserId
            );
            if (!autoCreateResult.success) {
              logger.error('Failed to auto-create merchant wallets', {
                merchantId: data.merchantId,
                appId: data.appId,
                error: autoCreateResult.error
              });
            } else {
              logger.info('Auto-created missing merchant wallets', {
                merchantId: data.merchantId,
                appId: data.appId,
                createdCount: autoCreateResult.wallets?.length
              });
            }
          }
        }
      }

      const walletWithNuban = (await provisionPayonusNubanForWallet(newWallet)) as MerchantWallet;

      return {
        success: true,
        wallet: walletWithNuban
      };
    } catch (error) {
      logger.error('Error creating merchant wallet', { error });
      return {
        success: false,
        error: 'Failed to create merchant wallet'
      };
    }
  }

  /**
   * Create all required merchant wallets (Billing, KYC, Settlement)
   */
  static async createAllMerchantWallets(
    merchantId: string,
    currency: string = 'USD',
    skipAutoCreate: boolean = false,
    appId?: string,
    appName?: string,
    payonusSubaccountCode?: string,
    complianceShareholderUserId?: string
  ): Promise<{ 
    success: boolean; 
    wallets?: MerchantWallet[]; 
    error?: string 
  }> {
    try {
      const wallets: MerchantWallet[] = [];
      const walletTypes = [
        { type: MerchantWalletType.BILLING, name: 'Billing Wallet' },
        { type: MerchantWalletType.KYC, name: 'KYC Wallet' },
        { type: MerchantWalletType.SETTLEMENT, name: 'Settlement Wallet' }
      ];

      for (const walletType of walletTypes) {
        // Check if this wallet type already exists
        const existingWallet = await this.getMerchantWalletByType(merchantId, walletType.type, appId);
        if (existingWallet.success && existingWallet.wallet) {
          // Wallet already exists, add it to the list
          wallets.push(existingWallet.wallet);
          continue;
        }

        // Create the wallet if it doesn't exist
        const result = await this.createMerchantWallet({
          merchantId,
          complianceShareholderUserId,
          appId,
          appName,
          payonusSubaccountCode,
          name: walletType.name,
          currency,
          merchantWalletType: walletType.type
        }, skipAutoCreate); // Pass skipAutoCreate to prevent recursion

        if (!result.success) {
          // If any wallet creation fails, we should clean up already created wallets
          // For simplicity in this mock implementation, we'll just return the error
          return {
            success: false,
            error: `Failed to create ${walletType.name}: ${result.error}`
          };
        }

        if (result.wallet) {
          wallets.push(result.wallet);
        }
      }

      logger.info('All merchant wallets created successfully', { merchantId, appId, walletCount: wallets.length });
      return {
        success: true,
        wallets
      };
    } catch (error) {
      logger.error('Error creating all merchant wallets', { error });
      return {
        success: false,
        error: 'Failed to create merchant wallets'
      };
    }
  }

  /**
   * Get merchant wallet by merchant ID and wallet type
   */
  static async getMerchantWalletByType(merchantId: string, walletType: MerchantWalletType, appId?: string): Promise<{ 
    success: boolean; 
    wallet?: MerchantWallet; 
    error?: string 
  }> {
    try {
      const wallet = await db.getMerchantWalletByType(merchantId, walletType, appId);
      if (wallet) return { success: true, wallet };
      return { success: false, error: `${walletType} wallet not found for merchant${appId ? ' app' : ''}` };
    } catch (error) {
      logger.error('Error retrieving merchant wallet', { error });
      return { success: false, error: 'Failed to retrieve merchant wallet' };
    }
  }

  /**
   * Get all merchant wallets by merchant ID
   */
  static async getAllMerchantWallets(merchantId: string, appId?: string): Promise<{ 
    success: boolean; 
    wallets?: MerchantWallet[]; 
    error?: string 
  }> {
    try {
      const wallets = await db.getAllMerchantWallets(merchantId, appId);
      return { success: true, wallets };
    } catch (error) {
      logger.error('Error retrieving merchant wallets', { error });
      return { success: false, error: 'Failed to retrieve merchant wallets' };
    }
  }

  /**
   * Create a new user wallet
   */
  static async createUserWallet(data: CreateUserWalletData): Promise<{ 
    success: boolean; 
    wallet?: UserWallet; 
    error?: string 
  }> {
    try {
      const existing = await db.getUserWallet(data.userId);
      if (existing) {
        return { success: false, error: 'User wallet already exists' };
      }
      const newWallet = await db.createUserWallet({
        userId: data.userId,
        merchantId: data.merchantId,
        complianceShareholderUserId: data.complianceShareholderUserId,
        name: data.name,
        currency: data.currency
      });
      logger.info('User wallet created', { walletId: newWallet.id, userId: data.userId, merchantId: data.merchantId });
      // PayOnUs fixed VA is provisioned after Fuspay KYC completes (compliance-ms webhook → internal provision API).
      return { success: true, wallet: newWallet };
    } catch (error) {
      logger.error('Error creating user wallet', { error });
      const mongo = error as { code?: number; keyPattern?: Record<string, unknown>; message?: string };
      if (mongo?.code === 11000) {
        return {
          success: false,
          error: `User wallet already exists or duplicate key: ${mongo.message || 'E11000'}`
        };
      }
      const detail =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message: unknown }).message)
            : String(error);
      return { success: false, error: `Failed to create user wallet: ${detail}` };
    }
  }

  static async ensureProductUserWallet(data: EnsureProductUserWalletData): Promise<{
    success: boolean;
    wallet?: UserWallet;
    reusedUpstreamAccount?: boolean;
    skipped?: boolean;
    error?: string;
  }> {
    try {
      const existingProductWallet = await db.getProductUserWallet(data.userId, data.applicationId);
      if (existingProductWallet) {
        if (
          existingProductWallet.virtualNuban?.provisionStatus === 'active' &&
          existingProductWallet.virtualNuban.accountNumber
        ) {
          return {
            success: true,
            wallet: existingProductWallet,
            skipped: true,
            reusedUpstreamAccount: true
          };
        }

        const existingUpstreamAccount = await db.findUserWalletWithActivePayonusAccount(data.userId, data.merchantId);
        if (
          existingUpstreamAccount?.virtualNuban?.accountNumber &&
          existingUpstreamAccount.id !== existingProductWallet.id
        ) {
          const linked = (await db.patchWalletPayonusNuban(existingProductWallet.id, {
            payonusNubanAccountNumber: existingUpstreamAccount.virtualNuban.accountNumber,
            payonusNubanBankName: existingUpstreamAccount.virtualNuban.bankName,
            payonusNubanBankCode: existingUpstreamAccount.virtualNuban.bankCode,
            payonusNubanProviderReference: existingUpstreamAccount.virtualNuban.providerReference,
            payonusNubanAccountType: existingUpstreamAccount.virtualNuban.accountType,
            payonusNubanProvisionStatus: existingUpstreamAccount.virtualNuban.provisionStatus,
            payonusNubanProvisionError: null,
            payonusNubanProvisionedAt: existingUpstreamAccount.virtualNuban.provisionedAt ?? new Date()
          })) as UserWallet | null;
          return { success: true, wallet: linked ?? existingProductWallet, skipped: true, reusedUpstreamAccount: true };
        }

        const provisioned = (await provisionPayonusNubanForWallet(existingProductWallet)) as UserWallet;
        const active = provisioned.virtualNuban?.provisionStatus === 'active' && Boolean(provisioned.virtualNuban.accountNumber);
        return active
          ? { success: true, wallet: provisioned, skipped: true, reusedUpstreamAccount: false }
          : {
              success: false,
              wallet: provisioned,
              error: provisioned.virtualNuban?.provisionError || 'Upstream account was not provisioned for product wallet'
            };
      }

      const wallet = await db.createUserWallet({
        userId: data.userId,
        merchantId: data.merchantId,
        complianceShareholderUserId: data.complianceShareholderUserId,
        walletPurpose: 'PRODUCT',
        productApplicationId: data.applicationId,
        productId: data.productId,
        productType: data.productType,
        appId: data.appId,
        name: data.productName ? `${data.productName} Wallet` : `${data.productType} Application Wallet`,
        currency: data.currency
      });

      const existingUpstreamAccount = await db.findUserWalletWithActivePayonusAccount(data.userId, data.merchantId);
      if (existingUpstreamAccount?.virtualNuban?.accountNumber) {
        const updated = (await db.patchWalletPayonusNuban(wallet.id, {
          payonusNubanAccountNumber: existingUpstreamAccount.virtualNuban.accountNumber,
          payonusNubanBankName: existingUpstreamAccount.virtualNuban.bankName,
          payonusNubanBankCode: existingUpstreamAccount.virtualNuban.bankCode,
          payonusNubanProviderReference: existingUpstreamAccount.virtualNuban.providerReference,
          payonusNubanAccountType: existingUpstreamAccount.virtualNuban.accountType,
          payonusNubanProvisionStatus: existingUpstreamAccount.virtualNuban.provisionStatus,
          payonusNubanProvisionError: null,
          payonusNubanProvisionedAt: existingUpstreamAccount.virtualNuban.provisionedAt ?? new Date()
        })) as UserWallet | null;

        logger.info('Product wallet linked to existing upstream account', {
          walletId: wallet.id,
          sourceWalletId: existingUpstreamAccount.id,
          userId: data.userId,
          applicationId: data.applicationId
        });

        return {
          success: true,
          wallet: updated ?? wallet,
          reusedUpstreamAccount: true
        };
      }

      const walletWithNuban = (await provisionPayonusNubanForWallet(wallet)) as UserWallet;
      const active =
        walletWithNuban.virtualNuban?.provisionStatus === 'active' &&
        Boolean(walletWithNuban.virtualNuban?.accountNumber);

      if (!active) {
        return {
          success: false,
          wallet: walletWithNuban,
          error:
            walletWithNuban.virtualNuban?.provisionError ||
            'Upstream account was not provisioned for product wallet'
        };
      }

      return {
        success: true,
        wallet: walletWithNuban,
        reusedUpstreamAccount: false
      };
    } catch (error) {
      const mongo = error as { code?: number };
      if (mongo?.code === 11000) {
        const existing = await db.getProductUserWallet(data.userId, data.applicationId);
        if (existing) {
          return { success: true, wallet: existing, skipped: true };
        }
      }
      logger.error('Error ensuring product user wallet', { error, applicationId: data.applicationId });
      return { success: false, error: 'Failed to ensure product wallet' };
    }
  }

  /**
   * Provision PayOnUs reserved (fixed) NUBAN for an existing user wallet (post–Fuspay KYC).
   */
  static async provisionUserWalletNuban(userId: string): Promise<{
    success: boolean;
    wallet?: UserWallet;
    skipped?: boolean;
    error?: string;
  }> {
    try {
      const existing = await db.getUserWallet(userId);
      if (!existing) {
        return { success: false, error: 'User wallet not found' };
      }

      if (
        existing.virtualNuban?.provisionStatus === 'active' &&
        existing.virtualNuban?.accountNumber
      ) {
        return { success: true, wallet: existing, skipped: true };
      }

      const walletWithNuban = (await provisionPayonusNubanForWallet(existing)) as UserWallet;
      const active =
        walletWithNuban.virtualNuban?.provisionStatus === 'active' &&
        Boolean(walletWithNuban.virtualNuban?.accountNumber);

      if (!active) {
        return {
          success: false,
          wallet: walletWithNuban,
          error:
            walletWithNuban.virtualNuban?.provisionError ||
            'PayOnUs did not return an account number'
        };
      }

      return { success: true, wallet: walletWithNuban };
    } catch (error) {
      logger.error('Error provisioning user wallet NUBAN', { userId, error });
      return { success: false, error: 'Failed to provision user wallet NUBAN' };
    }
  }

  /**
   * Get user wallet by user ID
   */
  static async getUserWallet(userId: string): Promise<{ 
    success: boolean; 
    wallet?: UserWallet; 
    error?: string 
  }> {
    try {
      const wallet = await db.getUserWallet(userId);
      if (wallet) return { success: true, wallet };
      return { success: false, error: 'User wallet not found' };
    } catch (error) {
      logger.error('Error retrieving user wallet', { error });
      return { success: false, error: 'Failed to retrieve user wallet' };
    }
  }

  /**
   * Get all user wallets associated with a merchant
   */
  static async getUserWalletsByMerchant(merchantId: string): Promise<{ 
    success: boolean; 
    wallets?: UserWallet[]; 
    error?: string 
  }> {
    try {
      const wallets = await db.getUserWalletsByMerchant(merchantId);
      return { success: true, wallets };
    } catch (error) {
      logger.error('Error retrieving user wallets by merchant', { error });
      return { success: false, error: 'Failed to retrieve user wallets' };
    }
  }

  /**
   * Update wallet balance
   */
  static async updateWalletBalance(walletId: string, amount: number, description: string): Promise<{ 
    success: boolean; 
    wallet?: Wallet; 
    error?: string 
  }> {
    try {
      const wallet = await db.getWalletById(walletId);
      if (!wallet) return { success: false, error: 'Wallet not found' };
      if (wallet.status !== WalletStatus.ACTIVE) return { success: false, error: 'Wallet is not active' };

      const balanceBefore = wallet.mainBalance;
      const newMain = balanceBefore + amount;
      const newLedger = wallet.ledgerBalance + amount;

      await db.updateWalletBalance(walletId, { mainBalance: newMain, ledgerBalance: newLedger });
      await db.createTransaction({
        walletId,
        amount,
        type: amount >= 0 ? TransactionType.CREDIT : TransactionType.DEBIT,
        status: TransactionStatus.COMPLETED,
        description,
        balanceBefore,
        balanceAfter: newMain
      });

      const updated = await db.getWalletById(walletId);
      logger.info('Wallet balance updated', { walletId, newBalance: newMain });
      return { success: true, wallet: updated! };
    } catch (error) {
      logger.error('Error updating wallet balance', { error });
      return { success: false, error: 'Failed to update wallet balance' };
    }
  }

  /**
   * Get wallet by ID
   */
  static async getWalletById(walletId: string): Promise<{ 
    success: boolean; 
    wallet?: Wallet; 
    error?: string 
  }> {
    try {
      const wallet = await db.getWalletById(walletId);
      if (!wallet) return { success: false, error: 'Wallet not found' };
      return { success: true, wallet };
    } catch (error) {
      logger.error('Error retrieving wallet', { error });
      return { success: false, error: 'Failed to retrieve wallet' };
    }
  }

  static async getWalletByPayonusAccountNumber(accountNumber: string): Promise<{
    success: boolean;
    wallet?: Wallet;
    error?: string;
  }> {
    try {
      const wallet = await db.getWalletByPayonusAccountNumber(accountNumber);
      if (!wallet) return { success: false, error: 'Wallet not found for account number' };
      return { success: true, wallet };
    } catch (error) {
      logger.error('Error retrieving wallet by Payonus account number', { error });
      return { success: false, error: 'Failed to retrieve wallet' };
    }
  }

  /**
   * Filter transactions by date range and type for a specific wallet
   */
  static async filterWalletTransactions(walletId: string, filterData: FilterTransactionData): Promise<{ 
    success: boolean; 
    transactions?: Transaction[]; 
    error?: string 
  }> {
    try {
      const wallet = await db.getWalletById(walletId);
      if (!wallet) return { success: false, error: 'Wallet not found' };

      const transactions = await db.getTransactionsByWalletId(walletId, {
        startDate: filterData.startDate,
        endDate: filterData.endDate,
        type: filterData.type
      });
      return { success: true, transactions };
    } catch (error) {
      logger.error('Error filtering wallet transactions', { error });
      return { success: false, error: 'Failed to filter wallet transactions' };
    }
  }

  /**
   * Filter User Wallet transactions by date range and type
   */
  static async filterUserTransactions(userId: string, filterData: FilterTransactionData): Promise<{ 
    success: boolean; 
    transactions?: Transaction[]; 
    error?: string 
  }> {
    try {
      // Get User Wallet
      const userResult = await this.getUserWallet(userId);
      if (!userResult.success || !userResult.wallet) {
        return {
          success: false,
          error: 'User wallet not found'
        };
      }

      // Filter transactions
      const result = await this.filterWalletTransactions(userResult.wallet.id, filterData);

      return result;
    } catch (error) {
      logger.error('Error filtering user transactions', { error });
      return {
        success: false,
        error: 'Failed to filter user transactions'
      };
    }
  }

  /**
   * Filter Billing Wallet transactions by date range and type
   */
  static async filterBillingTransactions(merchantId: string, filterData: FilterTransactionData): Promise<{ 
    success: boolean; 
    transactions?: Transaction[]; 
    error?: string 
  }> {
    try {
      // Get Billing Wallet for the merchant
      const billingResult = await this.getBillingWallet(merchantId);
      if (!billingResult.success || !billingResult.wallet) {
        return {
          success: false,
          error: 'Billing wallet not found for merchant'
        };
      }

      // Filter transactions
      const result = await this.filterWalletTransactions(billingResult.wallet.id, filterData);

      return result;
    } catch (error) {
      logger.error('Error filtering billing transactions', { error });
      return {
        success: false,
        error: 'Failed to filter billing transactions'
      };
    }
  }

  /**
   * Filter KYC Wallet transactions by date range and type
   */
  static async filterKycTransactions(merchantId: string, filterData: FilterTransactionData): Promise<{ 
    success: boolean; 
    transactions?: Transaction[]; 
    error?: string 
  }> {
    try {
      // Get KYC Wallet for the merchant
      const kycResult = await this.getKycWallet(merchantId);
      if (!kycResult.success || !kycResult.wallet) {
        return {
          success: false,
          error: 'KYC wallet not found for merchant'
        };
      }

      // Filter transactions
      const result = await this.filterWalletTransactions(kycResult.wallet.id, filterData);

      return result;
    } catch (error) {
      logger.error('Error filtering kyc transactions', { error });
      return {
        success: false,
        error: 'Failed to filter kyc transactions'
      };
    }
  }

  /**
   * Transfer money out from one wallet to another
   */
  static async transferOut(transferData: TransferOutData): Promise<{ 
    success: boolean; 
    fromWallet?: Wallet; 
    toWallet?: Wallet; 
    transaction?: Transaction; 
    error?: string 
  }> {
    try {
      const fromWallet = await db.getWalletById(transferData.fromWalletId);
      const toWallet = await db.getWalletById(transferData.toWalletId);
      if (!fromWallet) return { success: false, error: 'Source wallet not found' };
      if (!toWallet) return { success: false, error: 'Destination wallet not found' };
      if (fromWallet.status !== WalletStatus.ACTIVE) return { success: false, error: 'Source wallet is not active' };
      if (toWallet.status !== WalletStatus.ACTIVE) return { success: false, error: 'Destination wallet is not active' };
      if (fromWallet.mainBalance < transferData.amount) return { success: false, error: 'Insufficient balance in source wallet' };

      const fromBalanceBefore = fromWallet.mainBalance;
      const toBalanceBefore = toWallet.mainBalance;

      await db.updateWalletBalance(fromWallet.id, {
        mainBalance: fromBalanceBefore - transferData.amount,
        ledgerBalance: fromWallet.ledgerBalance - transferData.amount
      });
      await db.updateWalletBalance(toWallet.id, {
        mainBalance: toBalanceBefore + transferData.amount,
        ledgerBalance: toWallet.ledgerBalance + transferData.amount
      });

      const debitTransaction = await db.createTransaction({
        walletId: fromWallet.id,
        amount: -transferData.amount,
        type: TransactionType.DEBIT,
        status: TransactionStatus.COMPLETED,
        description: `Transfer out: ${transferData.description}`,
        referenceId: toWallet.id,
        balanceBefore: fromBalanceBefore,
        balanceAfter: fromBalanceBefore - transferData.amount
      });
      await db.createTransaction({
        walletId: toWallet.id,
        amount: transferData.amount,
        type: TransactionType.CREDIT,
        status: TransactionStatus.COMPLETED,
        description: `Transfer in: ${transferData.description}`,
        referenceId: fromWallet.id,
        balanceBefore: toBalanceBefore,
        balanceAfter: toBalanceBefore + transferData.amount
      });

      const updatedFrom = await db.getWalletById(fromWallet.id);
      const updatedTo = await db.getWalletById(toWallet.id);
      logger.info('Money transferred between wallets', { fromWalletId: fromWallet.id, toWalletId: toWallet.id, amount: transferData.amount });
      return { success: true, fromWallet: updatedFrom!, toWallet: updatedTo!, transaction: debitTransaction };
    } catch (error) {
      logger.error('Error transferring money between wallets', { error });
      return { success: false, error: 'Failed to transfer money between wallets' };
    }
  }

  /**
   * Transfer money out from user wallet to another wallet
   */
  static async transferOutFromUser(transferData: { 
    userId: string, 
    toWalletId: string, 
    amount: number, 
    description: string 
  }): Promise<{ 
    success: boolean; 
    fromWallet?: UserWallet; 
    toWallet?: Wallet; 
    transaction?: Transaction; 
    error?: string 
  }> {
    try {
      // Get the user wallet
      const userResult = await this.getUserWallet(transferData.userId);
      if (!userResult.success || !userResult.wallet) {
        return {
          success: false,
          error: 'User wallet not found'
        };
      }

      const userWallet = userResult.wallet;

      // Use the existing transferOut function to perform the transfer
      const transferResult = await this.transferOut({
        fromWalletId: userWallet.id,
        toWalletId: transferData.toWalletId,
        amount: transferData.amount,
        description: transferData.description
      });

      // Cast the wallets to UserWallet type since we know the fromWallet is a user wallet
      if (transferResult.success && transferResult.fromWallet && transferResult.toWallet) {
        return {
          success: true,
          fromWallet: transferResult.fromWallet as UserWallet,
          toWallet: transferResult.toWallet,
          transaction: transferResult.transaction,
          error: undefined
        };
      } else {
        return {
          success: false,
          fromWallet: undefined,
          toWallet: undefined,
          transaction: undefined,
          error: transferResult.error
        };
      }
    } catch (error) {
      logger.error('Error transferring money from user wallet', { error });
      return {
        success: false,
        error: 'Failed to transfer money from user wallet'
      };
    }
  }

  /**
   * Send money from a user's PayOnUs-backed wallet to an external bank account.
   */
  static async payoutUserWalletToBank(payoutData: UserBankPayoutData): Promise<{
    success: boolean;
    wallet?: UserWallet;
    transaction?: Transaction;
    providerReference?: string;
    providerStatus?: string;
    payoutReference?: string;
    error?: string;
  }> {
    try {
      if (payoutData.amount <= 0) {
        return { success: false, error: 'Amount must be greater than zero' };
      }

      const userWallet = await db.getUserWallet(payoutData.userId);
      if (!userWallet) return { success: false, error: 'User wallet not found' };
      if (userWallet.status !== WalletStatus.ACTIVE) return { success: false, error: 'User wallet is not active' };

      const currency = (payoutData.currency || userWallet.currency).toUpperCase();
      if (currency !== userWallet.currency.toUpperCase()) {
        return { success: false, error: 'Payout currency must match wallet currency' };
      }

      const sourceAccountNumber = userWallet.virtualNuban?.accountNumber;
      if (userWallet.virtualNuban?.provisionStatus !== 'active' || !sourceAccountNumber) {
        return { success: false, error: 'User PayOnUs virtual account is not active' };
      }

      if (userWallet.mainBalance < payoutData.amount) {
        return { success: false, error: 'Insufficient balance in user wallet' };
      }

      const payoutReference =
        payoutData.reference?.trim() || `payout-${userWallet.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const existingPayout = await db.findCompletedTransactionByReference(userWallet.id, payoutReference);
      if (existingPayout) {
        const wallet = await db.getWalletById(userWallet.id);
        const ledgerResult = await PaymentLedgerService.recordWalletPayout({
          userId: payoutData.userId,
          amount: Math.abs(existingPayout.amount),
          currency,
          txnRef: payoutReference,
          sessionId: existingPayout.id,
          description: existingPayout.description,
          thirdPartyRefId: existingPayout.externalReference,
          beneficiaryInfo: {
            beneficiary_fiat_ref: payoutData.accountNumber,
            bank_name: payoutData.bankName || payoutData.bankCode,
            bank_code: payoutData.bankCode,
            account_number: payoutData.accountNumber,
            account_holder_name: payoutData.accountName,
            other_data: {
              source: 'wallet-ms',
              payoutReference,
              duplicateWalletTransaction: true
            }
          }
        });
        if (!ledgerResult.success && !ledgerResult.skipped) {
          logger.warn('Payment ledger entry failed for duplicate wallet payout', {
            userId: payoutData.userId,
            payoutReference,
            error: ledgerResult.error
          });
        }
        return {
          success: true,
          wallet: wallet as UserWallet,
          transaction: existingPayout,
          payoutReference,
          providerReference: existingPayout.externalReference
        };
      }
      const narration = payoutData.narration || 'User wallet bank payout';

      const providerResult = await initiateBankPayout({
        sourceAccountNumber,
        destinationAccountNumber: payoutData.accountNumber,
        destinationBankCode: payoutData.bankCode,
        destinationAccountName: payoutData.accountName,
        amount: payoutData.amount,
        currency,
        reference: payoutReference,
        narration
      });

      if (!providerResult.ok) {
        return {
          success: false,
          providerReference: providerResult.providerReference,
          providerStatus: providerResult.providerStatus,
          payoutReference,
          error: providerResult.errorMessage || 'PayOnUs payout failed'
        };
      }

      const balanceBefore = userWallet.mainBalance;
      const newBalance = balanceBefore - payoutData.amount;
      await db.updateWalletBalance(userWallet.id, {
        mainBalance: newBalance,
        ledgerBalance: userWallet.ledgerBalance - payoutData.amount
      });

      const transaction = await db.createTransaction({
        walletId: userWallet.id,
        amount: -payoutData.amount,
        type: TransactionType.DEBIT,
        status: TransactionStatus.COMPLETED,
        description: `External bank payout: ${narration}`,
        referenceId: payoutReference,
        externalReference: providerResult.providerReference || payoutReference,
        category: 'PAYOUT',
        source: 'PAYONUS',
        tags: ['payonus', 'bank-payout'],
        metadata: {
          providerStatus: providerResult.providerStatus,
          httpStatus: providerResult.httpStatus,
          destinationBankCode: payoutData.bankCode,
          destinationAccountName: payoutData.accountName,
          destinationAccountLast4: payoutData.accountNumber.slice(-4),
          sourceAccountLast4: sourceAccountNumber.slice(-4)
        },
        balanceBefore,
        balanceAfter: newBalance
      });

      const updated = await db.getWalletById(userWallet.id);
      const ledgerResult = await PaymentLedgerService.recordWalletPayout({
        userId: payoutData.userId,
        amount: payoutData.amount,
        currency,
        txnRef: payoutReference,
        sessionId: transaction.id,
        description: `External bank payout: ${narration}`,
        thirdPartyRefId: providerResult.providerReference || payoutReference,
        beneficiaryInfo: {
          beneficiary_fiat_ref: payoutData.accountNumber,
          bank_name: payoutData.bankName || payoutData.bankCode,
          bank_code: payoutData.bankCode,
          account_number: payoutData.accountNumber,
          account_holder_name: payoutData.accountName,
          other_data: {
            source: 'wallet-ms',
            payoutReference,
            walletTransactionId: transaction.id,
            providerStatus: providerResult.providerStatus
          }
        }
      });
      if (!ledgerResult.success && !ledgerResult.skipped) {
        logger.warn('Payment ledger entry failed after wallet payout', {
          userId: payoutData.userId,
          payoutReference,
          walletTransactionId: transaction.id,
          error: ledgerResult.error
        });
      }
      logger.info('User wallet paid out to external bank account', {
        walletId: userWallet.id,
        userId: payoutData.userId,
        amount: payoutData.amount,
        currency,
        payoutReference,
        providerReference: providerResult.providerReference,
        providerStatus: providerResult.providerStatus
      });

      return {
        success: true,
        wallet: updated as UserWallet,
        transaction,
        providerReference: providerResult.providerReference,
        providerStatus: providerResult.providerStatus,
        payoutReference
      };
    } catch (error) {
      logger.error('Error paying out from user wallet to bank', { error });
      return { success: false, error: 'Failed to pay out from user wallet' };
    }
  }

  /**
   * Debit a user wallet (used for billing)
   */
  static async debitUserWallet(debitData: DebitWalletData): Promise<{ 
    success: boolean; 
    wallet?: Wallet; 
    transaction?: Transaction; 
    error?: string 
  }> {
    try {
      const userWallet = await db.getUserWallet(debitData.userId);
      if (!userWallet) return { success: false, error: 'User wallet not found' };
      if (userWallet.status !== WalletStatus.ACTIVE) return { success: false, error: 'User wallet is not active' };
      if (userWallet.mainBalance < debitData.amount) return { success: false, error: 'Insufficient balance in user wallet' };

      const balanceBefore = userWallet.mainBalance;
      const newBalance = balanceBefore - debitData.amount;
      await db.updateWalletBalance(userWallet.id, { mainBalance: newBalance, ledgerBalance: userWallet.ledgerBalance - debitData.amount });
      const transaction = await db.createTransaction({
        walletId: userWallet.id,
        amount: -debitData.amount,
        type: TransactionType.DEBIT,
        status: TransactionStatus.COMPLETED,
        description: debitData.description,
        balanceBefore,
        balanceAfter: newBalance
      });
      const updated = await db.getWalletById(userWallet.id);
      logger.info('User wallet debited', { walletId: userWallet.id, userId: debitData.userId, amount: debitData.amount });
      return { success: true, wallet: updated!, transaction };
    } catch (error) {
      logger.error('Error debiting user wallet', { error });
      return { success: false, error: 'Failed to debit user wallet' };
    }
  }

  /**
   * Transfer money from Billing Wallet to KYC Wallet
   */
  static async transferFromBillingToKyc(transferData: { 
    merchantId: string, 
    amount: number, 
    description: string 
  }): Promise<{ 
    success: boolean; 
    fromWallet?: MerchantWallet; 
    toWallet?: MerchantWallet; 
    transaction?: Transaction; 
    error?: string 
  }> {
    try {
      // Get the Billing Wallet for this merchant
      const billingResult = await this.getMerchantWalletByType(transferData.merchantId, MerchantWalletType.BILLING);
      if (!billingResult.success || !billingResult.wallet) {
        return {
          success: false,
          error: 'Billing wallet not found for merchant'
        };
      }

      // Get the KYC Wallet for this merchant
      const kycResult = await this.getMerchantWalletByType(transferData.merchantId, MerchantWalletType.KYC);
      if (!kycResult.success || !kycResult.wallet) {
        return {
          success: false,
          error: 'KYC wallet not found for merchant'
        };
      }

      // Use the existing transferOut function to perform the transfer
      const transferResult = await this.transferOut({
        fromWalletId: billingResult.wallet.id,
        toWalletId: kycResult.wallet.id,
        amount: transferData.amount,
        description: transferData.description
      });

      // Cast the wallets to MerchantWallet type since we know they are merchant wallets
      if (transferResult.success && transferResult.fromWallet && transferResult.toWallet) {
        return {
          success: true,
          fromWallet: transferResult.fromWallet as MerchantWallet,
          toWallet: transferResult.toWallet as MerchantWallet,
          transaction: transferResult.transaction,
          error: undefined
        };
      } else {
        return {
          success: false,
          fromWallet: undefined,
          toWallet: undefined,
          transaction: undefined,
          error: transferResult.error
        };
      }
    } catch (error) {
      logger.error('Error transferring money from Billing to KYC wallet', { error });
      return {
        success: false,
        error: 'Failed to transfer money from Billing to KYC wallet'
      };
    }
  }

  /**
   * Transfer money from KYC Wallet to Billing Wallet
   */
  static async transferFromKycToBilling(transferData: { 
    merchantId: string, 
    amount: number, 
    description: string 
  }): Promise<{ 
    success: boolean; 
    fromWallet?: MerchantWallet; 
    toWallet?: MerchantWallet; 
    transaction?: Transaction; 
    error?: string 
  }> {
    try {
      // Get the KYC Wallet for this merchant
      const kycResult = await this.getMerchantWalletByType(transferData.merchantId, MerchantWalletType.KYC);
      if (!kycResult.success || !kycResult.wallet) {
        return {
          success: false,
          error: 'KYC wallet not found for merchant'
        };
      }

      // Get the Billing Wallet for this merchant
      const billingResult = await this.getMerchantWalletByType(transferData.merchantId, MerchantWalletType.BILLING);
      if (!billingResult.success || !billingResult.wallet) {
        return {
          success: false,
          error: 'Billing wallet not found for merchant'
        };
      }

      // Use the existing transferOut function to perform the transfer
      const transferResult = await this.transferOut({
        fromWalletId: kycResult.wallet.id,
        toWalletId: billingResult.wallet.id,
        amount: transferData.amount,
        description: transferData.description
      });

      // Cast the wallets to MerchantWallet type since we know they are merchant wallets
      if (transferResult.success && transferResult.fromWallet && transferResult.toWallet) {
        return {
          success: true,
          fromWallet: transferResult.fromWallet as MerchantWallet,
          toWallet: transferResult.toWallet as MerchantWallet,
          transaction: transferResult.transaction,
          error: undefined
        };
      } else {
        return {
          success: false,
          fromWallet: undefined,
          toWallet: undefined,
          transaction: undefined,
          error: transferResult.error
        };
      }
    } catch (error) {
      logger.error('Error transferring money from KYC to Billing wallet', { error });
      return {
        success: false,
        error: 'Failed to transfer money from KYC to Billing wallet'
      };
    }
  }

  /**
   * Get Billing Wallet for a merchant
   */
  static async getBillingWallet(merchantId: string): Promise<{
    success: boolean;
    wallet?: MerchantWallet;
    error?: string
  }> {
    return this.getMerchantWalletByType(merchantId, MerchantWalletType.BILLING);
  }

  /**
   * Get KYC Wallet for a merchant
   */
  static async getKycWallet(merchantId: string): Promise<{ 
    success: boolean; 
    wallet?: MerchantWallet; 
    error?: string 
  }> {
    return this.getMerchantWalletByType(merchantId, MerchantWalletType.KYC);
  }

  /**
   * Get Settlement Wallet for a merchant
   */
  static async getSettlementWallet(merchantId: string): Promise<{
    success: boolean;
    wallet?: MerchantWallet;
    error?: string
  }> {
    return this.getMerchantWalletByType(merchantId, MerchantWalletType.SETTLEMENT);
  }

  /**
   * Debit a merchant's Settlement Wallet
   */
  static async debitSettlementWallet(debitData: { merchantId: string, amount: number, description: string }): Promise<{
    success: boolean; 
    wallet?: MerchantWallet; 
    transaction?: Transaction; 
    error?: string 
  }> {
    try {
      const settlementResult = await this.getSettlementWallet(debitData.merchantId);
      if (!settlementResult.success || !settlementResult.wallet) return { success: false, error: 'Settlement wallet not found for merchant' };
      const settlementWallet = settlementResult.wallet;
      if (settlementWallet.status !== WalletStatus.ACTIVE) return { success: false, error: 'Settlement wallet is not active' };
      if (settlementWallet.mainBalance < debitData.amount) return { success: false, error: 'Insufficient balance in Settlement wallet' };

      const balanceBefore = settlementWallet.mainBalance;
      const newBalance = balanceBefore - debitData.amount;
      await db.updateWalletBalance(settlementWallet.id, { mainBalance: newBalance, ledgerBalance: settlementWallet.ledgerBalance - debitData.amount });
      const transaction = await db.createTransaction({
        walletId: settlementWallet.id,
        amount: -debitData.amount,
        type: TransactionType.DEBIT,
        status: TransactionStatus.COMPLETED,
        description: debitData.description,
        balanceBefore,
        balanceAfter: newBalance
      });
      const updated = await db.getWalletById(settlementWallet.id);
      logger.info('Settlement wallet debited', { walletId: settlementWallet.id, merchantId: debitData.merchantId, amount: debitData.amount });
      return { success: true, wallet: updated as MerchantWallet, transaction };
    } catch (error) {
      logger.error('Error debiting Settlement wallet', { error });
      return { success: false, error: 'Failed to debit Settlement wallet' };
    }
  }

  /**
   * Debit a merchant's Billing Wallet
   */
  static async debitBillingWallet(debitData: { merchantId: string, amount: number, description: string }): Promise<{ 
    success: boolean; 
    wallet?: MerchantWallet; 
    transaction?: Transaction; 
    error?: string 
  }> {
    try {
      const billingResult = await this.getBillingWallet(debitData.merchantId);
      if (!billingResult.success || !billingResult.wallet) return { success: false, error: 'Billing wallet not found for merchant' };
      const billingWallet = billingResult.wallet;
      if (billingWallet.status !== WalletStatus.ACTIVE) return { success: false, error: 'Billing wallet is not active' };
      if (billingWallet.mainBalance < debitData.amount) return { success: false, error: 'Insufficient balance in Billing wallet' };

      const balanceBefore = billingWallet.mainBalance;
      const newBalance = balanceBefore - debitData.amount;
      await db.updateWalletBalance(billingWallet.id, { mainBalance: newBalance, ledgerBalance: billingWallet.ledgerBalance - debitData.amount });
      const transaction = await db.createTransaction({
        walletId: billingWallet.id,
        amount: -debitData.amount,
        type: TransactionType.DEBIT,
        status: TransactionStatus.COMPLETED,
        description: debitData.description,
        balanceBefore,
        balanceAfter: newBalance
      });
      const updated = await db.getWalletById(billingWallet.id);
      logger.info('Billing wallet debited', { walletId: billingWallet.id, merchantId: debitData.merchantId, amount: debitData.amount });
      return { success: true, wallet: updated as MerchantWallet, transaction };
    } catch (error) {
      logger.error('Error debiting Billing wallet', { error });
      return { success: false, error: 'Failed to debit Billing wallet' };
    }
  }

  /**
   * Debit a merchant's KYC Wallet (used for billing)
   */
  static async debitKycWallet(debitData: { merchantId: string, amount: number, description: string }): Promise<{ 
    success: boolean; 
    wallet?: MerchantWallet; 
    transaction?: Transaction; 
    error?: string 
  }> {
    try {
      const kycResult = await this.getKycWallet(debitData.merchantId);
      if (!kycResult.success || !kycResult.wallet) return { success: false, error: 'KYC wallet not found for merchant' };
      const kycWallet = kycResult.wallet;
      if (kycWallet.status !== WalletStatus.ACTIVE) return { success: false, error: 'KYC wallet is not active' };
      if (kycWallet.mainBalance < debitData.amount) return { success: false, error: 'Insufficient balance in KYC wallet' };

      const balanceBefore = kycWallet.mainBalance;
      const newBalance = balanceBefore - debitData.amount;
      await db.updateWalletBalance(kycWallet.id, { mainBalance: newBalance, ledgerBalance: kycWallet.ledgerBalance - debitData.amount });
      const transaction = await db.createTransaction({
        walletId: kycWallet.id,
        amount: -debitData.amount,
        type: TransactionType.DEBIT,
        status: TransactionStatus.COMPLETED,
        description: debitData.description,
        balanceBefore,
        balanceAfter: newBalance
      });
      const updated = await db.getWalletById(kycWallet.id);
      logger.info('KYC wallet debited', { walletId: kycWallet.id, merchantId: debitData.merchantId, amount: debitData.amount });
      return { success: true, wallet: updated as MerchantWallet, transaction };
    } catch (error) {
      logger.error('Error debiting KYC wallet', { error });
      return { success: false, error: 'Failed to debit KYC wallet' };
    }
  }

  /**
   * Process KYC fee by debiting the merchant's KYC wallet
   * This method is specifically for handling KYC-related fees
   */
  static async processKycFee(merchantId: string, amount: number, description: string = 'KYC Fee'): Promise<{ 
    success: boolean; 
    wallet?: MerchantWallet; 
    transaction?: Transaction; 
    error?: string 
  }> {
    try {
      if (amount <= 0) return { success: false, error: 'KYC fee amount must be positive' };
      const kycResult = await this.getKycWallet(merchantId);
      if (!kycResult.success || !kycResult.wallet) return { success: false, error: 'KYC wallet not found for merchant' };
      const kycWallet = kycResult.wallet;
      if (kycWallet.status !== WalletStatus.ACTIVE) return { success: false, error: 'KYC wallet is not active' };
      if (kycWallet.mainBalance < amount) return { success: false, error: 'Insufficient balance in KYC wallet for KYC fee' };

      const balanceBefore = kycWallet.mainBalance;
      const newBalance = balanceBefore - amount;
      await db.updateWalletBalance(kycWallet.id, { mainBalance: newBalance, ledgerBalance: kycWallet.ledgerBalance - amount });
      const transaction = await db.createTransaction({
        walletId: kycWallet.id,
        amount: -amount,
        type: TransactionType.DEBIT,
        status: TransactionStatus.COMPLETED,
        description,
        referenceId: 'KYC_FEE',
        balanceBefore,
        balanceAfter: newBalance
      });
      const updated = await db.getWalletById(kycWallet.id);
      logger.info('KYC fee processed', { walletId: kycWallet.id, merchantId, amount, description });
      return { success: true, wallet: updated as MerchantWallet, transaction };
    } catch (error) {
      logger.error('Error processing KYC fee', { error });
      return { success: false, error: 'Failed to process KYC fee' };
    }
  }

  /**
   * Make a 3rd party API call from a user wallet
   */
  static async makeUserApiCall(apiCallData: UserApiCallData): Promise<{ 
    success: boolean; 
    wallet?: UserWallet; 
    transaction?: Transaction; 
    apiResponse?: any;
    error?: string 
  }> {
    try {
      // Get the user wallet
      const userResult = await this.getUserWallet(apiCallData.userId);
      if (!userResult.success || !userResult.wallet) {
        return {
          success: false,
          error: 'User wallet not found'
        };
      }

      const userWallet = userResult.wallet;

      if (userWallet.status !== WalletStatus.ACTIVE) {
        return {
          success: false,
          error: 'User wallet is not active'
        };
      }

      // Check if wallet has sufficient balance
      if (userWallet.mainBalance < apiCallData.amount) {
        return {
          success: false,
          error: 'Insufficient balance in user wallet'
        };
      }

      // Prepare the API call
      const axiosConfig: AxiosRequestConfig = {
        method: apiCallData.method as any,
        url: apiCallData.endpoint,
        headers: {
          'Content-Type': 'application/json',
          ...apiCallData.headers
        },
        timeout: 10000 // 10 second timeout
      };

      // Add API key to headers if provided
      if (apiCallData.apiKey) {
        axiosConfig.headers!['Authorization'] = `Bearer ${apiCallData.apiKey}`;
      }

      // Add request body for POST/PUT requests
      if ((apiCallData.method === 'POST' || apiCallData.method === 'PUT') && apiCallData.body) {
        axiosConfig.data = apiCallData.body;
      }

      logger.info('Making 3rd party API call', { 
        userId: apiCallData.userId,
        endpoint: apiCallData.endpoint,
        method: apiCallData.method
      });

      // Make the API call
      let apiResponse;
      try {
        const response = await axios(axiosConfig);
        apiResponse = response.data;
        logger.info('3rd party API call successful', { 
          userId: apiCallData.userId,
          endpoint: apiCallData.endpoint,
          status: response.status
        });
      } catch (apiError: any) {
        logger.error('3rd party API call failed', { 
          userId: apiCallData.userId,
          endpoint: apiCallData.endpoint,
          error: apiError.message,
          status: apiError.response?.status
        });
        
        // Even if the API call fails, we still debit the wallet as the service was attempted
        // In a real implementation, you might want to handle this differently based on business rules
        return {
          success: false,
          error: `API call failed: ${apiError.message}`,
          wallet: userWallet
        };
      }

      const balanceBefore = userWallet.mainBalance;
      const newBalance = balanceBefore - apiCallData.amount;
      await db.updateWalletBalance(userWallet.id, { mainBalance: newBalance, ledgerBalance: userWallet.ledgerBalance - apiCallData.amount });
      const transaction = await db.createTransaction({
        walletId: userWallet.id,
        amount: -apiCallData.amount,
        type: TransactionType.DEBIT,
        status: TransactionStatus.COMPLETED,
        description: `API Call: ${apiCallData.description}`,
        referenceId: apiCallData.endpoint,
        balanceBefore,
        balanceAfter: newBalance
      });
      const updated = await db.getWalletById(userWallet.id);
      logger.info('User wallet debited for API call', { walletId: userWallet.id, userId: apiCallData.userId, amount: apiCallData.amount });
      return {
        success: true,
        wallet: updated! as UserWallet,
        transaction,
        apiResponse
      };
    } catch (error) {
      logger.error('Error making user API call', { error });
      return {
        success: false,
        error: 'Failed to make API call'
      };
    }
  }
}
