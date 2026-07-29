import { Wallet, MerchantWallet, UserWallet, WalletStatus, Transaction, TransactionType, TransactionStatus, MerchantWalletType } from '../models/Wallet';
import { logger } from '../utils/logger';
import axios, { AxiosRequestConfig } from 'axios';
import { db } from '../db/database';
import { provisionPayonusNubanForWallet } from './payonusNubanProvisioning';
import { initiateBankPayout, fetchBanks, nameEnquiry, type PayonusBank } from './payonusNubanClient';
import PaymentLedgerService from './paymentLedgerService';
import { AppTransactionMirrorService } from './appTransactionMirrorService';
import { UserExternalBankAccountService } from './userExternalBankAccountService';
import { notifyWalletBankPayout } from './walletPayoutNotificationService';
import { notifyTransactionReceipt } from './transactionReceiptService';
import { fetchRetailUserProfile, formatPersonName } from './authProfileClient';
import { buildUserProductTypeSummary } from '../utils/productTypeSummary';
import type { UserProductTypeSummary } from '../types/productTypeSummary';
import {
  PRODUCT_MS_SETTLEMENT_SOURCE,
  resolveLoanTransferCharge,
  type LoanTransferChargeCollectionResult,
  type LoanTransferChargeContext
} from './productMsClient';
import {
  REPAYMENT_COLLECTION_SOURCE,
  COMMODITY_PURCHASE_SOURCE,
  COMMODITY_MATURITY_PAYOUT_SOURCE,
  INVESTMENT_PURCHASE_SOURCE,
  SAVINGS_PURCHASE_SOURCE,
  type SettlementCollectInput,
  type CommodityPurchaseCollectInput,
  type InvestmentPurchaseCollectInput,
  type SavingsPurchaseCollectInput
} from '../types/settlementCollection';

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
  upstreamAccount?: {
    accountNumber?: string;
    bankName?: string;
    bankCode?: string;
    providerReference?: string;
    accountType?: 'static' | 'reserved' | 'dynamic';
    provisionStatus?: 'active' | 'failed';
    provisionError?: string;
    provisionedAt?: string | Date;
  };
}

export interface ApplyProductApplicationApprovalData {
  userId: string;
  applicationId: string;
  merchantId: string;
  productId: string;
  productName?: string;
  productType: string;
  appId?: string;
  amount: number;
  currency?: string;
  referenceId: string;
  description?: string;
  metadata?: Record<string, unknown>;
  upstreamAccount?: EnsureProductUserWalletData['upstreamAccount'];
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
  savedBankAccountId: string;
  amount: number;
  currency?: string;
  narration?: string;
  reference?: string;
}

/** Normalize a PayOnUs payout status string into a canonical state. */
export type PayoutLifecycleStatus = 'SUCCESSFUL' | 'PROCESSING' | 'PENDING' | 'FAILED' | 'REVERSED' | 'UNKNOWN';

export function mapPayoutProviderStatus(status?: string): PayoutLifecycleStatus {
  const normalized = (status || '').trim().toUpperCase();
  if (!normalized) return 'UNKNOWN';
  if (['SUCCESSFUL', 'SUCCESS', 'COMPLETED', 'PAID', 'SETTLED', 'APPROVED'].includes(normalized)) return 'SUCCESSFUL';
  if (['FAILED', 'FAILURE', 'REJECTED', 'DECLINED', 'ERROR'].includes(normalized)) return 'FAILED';
  if (['REVERSED', 'REVERSAL', 'REFUNDED', 'RETURNED', 'CANCELLED', 'CANCELED'].includes(normalized)) return 'REVERSED';
  if (['PROCESSING', 'IN_PROGRESS', 'PENDING_APPROVAL'].includes(normalized)) return 'PROCESSING';
  if (['PENDING', 'INITIATED', 'QUEUED', 'NEW'].includes(normalized)) return 'PENDING';
  return 'UNKNOWN';
}

export class WalletService {
  private static parseProvisionedAt(value: string | Date | undefined): Date | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private static async linkUpstreamAccountToProductWallet(
    wallet: UserWallet,
    upstreamAccount: EnsureProductUserWalletData['upstreamAccount'] | undefined
  ): Promise<UserWallet> {
    if (!upstreamAccount?.accountNumber) {
      return wallet;
    }

    const linked = (await db.patchWalletPayonusNuban(wallet.id, {
      payonusNubanAccountNumber: upstreamAccount.accountNumber,
      payonusNubanBankName: upstreamAccount.bankName,
      payonusNubanBankCode: upstreamAccount.bankCode,
      payonusNubanProviderReference: upstreamAccount.providerReference,
      payonusNubanAccountType: upstreamAccount.accountType ?? 'reserved',
      payonusNubanProvisionStatus: upstreamAccount.provisionStatus ?? 'active',
      payonusNubanProvisionError: upstreamAccount.provisionError ?? null,
      payonusNubanProvisionedAt: this.parseProvisionedAt(upstreamAccount.provisionedAt) ?? new Date()
    })) as UserWallet | null;

    return linked ?? wallet;
  }

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
              w.merchantWalletType === MerchantWalletType.REPAYMENT || w.merchantWalletType === ('TREASURY' as MerchantWalletType)
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
   * Create all required merchant wallets (Billing, KYC, Repayment)
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
        { type: MerchantWalletType.REPAYMENT, name: 'Repayment Wallet' }
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
        const linkedProductWallet = await this.linkUpstreamAccountToProductWallet(
          existingProductWallet,
          data.upstreamAccount
        );
        if (
          linkedProductWallet.virtualNuban?.provisionStatus === 'active' &&
          linkedProductWallet.virtualNuban.accountNumber
        ) {
          return {
            success: true,
            wallet: linkedProductWallet,
            skipped: true,
            reusedUpstreamAccount: true
          };
        }

        const existingUpstreamAccount = await db.findUserWalletWithActivePayonusAccount(data.userId, data.merchantId);
        if (
          existingUpstreamAccount?.virtualNuban?.accountNumber &&
          existingUpstreamAccount.id !== linkedProductWallet.id
        ) {
          const linked = (await db.patchWalletPayonusNuban(linkedProductWallet.id, {
            payonusNubanAccountNumber: existingUpstreamAccount.virtualNuban.accountNumber,
            payonusNubanBankName: existingUpstreamAccount.virtualNuban.bankName,
            payonusNubanBankCode: existingUpstreamAccount.virtualNuban.bankCode,
            payonusNubanProviderReference: existingUpstreamAccount.virtualNuban.providerReference,
            payonusNubanAccountType: existingUpstreamAccount.virtualNuban.accountType,
            payonusNubanProvisionStatus: existingUpstreamAccount.virtualNuban.provisionStatus,
            payonusNubanProvisionError: null,
            payonusNubanProvisionedAt: existingUpstreamAccount.virtualNuban.provisionedAt ?? new Date()
          })) as UserWallet | null;
          return { success: true, wallet: linked ?? linkedProductWallet, skipped: true, reusedUpstreamAccount: true };
        }

        const provisioned = (await provisionPayonusNubanForWallet(linkedProductWallet)) as UserWallet;
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

      const linkedWallet = await this.linkUpstreamAccountToProductWallet(wallet, data.upstreamAccount);
      if (linkedWallet.virtualNuban?.provisionStatus === 'active' && linkedWallet.virtualNuban.accountNumber) {
        return {
          success: true,
          wallet: linkedWallet,
          reusedUpstreamAccount: true
        };
      }

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

      const walletWithNuban = (await provisionPayonusNubanForWallet(linkedWallet)) as UserWallet;
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

  static async applyProductApplicationApproval(data: ApplyProductApplicationApprovalData): Promise<{
    success: boolean;
    wallet?: UserWallet;
    transaction?: Transaction;
    duplicate?: boolean;
    error?: string;
  }> {
    try {
      if (!Number.isFinite(data.amount) || data.amount === 0) {
        return { success: false, error: 'amount must be a non-zero finite number' };
      }

      const ensured = await this.ensureProductUserWallet({
        userId: data.userId,
        merchantId: data.merchantId,
        applicationId: data.applicationId,
        productId: data.productId,
        productName: data.productName,
        productType: data.productType,
        appId: data.appId,
        currency: data.currency ?? 'NGN',
        upstreamAccount: data.upstreamAccount
      });
      if (!ensured.success || !ensured.wallet) {
        return { success: false, error: ensured.error || 'Product application wallet not found' };
      }
      const wallet = ensured.wallet;
      if (data.currency && wallet.currency !== data.currency.toUpperCase()) {
        return { success: false, error: `Wallet currency ${wallet.currency} does not match ${data.currency}` };
      }

      const existing = await db.findCompletedTransactionByReference(wallet.id, data.referenceId);
      if (existing) {
        return { success: true, wallet, transaction: existing, duplicate: true };
      }

      const result = await this.updateWalletBalance(
        wallet.id,
        data.amount,
        data.description || 'Product application approval',
        {
          referenceId: data.referenceId,
          category: 'PRODUCT_APPLICATION_APPROVAL',
          source: 'PLATA_LOAN_WORKFLOW',
          metadata: {
            applicationId: data.applicationId,
            userId: data.userId,
            ...(data.metadata ?? {})
          },
          tags: ['product-application', 'loan-workflow', data.amount >= 0 ? 'approval-credit' : 'approval-debit']
        }
      );

      if (!result.success || !result.wallet) {
        return { success: false, error: result.error || 'Failed to apply product application approval' };
      }

      const transaction = await db.findCompletedTransactionByReference(result.wallet.id, data.referenceId);
      return {
        success: true,
        wallet: result.wallet as UserWallet,
        transaction: transaction ?? undefined,
        duplicate: false
      };
    } catch (error) {
      logger.error('Error applying product application approval to wallet', {
        error,
        applicationId: data.applicationId,
        userId: data.userId
      });
      return { success: false, error: 'Failed to apply product application approval' };
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

  static async listUserWallets(userId: string): Promise<{
    success: boolean;
    wallets?: UserWallet[];
    error?: string;
  }> {
    try {
      const wallets = await db.getUserWalletsByUserId(userId);
      return { success: true, wallets };
    } catch (error) {
      logger.error('Error listing user wallets', { error, userId });
      return { success: false, error: 'Failed to list user wallets' };
    }
  }

  /**
   * Totals per product type from PRODUCT wallets only (PRIMARY excluded).
   * Missing product types return 0.
   */
  static async getUserProductTypeSummary(
    userId: string,
    wallets?: UserWallet[]
  ): Promise<{
    success: boolean;
    summary?: UserProductTypeSummary;
    error?: string;
  }> {
    try {
      let userWallets = wallets;
      if (!userWallets) {
        const listResult = await WalletService.listUserWallets(userId);
        if (!listResult.success) {
          return { success: false, error: listResult.error };
        }
        userWallets = listResult.wallets ?? [];
      }
      const summary = buildUserProductTypeSummary(userId, userWallets);
      return { success: true, summary };
    } catch (error) {
      logger.error('Error building user product type summary', { error, userId });
      return { success: false, error: 'Failed to build product type summary' };
    }
  }

  /**
   * Update wallet balance
   */
  static async updateWalletBalance(
    walletId: string,
    amount: number,
    description: string,
    transactionDetails: {
      referenceId?: string;
      category?: string;
      source?: string;
      metadata?: Record<string, unknown>;
      tags?: string[];
      externalReference?: string;
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ): Promise<{
    success: boolean;
    wallet?: Wallet;
    transaction?: Transaction;
    error?: string;
  }> {
    try {
      const wallet = await db.getWalletById(walletId);
      if (!wallet) return { success: false, error: 'Wallet not found' };
      if (wallet.status !== WalletStatus.ACTIVE) return { success: false, error: 'Wallet is not active' };

      const balanceBefore = wallet.mainBalance;
      const newMain = balanceBefore + amount;
      const newLedger = wallet.ledgerBalance + amount;

      await db.updateWalletBalance(walletId, { mainBalance: newMain, ledgerBalance: newLedger });
      const transaction = await db.createTransaction({
        walletId,
        amount,
        type: amount >= 0 ? TransactionType.CREDIT : TransactionType.DEBIT,
        status: TransactionStatus.COMPLETED,
        description,
        balanceBefore,
        balanceAfter: newMain,
        ...transactionDetails
      });

      const updated = await db.getWalletById(walletId);
      logger.info('Wallet balance updated', { walletId, newBalance: newMain });
      return { success: true, wallet: updated!, transaction };
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
  static async filterBillingTransactions(
    merchantId: string,
    filterData: FilterTransactionData,
    appId?: string
  ): Promise<{ 
    success: boolean; 
    transactions?: Transaction[]; 
    error?: string 
  }> {
    try {
      // Get Billing Wallet for the merchant
      const billingResult = await this.getBillingWallet(merchantId, appId);
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
  static async filterKycTransactions(
    merchantId: string,
    filterData: FilterTransactionData,
    appId?: string
  ): Promise<{ 
    success: boolean; 
    transactions?: Transaction[]; 
    error?: string 
  }> {
    try {
      // Get KYC Wallet for the merchant
      const kycResult = await this.getKycWallet(merchantId, appId);
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

  static async transferProductApplicationToPrimary(transferData: {
    userId: string;
    applicationId: string;
    amount: number;
    description: string;
  }): Promise<{
    success: boolean;
    fromWallet?: UserWallet;
    toWallet?: UserWallet;
    transaction?: Transaction;
    loanChargeCollection?: LoanTransferChargeCollectionResult;
    error?: string;
  }> {
    try {
      const productWallet = await db.getProductUserWallet(transferData.userId, transferData.applicationId);
      if (!productWallet) {
        return { success: false, error: 'Product application wallet not found' };
      }

      const primaryWalletResult = await this.getUserWallet(transferData.userId);
      if (!primaryWalletResult.success || !primaryWalletResult.wallet) {
        return { success: false, error: 'Primary user wallet not found' };
      }

      const primaryWallet = primaryWalletResult.wallet;
      const productType = String(productWallet.productType || '').toUpperCase();
      const isLendingProduct = productType === 'LOAN' || productType === 'MORTGAGE';

      if (isLendingProduct) {
        const chargeContext = await resolveLoanTransferCharge({
          userId: transferData.userId,
          applicationId: transferData.applicationId
        });

        if (chargeContext && 'error' in chargeContext) {
          return { success: false, error: chargeContext.error };
        }

        if (chargeContext && !chargeContext.skipped && chargeContext.chargeAmount > 0 && chargeContext.collect) {
          return this.transferLoanProductApplicationToPrimaryWithCharge({
            productWallet,
            primaryWallet,
            transferData,
            chargeContext
          });
        }
      }

      const transferResult = await this.transferOut({
        fromWalletId: productWallet.id,
        toWalletId: primaryWallet.id,
        amount: transferData.amount,
        description: transferData.description
      });

      if (!transferResult.success || !transferResult.fromWallet || !transferResult.toWallet) {
        return {
          success: false,
          error: transferResult.error || 'Failed to transfer product application balance'
        };
      }

      return {
        success: true,
        fromWallet: transferResult.fromWallet as UserWallet,
        toWallet: transferResult.toWallet as UserWallet,
        transaction: transferResult.transaction,
        loanChargeCollection: isLendingProduct
          ? { attempted: false, success: true, skipped: true, skippedReason: 'no_charge_on_transfer' }
          : undefined
      };
    } catch (error) {
      logger.error('Error transferring product application balance to primary wallet', {
        error,
        userId: transferData.userId,
        applicationId: transferData.applicationId
      });
      return { success: false, error: 'Failed to transfer product application balance' };
    }
  }

  /**
   * Atomically moves loan proceeds to PRIMARY and applies LOAN_CHARGE in one operation.
   * Charge is withheld from the transfer (PRIMARY receives net amount) so insufficient-balance
   * on PRIMARY can never occur after the transfer completes.
   */
  private static async transferLoanProductApplicationToPrimaryWithCharge(input: {
    productWallet: UserWallet;
    primaryWallet: UserWallet;
    transferData: { userId: string; applicationId: string; amount: number; description: string };
    chargeContext: LoanTransferChargeContext;
  }): Promise<{
    success: boolean;
    fromWallet?: UserWallet;
    toWallet?: UserWallet;
    transaction?: Transaction;
    loanChargeCollection?: LoanTransferChargeCollectionResult;
    error?: string;
  }> {
    const { productWallet, primaryWallet, transferData, chargeContext } = input;
    const collect = chargeContext.collect!;
    const chargeAmount = chargeContext.chargeAmount;
    const amount = transferData.amount;
    const source = collect.source || PRODUCT_MS_SETTLEMENT_SOURCE;
    const referenceId = collect.referenceId;

    const existingCharge = await db.findTransactionByExternalReferenceAndSource(referenceId, source);
    if (existingCharge) {
      const transferResult = await this.transferOut({
        fromWalletId: productWallet.id,
        toWalletId: primaryWallet.id,
        amount,
        description: transferData.description
      });
      if (!transferResult.success || !transferResult.fromWallet || !transferResult.toWallet) {
        return {
          success: false,
          error: transferResult.error || 'Failed to transfer product application balance'
        };
      }
      return {
        success: true,
        fromWallet: transferResult.fromWallet as UserWallet,
        toWallet: transferResult.toWallet as UserWallet,
        transaction: transferResult.transaction,
        loanChargeCollection: {
          attempted: true,
          success: true,
          duplicate: true,
          chargeAmount: 0,
          netToPrimary: amount
        }
      };
    }

    if (amount < chargeAmount) {
      return {
        success: false,
        error: `Transfer amount must be at least ${chargeAmount} ${collect.currency} to cover the ${collect.category === 'MORTGAGE_CHARGE' ? 'mortgage' : 'loan'} charge`
      };
    }

    if (productWallet.status !== WalletStatus.ACTIVE) {
      return { success: false, error: 'Source wallet is not active' };
    }
    if (primaryWallet.status !== WalletStatus.ACTIVE) {
      return { success: false, error: 'Destination wallet is not active' };
    }
    if (productWallet.mainBalance < amount) {
      return { success: false, error: 'Insufficient balance in source wallet' };
    }

    const settlementResult = await this.getSettlementWallet(collect.merchantId, collect.appId);
    if (!settlementResult.success || !settlementResult.wallet) {
      return {
        success: false,
        error: settlementResult.error || 'Settlement wallet not found for merchant app'
      };
    }
    const settlementWallet = settlementResult.wallet;
    if (settlementWallet.status !== WalletStatus.ACTIVE) {
      return { success: false, error: 'Settlement wallet is not active' };
    }
    if (collect.currency && settlementWallet.currency !== collect.currency.toUpperCase()) {
      return {
        success: false,
        error: `Settlement wallet currency ${settlementWallet.currency} does not match ${collect.currency}`
      };
    }
    if (collect.currency && primaryWallet.currency !== collect.currency.toUpperCase()) {
      return {
        success: false,
        error: `User wallet currency ${primaryWallet.currency} does not match ${collect.currency}`
      };
    }

    const netToPrimary = amount - chargeAmount;
    const productBalanceBefore = productWallet.mainBalance;
    const primaryBalanceBefore = primaryWallet.mainBalance;
    const settlementBalanceBefore = settlementWallet.mainBalance;

    await db.updateWalletBalance(productWallet.id, {
      mainBalance: productBalanceBefore - amount,
      ledgerBalance: productWallet.ledgerBalance - amount
    });
    await db.updateWalletBalance(primaryWallet.id, {
      mainBalance: primaryBalanceBefore + netToPrimary,
      ledgerBalance: primaryWallet.ledgerBalance + netToPrimary
    });
    await db.updateWalletBalance(settlementWallet.id, {
      mainBalance: settlementBalanceBefore + chargeAmount,
      ledgerBalance: settlementWallet.ledgerBalance + chargeAmount
    });

    const productDebitTx = await db.createTransaction({
      walletId: productWallet.id,
      amount: -amount,
      type: TransactionType.DEBIT,
      status: TransactionStatus.COMPLETED,
      description: `Transfer out: ${transferData.description}`,
      referenceId: primaryWallet.id,
      balanceBefore: productBalanceBefore,
      balanceAfter: productBalanceBefore - amount
    });

    const primaryCreditTx = await db.createTransaction({
      walletId: primaryWallet.id,
      amount,
      type: TransactionType.CREDIT,
      status: TransactionStatus.COMPLETED,
      description: `Transfer in: ${transferData.description}`,
      referenceId: productWallet.id,
      balanceBefore: primaryBalanceBefore,
      balanceAfter: primaryBalanceBefore + amount,
      metadata: {
        grossTransferAmount: amount,
        loanChargeAmount: chargeAmount,
        netTransferAmount: netToPrimary,
        applicationId: transferData.applicationId
      }
    });

    const primaryChargeTx = await db.createTransaction({
      walletId: primaryWallet.id,
      amount: -chargeAmount,
      type: TransactionType.DEBIT,
      status: TransactionStatus.COMPLETED,
      description: `Settlement collection: ${collect.description}`,
      referenceId,
      balanceBefore: primaryBalanceBefore + amount,
      balanceAfter: primaryBalanceBefore + netToPrimary,
      category: collect.category,
      source,
      externalReference: referenceId,
      metadata: {
        merchantId: collect.merchantId,
        appId: collect.appId,
        applicationId: collect.applicationId,
        productId: collect.productId,
        productType: collect.productType,
        settlementWalletId: settlementWallet.id,
        relatedTransferTransactionId: primaryCreditTx.id,
        ...(collect.metadata ?? {})
      },
      tags: ['settlement-collection', 'user-wallet-debit', collect.category.toLowerCase()]
    });

    const settlementTransaction = await db.createTransaction({
      walletId: settlementWallet.id,
      amount: chargeAmount,
      type: TransactionType.CREDIT,
      status: TransactionStatus.COMPLETED,
      description: collect.description,
      referenceId,
      balanceBefore: settlementBalanceBefore,
      balanceAfter: settlementBalanceBefore + chargeAmount,
      category: collect.category,
      source,
      externalReference: referenceId,
      metadata: {
        merchantId: collect.merchantId,
        appId: collect.appId,
        userId: collect.userId,
        applicationId: collect.applicationId,
        productId: collect.productId,
        productType: collect.productType,
        userWalletId: primaryWallet.id,
        userTransactionId: primaryChargeTx.id,
        currency: collect.currency ?? settlementWallet.currency,
        ...(collect.metadata ?? {})
      },
      tags: ['settlement-collection', 'settlement-credit', collect.category.toLowerCase()]
    });

    const updatedProduct = await db.getWalletById(productWallet.id);
    const updatedPrimary = await db.getWalletById(primaryWallet.id);

    logger.info('Loan product transfer with settlement charge completed atomically', {
      userId: transferData.userId,
      applicationId: transferData.applicationId,
      amount,
      chargeAmount,
      netToPrimary,
      referenceId
    });

    return {
      success: true,
      fromWallet: updatedProduct as UserWallet,
      toWallet: updatedPrimary as UserWallet,
      transaction: productDebitTx,
      loanChargeCollection: {
        attempted: true,
        success: true,
        chargeAmount,
        netToPrimary,
        transactionId: settlementTransaction.id
      }
    };
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
    savedBankAccountId?: string;
    error?: string;
  }> {
    try {
      if (payoutData.amount <= 0) {
        return { success: false, error: 'Amount must be greater than zero' };
      }

      const resolved = await UserExternalBankAccountService.resolveForPayout(
        payoutData.userId,
        payoutData.savedBankAccountId
      );
      if (!resolved.success || !resolved.account) {
        return { success: false, error: resolved.error || 'Saved bank account not found' };
      }
      const savedAccount = resolved.account;

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
            beneficiary_fiat_ref: savedAccount.accountNumber,
            bank_name: savedAccount.bankName || savedAccount.bankCode,
            bank_code: savedAccount.bankCode,
            account_number: savedAccount.accountNumber,
            account_holder_name: savedAccount.accountName,
            other_data: {
              source: 'wallet-ms',
              payoutReference,
              savedBankAccountId: savedAccount.id,
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
          providerReference: existingPayout.externalReference,
          savedBankAccountId: savedAccount.id
        };
      }
      const narration = payoutData.narration || 'User wallet bank payout';

      const providerResult = await initiateBankPayout({
        sourceAccountNumber,
        destinationAccountNumber: savedAccount.accountNumber,
        destinationBankCode: savedAccount.bankCode,
        destinationAccountName: savedAccount.accountName,
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
          savedBankAccountId: savedAccount.id,
          destinationBankCode: savedAccount.bankCode,
          destinationAccountName: savedAccount.accountName,
          destinationAccountLast4: savedAccount.accountNumber.slice(-4),
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
          beneficiary_fiat_ref: savedAccount.accountNumber,
          bank_name: savedAccount.bankName || savedAccount.bankCode,
          bank_code: savedAccount.bankCode,
          account_number: savedAccount.accountNumber,
          account_holder_name: savedAccount.accountName,
          other_data: {
            source: 'wallet-ms',
            payoutReference,
            savedBankAccountId: savedAccount.id,
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

      const payoutAmount = payoutData.amount;
      const customerProfile = await fetchRetailUserProfile(payoutData.userId);
      const customerName = formatPersonName(
        customerProfile?.firstName,
        customerProfile?.lastName,
        savedAccount.accountName
      );

      void AppTransactionMirrorService.mirrorUserWalletPayout({
        appId: userWallet.appId,
        userId: payoutData.userId,
        walletId: userWallet.id,
        amount: payoutAmount,
        currency,
        reference: payoutReference,
        providerReference: providerResult.providerReference || payoutReference,
        providerStatus: providerResult.providerStatus,
        walletTransactionStatus: transaction.status,
        customerName,
        destinationBankName: savedAccount.bankName || savedAccount.bankCode,
        destinationAccountLast4: savedAccount.accountNumber.slice(-4),
        metadata: {
          savedBankAccountId: savedAccount.id,
          walletTransactionId: transaction.id
        }
      });

      return {
        success: true,
        wallet: updated as UserWallet,
        transaction,
        providerReference: providerResult.providerReference,
        providerStatus: providerResult.providerStatus,
        payoutReference,
        savedBankAccountId: savedAccount.id
      };
    } catch (error) {
      logger.error('Error paying out from user wallet to bank', { error });
      return { success: false, error: 'Failed to pay out from user wallet' };
    }
  }

  /**
   * List the banks PayOnUs supports for payouts (for a frontend bank picker).
   * Cached in-process. Pass `key` (e.g. `ZAR`) for the EFT bank list.
   */
  static async listBanks(options?: { key?: string; forceRefresh?: boolean }): Promise<{
    success: boolean;
    banks: PayonusBank[];
    cached?: boolean;
    error?: string;
  }> {
    const result = await fetchBanks(options);
    if (!result.ok) {
      return { success: false, banks: [], error: result.errorMessage || 'Failed to fetch bank list' };
    }
    return { success: true, banks: result.banks, cached: result.cached };
  }

  /**
   * Verify a beneficiary bank account via PayOnUs name enquiry, so the frontend can
   * confirm the account holder's name before submitting a payout.
   */
  static async verifyBankAccount(params: { accountNumber: string; bankCode: string; currency?: string }): Promise<{
    success: boolean;
    accountName?: string;
    accountNumber?: string;
    bankCode?: string;
    bankName?: string;
    error?: string;
  }> {
    const result = await nameEnquiry(params);
    if (!result.ok || !result.accountName) {
      return { success: false, error: result.errorMessage || 'Bank account verification failed' };
    }
    return {
      success: true,
      accountName: result.accountName,
      accountNumber: result.accountNumber,
      bankCode: result.bankCode,
      bankName: result.bankName
    };
  }

  /**
   * Resolve a PayOnUs payout (or settlement payout) transaction by either its
   * provider reference (onusReference / externalReference) or merchant reference
   * (referenceId). Returns the matching PAYOUT / SETTLEMENT_PAYOUT transaction or null.
   */
  static async findPayonusPayoutTransaction(reference: string): Promise<Transaction | null> {
    const ref = reference?.trim();
    if (!ref) return null;

    let transaction = await db.findTransactionByExternalReferenceAndSource(ref, 'PAYONUS');
    if (!transaction) {
      transaction = await db.findTransactionByReferenceAndSource(ref, 'PAYONUS');
    }
    if (!transaction) return null;

    const category = (transaction.category || '').toUpperCase();
    if (category !== 'PAYOUT' && category !== 'SETTLEMENT_PAYOUT') return null;
    return transaction;
  }

  /**
   * Apply a PayOnUs payout status callback to the matching payout transaction.
   *
   * - Locates the original PAYOUT / SETTLEMENT_PAYOUT transaction by onusReference
   *   (externalReference) or merchantReference (referenceId), both scoped to source 'PAYONUS'.
   * - Records the latest provider status on the transaction metadata (idempotently).
   * - When the payout ultimately FAILS / is REVERSED, credits the source wallet back
   *   exactly once and writes a compensating PAYOUT_REVERSAL credit transaction.
   */
  static async applyPayoutStatusUpdate(input: {
    onusReference?: string;
    merchantReference?: string;
    providerStatus?: string;
    rawPayload?: Record<string, unknown>;
  }): Promise<{
    success: boolean;
    matched: boolean;
    refunded?: boolean;
    alreadyApplied?: boolean;
    status?: PayoutLifecycleStatus;
    transactionId?: string;
    walletId?: string;
    error?: string;
  }> {
    try {
      const onusRef = input.onusReference?.trim();
      const merchantRef = input.merchantReference?.trim();

      if (!onusRef && !merchantRef) {
        return { success: false, matched: false, error: 'onusReference or merchantReference is required' };
      }

      let transaction: Transaction | null = null;
      if (onusRef) {
        transaction = await db.findTransactionByExternalReferenceAndSource(onusRef, 'PAYONUS');
      }
      if (!transaction && merchantRef) {
        transaction = await db.findTransactionByReferenceAndSource(merchantRef, 'PAYONUS');
      }
      if (!transaction && onusRef) {
        transaction = await db.findTransactionByReferenceAndSource(onusRef, 'PAYONUS');
      }

      if (!transaction) {
        logger.warn('PayOnUs payout status callback did not match any payout transaction', {
          onusReference: onusRef,
          merchantReference: merchantRef,
          providerStatus: input.providerStatus
        });
        return { success: true, matched: false };
      }

      const category = (transaction.category || '').toUpperCase();
      if (category !== 'PAYOUT' && category !== 'SETTLEMENT_PAYOUT') {
        logger.warn('PayOnUs payout status callback matched a non-payout transaction; ignoring', {
          transactionId: transaction.id,
          category: transaction.category
        });
        return { success: true, matched: false };
      }

      const mappedStatus = mapPayoutProviderStatus(input.providerStatus);
      const existingMeta = (transaction.metadata || {}) as Record<string, unknown>;
      const previousStatus = mapPayoutProviderStatus(String(existingMeta.providerStatus || ''));
      const alreadyReversed = existingMeta.reversed === true;

      const nowIso = new Date().toISOString();
      const statusHistory = Array.isArray(existingMeta.statusHistory)
        ? [...(existingMeta.statusHistory as unknown[])]
        : [];
      statusHistory.push({ status: mappedStatus, providerStatus: input.providerStatus, at: nowIso });

      const isFailure = mappedStatus === 'FAILED' || mappedStatus === 'REVERSED';

      // Terminal-state idempotency: a successful payout that has already been marked
      // successful, or a failure already reversed, needs no further action.
      if (!isFailure && previousStatus === mappedStatus && mappedStatus !== 'UNKNOWN') {
        return {
          success: true,
          matched: true,
          alreadyApplied: true,
          status: mappedStatus,
          transactionId: transaction.id,
          walletId: transaction.walletId
        };
      }

      let refunded = false;

      if (isFailure && !alreadyReversed) {
        const reversalReference = `${transaction.referenceId || transaction.id}::reversal`;
        const existingReversal = await db.findTransactionByReferenceAndSource(reversalReference, 'PAYONUS');

        if (!existingReversal) {
          const wallet = await db.getWalletById(transaction.walletId);
          if (!wallet) {
            logger.error('Cannot refund failed payout: source wallet not found', {
              transactionId: transaction.id,
              walletId: transaction.walletId
            });
          } else {
            const refundAmount = Math.abs(transaction.amount);
            const balanceBefore = wallet.mainBalance;
            const balanceAfter = balanceBefore + refundAmount;

            await db.updateWalletBalance(wallet.id, {
              mainBalance: balanceAfter,
              ledgerBalance: wallet.ledgerBalance + refundAmount
            });

            const reversalTxn = await db.createTransaction({
              walletId: wallet.id,
              amount: refundAmount,
              type: TransactionType.CREDIT,
              status: TransactionStatus.COMPLETED,
              description: `Reversal of failed bank payout (${transaction.referenceId || transaction.id})`,
              referenceId: reversalReference,
              externalReference: onusRef || transaction.externalReference,
              category: `${category}_REVERSAL`,
              source: 'PAYONUS',
              tags: ['payonus', 'bank-payout', 'reversal'],
              metadata: {
                reversalOf: transaction.id,
                reversalOfReference: transaction.referenceId,
                providerStatus: input.providerStatus,
                reason: 'payout_failed_or_reversed',
                receivedAt: nowIso
              },
              balanceBefore,
              balanceAfter
            });

            refunded = true;
            existingMeta.reversalTransactionId = reversalTxn.id;

            logger.info('Refunded wallet for failed/reversed PayOnUs payout', {
              transactionId: transaction.id,
              reversalTransactionId: reversalTxn.id,
              walletId: wallet.id,
              amount: refundAmount,
              providerStatus: input.providerStatus
            });

            // Best-effort mirror of the reversal credit into create-app-ms.
            const reversalUserId = 'userId' in wallet ? (wallet as UserWallet).userId : undefined;
            try {
              await AppTransactionMirrorService.recordTransaction({
                appId: wallet.appId,
                userId: reversalUserId,
                walletId: wallet.id,
                amount: refundAmount,
                currency: wallet.currency,
                type: 'credit',
                status: 'completed',
                description: `Reversal of failed bank payout (${transaction.referenceId || transaction.id})`,
                reference: reversalReference,
                metaRef: onusRef || transaction.externalReference,
                provider: 'payonus',
                providerReference: onusRef || transaction.externalReference,
                metadata: {
                  reversalOf: transaction.id,
                  providerStatus: input.providerStatus,
                  reason: 'payout_failed_or_reversed'
                }
              });
            } catch (mirrorError) {
              logger.warn('Failed to mirror payout reversal to app transactions', {
                transactionId: transaction.id,
                error: mirrorError instanceof Error ? mirrorError.message : 'Unknown error'
              });
            }

            if (wallet.walletType === 'USER' && reversalUserId) {
              void notifyTransactionReceipt(reversalTxn, wallet);
            }
          }
        } else {
          refunded = true;
          existingMeta.reversalTransactionId = existingReversal.id;
        }
      }

      const updatedMetadata: Record<string, unknown> = {
        ...existingMeta,
        providerStatus: input.providerStatus || existingMeta.providerStatus,
        payoutStatus: mappedStatus,
        statusUpdatedAt: nowIso,
        lastWebhookAt: nowIso,
        statusHistory,
        ...(isFailure ? { reversed: true } : {}),
        lastWebhookPayload: input.rawPayload ?? existingMeta.lastWebhookPayload
      };

      await db.updateTransaction(transaction.id, {
        metadata: updatedMetadata,
        ...(isFailure ? { status: TransactionStatus.FAILED } : {}),
        ...(onusRef && !transaction.externalReference ? { externalReference: onusRef } : {})
      });

      logger.info('Applied PayOnUs payout status update', {
        transactionId: transaction.id,
        walletId: transaction.walletId,
        previousStatus,
        newStatus: mappedStatus,
        refunded
      });

      if (category === 'PAYOUT') {
        const wallet = await db.getWalletById(transaction.walletId);
        if (wallet && wallet.walletType === 'USER' && 'userId' in wallet) {
          const userWallet = wallet as UserWallet;
          const meta = updatedMetadata;
          const savedBankAccountId = typeof meta.savedBankAccountId === 'string' ? meta.savedBankAccountId : undefined;
          const destinationBankName =
            typeof meta.destinationBankCode === 'string'
              ? String(meta.destinationBankCode)
              : typeof (meta.payout as Record<string, unknown> | undefined)?.destinationBankName === 'string'
                ? String((meta.payout as Record<string, unknown>).destinationBankName)
                : undefined;
          const destinationAccountLast4 =
            typeof meta.destinationAccountLast4 === 'string'
              ? meta.destinationAccountLast4
              : typeof (meta.payout as Record<string, unknown> | undefined)?.destinationAccountLast4 === 'string'
                ? String((meta.payout as Record<string, unknown>).destinationAccountLast4)
                : undefined;
          const destinationAccountName =
            typeof meta.destinationAccountName === 'string' ? meta.destinationAccountName : undefined;
          const payoutAmount = Math.abs(transaction.amount);
          const customerProfile = await fetchRetailUserProfile(userWallet.userId);
          const customerName = formatPersonName(
            customerProfile?.firstName,
            customerProfile?.lastName,
            destinationAccountName
          );

          void AppTransactionMirrorService.mirrorUserWalletPayout({
            appId: userWallet.appId,
            userId: userWallet.userId,
            walletId: userWallet.id,
            amount: payoutAmount,
            currency: userWallet.currency,
            reference: transaction.referenceId || transaction.id,
            providerReference: transaction.externalReference || transaction.referenceId,
            providerStatus: input.providerStatus,
            walletTransactionStatus: isFailure ? TransactionStatus.FAILED : transaction.status,
            reversed: isFailure,
            customerName,
            destinationBankName,
            destinationAccountLast4,
            metadata: {
              ...meta,
              walletTransactionId: transaction.id
            }
          });

          const payoutSucceeded =
            mappedStatus === 'SUCCESSFUL' && previousStatus !== 'SUCCESSFUL' && !isFailure;
          if (payoutSucceeded) {
            void notifyWalletBankPayout({
              event: 'completed',
              userId: userWallet.userId,
              merchantId: userWallet.merchantId,
              appId: userWallet.appId,
              amount: payoutAmount,
              currency: userWallet.currency,
              reference: transaction.referenceId || transaction.id,
              providerReference: transaction.externalReference,
              providerStatus: input.providerStatus,
              customerName,
              customerEmail: customerProfile?.email,
              destinationBankName,
              destinationAccountLast4,
              destinationAccountName,
              balanceAfter: userWallet.mainBalance,
              narration: transaction.description,
              walletTransactionId: transaction.id
            });
          }

          if (isFailure && previousStatus !== 'FAILED' && previousStatus !== 'REVERSED') {
            void notifyWalletBankPayout({
              event: 'failed',
              userId: userWallet.userId,
              merchantId: userWallet.merchantId,
              appId: userWallet.appId,
              amount: payoutAmount,
              currency: userWallet.currency,
              reference: transaction.referenceId || transaction.id,
              providerReference: transaction.externalReference,
              providerStatus: input.providerStatus,
              customerName,
              customerEmail: customerProfile?.email,
              destinationBankName,
              destinationAccountLast4,
              destinationAccountName,
              narration: transaction.description,
              walletTransactionId: transaction.id
            });
          }
        }
      }

      return {
        success: true,
        matched: true,
        refunded,
        status: mappedStatus,
        transactionId: transaction.id,
        walletId: transaction.walletId
      };
    } catch (error) {
      logger.error('Error applying PayOnUs payout status update', {
        error: error instanceof Error ? error.message : 'Unknown error',
        onusReference: input.onusReference,
        merchantReference: input.merchantReference
      });
      return { success: false, matched: false, error: 'Failed to apply payout status update' };
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
    appId?: string,
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
      const billingResult = await this.getMerchantWalletByType(
        transferData.merchantId,
        MerchantWalletType.BILLING,
        transferData.appId
      );
      if (!billingResult.success || !billingResult.wallet) {
        return {
          success: false,
          error: 'Billing wallet not found for merchant'
        };
      }

      // Get the KYC Wallet for this merchant
      const kycResult = await this.getMerchantWalletByType(
        transferData.merchantId,
        MerchantWalletType.KYC,
        transferData.appId
      );
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
    appId?: string,
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
      const kycResult = await this.getMerchantWalletByType(
        transferData.merchantId,
        MerchantWalletType.KYC,
        transferData.appId
      );
      if (!kycResult.success || !kycResult.wallet) {
        return {
          success: false,
          error: 'KYC wallet not found for merchant'
        };
      }

      // Get the Billing Wallet for this merchant
      const billingResult = await this.getMerchantWalletByType(
        transferData.merchantId,
        MerchantWalletType.BILLING,
        transferData.appId
      );
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
   * Get Billing Wallet for a merchant (optionally scoped to an app).
   */
  static async getBillingWallet(merchantId: string, appId?: string): Promise<{
    success: boolean;
    wallet?: MerchantWallet;
    error?: string;
  }> {
    return this.getMerchantWalletByType(merchantId, MerchantWalletType.BILLING, appId);
  }

  static buildBillingWalletFundingInstructions(
    wallet: MerchantWallet,
    requiredAmount: number
  ): {
    walletId: string;
    balance: number;
    currency: string;
    requiredAmount: number;
    shortfall: number;
    virtualNuban?: MerchantWallet['virtualNuban'];
    fundingHint: string;
  } {
    const balance = wallet.mainBalance ?? wallet.balance ?? 0;
    const shortfall = Math.max(0, requiredAmount - balance);
    const nuban = wallet.virtualNuban;
    const hasActiveNuban =
      nuban?.provisionStatus === 'active' && Boolean(nuban.accountNumber?.trim());

    let fundingHint =
      'Top up the merchant Billing wallet via bank transfer to cover platform monthly customer fees.';
    if (hasActiveNuban) {
      fundingHint = `Transfer ${wallet.currency} ${shortfall.toFixed(2)} to the Billing wallet account ${nuban!.accountNumber} (${nuban!.bankName || 'bank'}).`;
    }

    return {
      walletId: wallet.id,
      balance,
      currency: wallet.currency,
      requiredAmount,
      shortfall,
      ...(nuban ? { virtualNuban: nuban } : {}),
      fundingHint
    };
  }

  /**
   * Debit the app-scoped Billing wallet for monthly platform fees (per customer count).
   */
  static async chargeMonthlyCustomerBilling(data: {
    merchantId: string;
    appId: string;
    amount: number;
    description: string;
    referenceId: string;
    billingPeriod: string;
    customerCount: number;
    pricePerCustomer: number;
    appName?: string;
  }): Promise<{
    success: boolean;
    wallet?: MerchantWallet;
    transaction?: Transaction;
    duplicate?: boolean;
    insufficientFunds?: boolean;
    skippedZeroAmount?: boolean;
    fundingInstructions?: ReturnType<typeof WalletService.buildBillingWalletFundingInstructions>;
    error?: string;
  }> {
    try {
      const merchantId = data.merchantId.trim();
      const appId = data.appId.trim();
      const referenceId = data.referenceId.trim();
      const amount = data.amount;

      if (!merchantId || !appId || !referenceId || !data.billingPeriod.trim()) {
        return { success: false, error: 'merchantId, appId, billingPeriod, and referenceId are required' };
      }
      if (!Number.isFinite(amount) || amount < 0) {
        return { success: false, error: 'amount must be a non-negative finite number' };
      }
      if (amount === 0) {
        return { success: true, skippedZeroAmount: true, duplicate: false };
      }

      const billingResult = await this.getBillingWallet(merchantId, appId);
      if (!billingResult.success || !billingResult.wallet) {
        return { success: false, error: billingResult.error || 'Billing wallet not found for merchant app' };
      }

      const billingWallet = billingResult.wallet;
      if (billingWallet.status !== WalletStatus.ACTIVE) {
        return { success: false, error: 'Billing wallet is not active' };
      }

      const existing = await db.findCompletedTransactionByReference(billingWallet.id, referenceId);
      if (existing) {
        return {
          success: true,
          wallet: billingWallet,
          transaction: existing,
          duplicate: true
        };
      }

      if (billingWallet.mainBalance < amount) {
        return {
          success: false,
          insufficientFunds: true,
          wallet: billingWallet,
          fundingInstructions: this.buildBillingWalletFundingInstructions(billingWallet, amount),
          error: 'Insufficient balance in Billing wallet for monthly customer billing'
        };
      }

      const balanceBefore = billingWallet.mainBalance;
      const newBalance = balanceBefore - amount;
      await db.updateWalletBalance(billingWallet.id, {
        mainBalance: newBalance,
        ledgerBalance: billingWallet.ledgerBalance - amount
      });
      const transaction = await db.createTransaction({
        walletId: billingWallet.id,
        amount: -amount,
        type: TransactionType.DEBIT,
        status: TransactionStatus.COMPLETED,
        description: data.description,
        referenceId,
        balanceBefore,
        balanceAfter: newBalance,
        category: 'MONTHLY_CUSTOMER_BILLING',
        source: 'BILLING_MS',
        metadata: {
          merchantId,
          appId,
          billingPeriod: data.billingPeriod,
          customerCount: data.customerCount,
          pricePerCustomer: data.pricePerCustomer,
          ...(data.appName ? { appName: data.appName } : {})
        },
        tags: ['monthly-billing', 'merchant-billing-wallet', 'per-customer']
      });

      const updated = await db.getWalletById(billingWallet.id);
      logger.info('Monthly customer billing charged', {
        walletId: billingWallet.id,
        merchantId,
        appId,
        amount,
        customerCount: data.customerCount,
        billingPeriod: data.billingPeriod,
        referenceId
      });

      return {
        success: true,
        wallet: updated as MerchantWallet,
        transaction,
        duplicate: false
      };
    } catch (error) {
      logger.error('Error charging monthly customer billing', {
        error,
        merchantId: data.merchantId,
        appId: data.appId
      });
      return { success: false, error: 'Failed to charge monthly customer billing' };
    }
  }

  /**
   * Get KYC Wallet for a merchant (optionally scoped to an app).
   */
  static async getKycWallet(merchantId: string, appId?: string): Promise<{
    success: boolean;
    wallet?: MerchantWallet;
    error?: string;
  }> {
    return this.getMerchantWalletByType(merchantId, MerchantWalletType.KYC, appId);
  }

  static buildKycWalletFundingInstructions(
    wallet: MerchantWallet,
    requiredAmount: number
  ): {
    walletId: string;
    balance: number;
    currency: string;
    requiredAmount: number;
    shortfall: number;
    virtualNuban?: MerchantWallet['virtualNuban'];
    fundingHint: string;
  } {
    const balance = wallet.mainBalance ?? wallet.balance ?? 0;
    const shortfall = Math.max(0, requiredAmount - balance);
    const nuban = wallet.virtualNuban;
    const hasActiveNuban =
      nuban?.provisionStatus === 'active' && Boolean(nuban.accountNumber?.trim());

    let fundingHint =
      'Fund the merchant KYC wallet before customers can start verification. Transfer from the Billing wallet or top up via bank transfer.';
    if (hasActiveNuban) {
      fundingHint = `Transfer ${wallet.currency} ${shortfall.toFixed(2)} to the KYC wallet account ${nuban!.accountNumber} (${nuban!.bankName || 'bank'}), or move funds from the Billing wallet.`;
    }

    return {
      walletId: wallet.id,
      balance,
      currency: wallet.currency,
      requiredAmount,
      shortfall,
      ...(nuban ? { virtualNuban: nuban } : {}),
      fundingHint
    };
  }

  /**
   * Debit the app-scoped KYC wallet when a customer KYC link is created.
   */
  static async chargeKycLinkFee(data: {
    merchantId: string;
    appId: string;
    amount: number;
    description: string;
    referenceId: string;
    userId?: string;
  }): Promise<{
    success: boolean;
    wallet?: MerchantWallet;
    transaction?: Transaction;
    duplicate?: boolean;
    insufficientFunds?: boolean;
    fundingInstructions?: ReturnType<typeof WalletService.buildKycWalletFundingInstructions>;
    error?: string;
  }> {
    try {
      const merchantId = data.merchantId.trim();
      const appId = data.appId.trim();
      const referenceId = data.referenceId.trim();
      const amount = data.amount;

      if (!merchantId || !appId) {
        return { success: false, error: 'merchantId and appId are required' };
      }
      if (!referenceId) {
        return { success: false, error: 'referenceId is required' };
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        return { success: false, error: 'amount must be a positive finite number' };
      }

      const kycResult = await this.getKycWallet(merchantId, appId);
      if (!kycResult.success || !kycResult.wallet) {
        return { success: false, error: kycResult.error || 'KYC wallet not found for merchant app' };
      }

      const kycWallet = kycResult.wallet;
      if (kycWallet.status !== WalletStatus.ACTIVE) {
        return { success: false, error: 'KYC wallet is not active' };
      }

      const existing = await db.findCompletedTransactionByReference(kycWallet.id, referenceId);
      if (existing) {
        return {
          success: true,
          wallet: kycWallet,
          transaction: existing,
          duplicate: true
        };
      }

      if (kycWallet.mainBalance < amount) {
        return {
          success: false,
          insufficientFunds: true,
          wallet: kycWallet,
          fundingInstructions: this.buildKycWalletFundingInstructions(kycWallet, amount),
          error: 'Insufficient balance in KYC wallet for KYC link fee'
        };
      }

      const balanceBefore = kycWallet.mainBalance;
      const newBalance = balanceBefore - amount;
      await db.updateWalletBalance(kycWallet.id, {
        mainBalance: newBalance,
        ledgerBalance: kycWallet.ledgerBalance - amount
      });
      const transaction = await db.createTransaction({
        walletId: kycWallet.id,
        amount: -amount,
        type: TransactionType.DEBIT,
        status: TransactionStatus.COMPLETED,
        description: data.description,
        referenceId,
        balanceBefore,
        balanceAfter: newBalance,
        category: 'KYC_LINK_FEE',
        source: 'COMPLIANCE_MS',
        metadata: {
          merchantId,
          appId,
          ...(data.userId ? { userId: data.userId } : {})
        },
        tags: ['kyc-link', 'merchant-kyc-wallet']
      });

      const updated = await db.getWalletById(kycWallet.id);
      logger.info('KYC link fee charged', {
        walletId: kycWallet.id,
        merchantId,
        appId,
        amount,
        referenceId,
        userId: data.userId
      });

      return {
        success: true,
        wallet: updated as MerchantWallet,
        transaction,
        duplicate: false
      };
    } catch (error) {
      logger.error('Error charging KYC link fee', { error, merchantId: data.merchantId, appId: data.appId });
      return { success: false, error: 'Failed to charge KYC link fee' };
    }
  }

  /**
   * Refund a previously charged KYC link fee (e.g. when Fuspay link creation fails).
   */
  static async refundKycLinkFee(data: {
    merchantId: string;
    appId: string;
    amount: number;
    description: string;
    referenceId: string;
    originalReferenceId?: string;
    userId?: string;
  }): Promise<{
    success: boolean;
    wallet?: MerchantWallet;
    transaction?: Transaction;
    duplicate?: boolean;
    error?: string;
  }> {
    try {
      const merchantId = data.merchantId.trim();
      const appId = data.appId.trim();
      const referenceId = data.referenceId.trim();
      const amount = data.amount;

      if (!merchantId || !appId || !referenceId) {
        return { success: false, error: 'merchantId, appId, and referenceId are required' };
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        return { success: false, error: 'amount must be a positive finite number' };
      }

      const kycResult = await this.getKycWallet(merchantId, appId);
      if (!kycResult.success || !kycResult.wallet) {
        return { success: false, error: kycResult.error || 'KYC wallet not found for merchant app' };
      }

      const kycWallet = kycResult.wallet;
      if (kycWallet.status !== WalletStatus.ACTIVE) {
        return { success: false, error: 'KYC wallet is not active' };
      }

      const existing = await db.findCompletedTransactionByReference(kycWallet.id, referenceId);
      if (existing) {
        return {
          success: true,
          wallet: kycWallet,
          transaction: existing,
          duplicate: true
        };
      }

      const balanceBefore = kycWallet.mainBalance;
      const newBalance = balanceBefore + amount;
      await db.updateWalletBalance(kycWallet.id, {
        mainBalance: newBalance,
        ledgerBalance: kycWallet.ledgerBalance + amount
      });
      const transaction = await db.createTransaction({
        walletId: kycWallet.id,
        amount,
        type: TransactionType.CREDIT,
        status: TransactionStatus.COMPLETED,
        description: data.description,
        referenceId,
        balanceBefore,
        balanceAfter: newBalance,
        category: 'KYC_LINK_FEE_REFUND',
        source: 'COMPLIANCE_MS',
        metadata: {
          merchantId,
          appId,
          ...(data.originalReferenceId ? { originalReferenceId: data.originalReferenceId } : {}),
          ...(data.userId ? { userId: data.userId } : {})
        },
        tags: ['kyc-link', 'refund', 'merchant-kyc-wallet']
      });

      const updated = await db.getWalletById(kycWallet.id);
      logger.info('KYC link fee refunded', {
        walletId: kycWallet.id,
        merchantId,
        appId,
        amount,
        referenceId,
        userId: data.userId
      });

      return {
        success: true,
        wallet: updated as MerchantWallet,
        transaction,
        duplicate: false
      };
    } catch (error) {
      logger.error('Error refunding KYC link fee', { error, merchantId: data.merchantId, appId: data.appId });
      return { success: false, error: 'Failed to refund KYC link fee' };
    }
  }

  /**
   * Credit the app-scoped Repayment wallet (formerly "Settlement") when customer money or
   * merchant commission is collected.
   * External collections (PayOnUs, bank) credit Repayment only.
   * In-app collections optionally debit the user's PRIMARY wallet first.
   */
  static async collectToRepayment(data: SettlementCollectInput): Promise<{
    success: boolean;
    repaymentWallet?: MerchantWallet;
    /** @deprecated use repaymentWallet */
    settlementWallet?: MerchantWallet;
    userWallet?: UserWallet;
    repaymentTransaction?: Transaction;
    /** @deprecated use repaymentTransaction */
    settlementTransaction?: Transaction;
    userTransaction?: Transaction;
    transaction?: Transaction;
    wallet?: MerchantWallet;
    duplicate?: boolean;
    insufficientFunds?: boolean;
    error?: string;
  }> {
    try {
      const merchantId = data.merchantId.trim();
      const appId = data.appId?.trim() || undefined;
      const referenceId = data.referenceId.trim();
      const source = data.source?.trim() || REPAYMENT_COLLECTION_SOURCE;
      const amount = Number(data.amount);
      const debitUserWallet = data.debitUserWallet === true;

      if (!merchantId || !referenceId) {
        return { success: false, error: 'merchantId and referenceId are required' };
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        return { success: false, error: 'amount must be a positive number' };
      }
      if (debitUserWallet && !data.userId?.trim()) {
        return { success: false, error: 'userId is required when debitUserWallet is true' };
      }

      const repaymentResult = await this.getRepaymentWallet(merchantId, appId);
      if (!repaymentResult.success || !repaymentResult.wallet) {
        return { success: false, error: repaymentResult.error || 'Repayment wallet not found for merchant app' };
      }

      const repaymentWallet = repaymentResult.wallet;
      if (repaymentWallet.status !== WalletStatus.ACTIVE) {
        return { success: false, error: 'Repayment wallet is not active' };
      }
      if (data.currency && repaymentWallet.currency !== data.currency.toUpperCase()) {
        return {
          success: false,
          error: `Repayment wallet currency ${repaymentWallet.currency} does not match ${data.currency}`
        };
      }

      const existingTx = await db.findTransactionByExternalReferenceAndSource(referenceId, source);
      if (existingTx) {
        const existingWallet = await db.getWalletById(existingTx.walletId);
        const repayment =
          existingWallet &&
          (existingWallet as MerchantWallet).merchantWalletType != null
            ? (existingWallet as MerchantWallet)
            : repaymentWallet;
        return {
          success: true,
          repaymentWallet: repayment,
          settlementWallet: repayment,
          wallet: repayment,
          repaymentTransaction: existingTx,
          settlementTransaction: existingTx,
          transaction: existingTx,
          duplicate: true
        };
      }

      let userWallet: UserWallet | undefined;
      if (debitUserWallet) {
        const userId = data.userId!.trim();
        const foundUserWallet = await db.getUserWalletForMerchant(userId, merchantId);
        if (!foundUserWallet) {
          return { success: false, error: 'User wallet not found for merchant' };
        }
        if (foundUserWallet.status !== WalletStatus.ACTIVE) {
          return { success: false, error: 'User wallet is not active' };
        }
        if (data.currency && foundUserWallet.currency !== data.currency.toUpperCase()) {
          return {
            success: false,
            error: `User wallet currency ${foundUserWallet.currency} does not match ${data.currency}`
          };
        }
        if (foundUserWallet.mainBalance < amount) {
          return {
            success: false,
            insufficientFunds: true,
            repaymentWallet,
            settlementWallet: repaymentWallet,
            userWallet: foundUserWallet,
            error: 'Insufficient balance in user wallet for repayment collection'
          };
        }
        userWallet = foundUserWallet;
      }

      const description =
        data.description?.trim() ||
        `Repayment collection (${data.category})`;

      const repaymentBalanceBefore = repaymentWallet.mainBalance;
      const repaymentBalanceAfter = repaymentBalanceBefore + amount;

      if (userWallet) {
        const userBalanceBefore = userWallet.mainBalance;
        const userBalanceAfter = userBalanceBefore - amount;

        await db.updateWalletBalance(userWallet.id, {
          mainBalance: userBalanceAfter,
          ledgerBalance: userWallet.ledgerBalance - amount
        });
        await db.updateWalletBalance(repaymentWallet.id, {
          mainBalance: repaymentBalanceAfter,
          ledgerBalance: repaymentWallet.ledgerBalance + amount
        });

        const userTransaction = await db.createTransaction({
          walletId: userWallet.id,
          amount: -amount,
          type: TransactionType.DEBIT,
          status: TransactionStatus.COMPLETED,
          description: `Repayment collection: ${description}`,
          referenceId,
          balanceBefore: userBalanceBefore,
          balanceAfter: userBalanceAfter,
          category: data.category,
          source,
          externalReference: referenceId,
          metadata: {
            merchantId,
            appId,
            applicationId: data.applicationId,
            productId: data.productId,
            productType: data.productType,
            installmentNumber: data.installmentNumber,
            settlementWalletId: repaymentWallet.id,
            repaymentWalletId: repaymentWallet.id,
            ...(data.metadata ?? {})
          },
          tags: ['repayment-collection', 'settlement-collection', 'user-wallet-debit', data.category.toLowerCase()]
        });

        const repaymentTransaction = await db.createTransaction({
          walletId: repaymentWallet.id,
          amount,
          type: TransactionType.CREDIT,
          status: TransactionStatus.COMPLETED,
          description,
          referenceId,
          balanceBefore: repaymentBalanceBefore,
          balanceAfter: repaymentBalanceAfter,
          category: data.category,
          source,
          externalReference: referenceId,
          metadata: {
            merchantId,
            appId,
            userId: data.userId,
            applicationId: data.applicationId,
            productId: data.productId,
            productType: data.productType,
            installmentNumber: data.installmentNumber,
            userWalletId: userWallet.id,
            userTransactionId: userTransaction.id,
            currency: data.currency ?? repaymentWallet.currency,
            ...(data.metadata ?? {})
          },
          tags: ['repayment-collection', 'settlement-collection', 'settlement-credit', data.category.toLowerCase()]
        });

        const updatedRepayment = await db.getWalletById(repaymentWallet.id);
        const updatedUser = await db.getWalletById(userWallet.id);

        logger.info('Repayment collection completed with user wallet debit', {
          merchantId,
          appId,
          userId: data.userId,
          amount,
          referenceId,
          category: data.category
        });

        return {
          success: true,
          repaymentWallet: updatedRepayment as MerchantWallet,
          settlementWallet: updatedRepayment as MerchantWallet,
          wallet: updatedRepayment as MerchantWallet,
          userWallet: updatedUser as UserWallet,
          repaymentTransaction,
          settlementTransaction: repaymentTransaction,
          userTransaction,
          transaction: repaymentTransaction,
          duplicate: false
        };
      }

      await db.updateWalletBalance(repaymentWallet.id, {
        mainBalance: repaymentBalanceAfter,
        ledgerBalance: repaymentWallet.ledgerBalance + amount
      });

      const repaymentTransaction = await db.createTransaction({
        walletId: repaymentWallet.id,
        amount,
        type: TransactionType.CREDIT,
        status: TransactionStatus.COMPLETED,
        description,
        referenceId,
        balanceBefore: repaymentBalanceBefore,
        balanceAfter: repaymentBalanceAfter,
        category: data.category,
        source,
        externalReference: referenceId,
        metadata: {
          merchantId,
          appId,
          userId: data.userId,
          applicationId: data.applicationId,
          productId: data.productId,
          productType: data.productType,
          installmentNumber: data.installmentNumber,
          currency: data.currency ?? repaymentWallet.currency,
          ...(data.metadata ?? {})
        },
        tags: ['repayment-collection', 'settlement-collection', 'settlement-credit', data.category.toLowerCase()]
      });

      const updatedRepayment = await db.getWalletById(repaymentWallet.id);

      logger.info('Repayment wallet credited from external collection', {
        merchantId,
        appId,
        amount,
        referenceId,
        category: data.category,
        source
      });

      return {
        success: true,
        repaymentWallet: updatedRepayment as MerchantWallet,
        settlementWallet: updatedRepayment as MerchantWallet,
        wallet: updatedRepayment as MerchantWallet,
        repaymentTransaction,
        settlementTransaction: repaymentTransaction,
        transaction: repaymentTransaction,
        duplicate: false
      };
    } catch (error) {
      logger.error('Error collecting to repayment wallet', {
        error,
        merchantId: data.merchantId,
        referenceId: data.referenceId,
        category: data.category
      });
      return { success: false, error: 'Failed to collect to repayment wallet' };
    }
  }

  /** @deprecated use collectToRepayment */
  static async collectToSettlement(data: SettlementCollectInput) {
    return this.collectToRepayment(data);
  }

  /**
   * Commodity enrollment funding: debit user PRIMARY, credit storefront commission,
   * credit product creator SETTLEMENT with principal (crowdfunding pool).
   */
  static async collectCommodityPurchase(data: CommodityPurchaseCollectInput): Promise<{
    success: boolean;
    duplicate?: boolean;
    insufficientFunds?: boolean;
    totalAmount?: number;
    principalSettledOnCreator?: boolean;
    principalPendingExternalSettlement?: boolean;
    userWallet?: UserWallet;
    offeringSettlementWallet?: MerchantWallet;
    creatorSettlementWallet?: MerchantWallet;
    userTransaction?: Transaction;
    commissionTransaction?: Transaction;
    principalDepositTransaction?: Transaction;
    error?: string;
  }> {
    try {
      const userId = data.userId.trim();
      const offeringMerchantId = data.offeringMerchantId.trim();
      const offeringAppId = data.offeringAppId.trim();
      const creatorMerchantId = data.creatorMerchantId.trim();
      const creatorAppId = data.creatorAppId.trim();
      const referenceId = data.referenceId.trim();
      const productId = data.productId.trim();
      const baseAmount = Number(data.baseAmount);
      const commissionAmount = Number(data.commissionAmount);
      const source = COMMODITY_PURCHASE_SOURCE;
      const currency = data.currency?.trim().toUpperCase() || 'NGN';

      if (!userId || !offeringMerchantId || !offeringAppId || !creatorMerchantId || !creatorAppId || !referenceId || !productId) {
        return {
          success: false,
          error: 'userId, offeringMerchantId, offeringAppId, creatorMerchantId, creatorAppId, referenceId, and productId are required'
        };
      }
      if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
        return { success: false, error: 'baseAmount must be a positive number' };
      }
      if (!Number.isFinite(commissionAmount) || commissionAmount < 0) {
        return { success: false, error: 'commissionAmount must be zero or a positive number' };
      }

      const totalAmount = Math.round((baseAmount + commissionAmount) * 100) / 100;
      if (totalAmount <= 0) {
        return { success: false, error: 'total purchase amount must be positive' };
      }

      const existingTx = await db.findTransactionByExternalReferenceAndSource(referenceId, source);
      if (existingTx) {
        return { success: true, duplicate: true, totalAmount };
      }

      const userWallet = await db.getUserWalletForMerchant(userId, offeringMerchantId);
      if (!userWallet) {
        return { success: false, error: 'User wallet not found for merchant' };
      }
      if (userWallet.status !== WalletStatus.ACTIVE) {
        return { success: false, error: 'User wallet is not active' };
      }
      if (userWallet.currency !== currency) {
        return { success: false, error: `User wallet currency ${userWallet.currency} does not match ${currency}` };
      }
      if (userWallet.mainBalance < totalAmount) {
        return {
          success: false,
          insufficientFunds: true,
          userWallet,
          error: 'Insufficient balance in user wallet for commodity purchase'
        };
      }

      const offeringSettlementResult = await this.getSettlementWallet(offeringMerchantId, offeringAppId);
      if (!offeringSettlementResult.success || !offeringSettlementResult.wallet) {
        return { success: false, error: offeringSettlementResult.error || 'Offering settlement wallet not found' };
      }
      const offeringSettlement = offeringSettlementResult.wallet;
      if (offeringSettlement.status !== WalletStatus.ACTIVE) {
        return { success: false, error: 'Offering settlement wallet is not active' };
      }
      if (offeringSettlement.currency !== currency) {
        return { success: false, error: `Offering settlement currency ${offeringSettlement.currency} does not match ${currency}` };
      }

      const creatorSettlementResult = await this.getSettlementWallet(creatorMerchantId, creatorAppId);
      const creatorSettlement = creatorSettlementResult.wallet;
      const settlePrincipalOnCreator =
        creatorSettlementResult.success &&
        creatorSettlement &&
        creatorSettlement.status === WalletStatus.ACTIVE &&
        creatorSettlement.currency === currency;

      if (!settlePrincipalOnCreator) {
        if (!data.allowExternalPrincipalSettlement) {
          return {
            success: false,
            error:
              creatorSettlementResult.error ||
              'Product creator settlement wallet not found for commodity enrollment'
          };
        }
      }

      const userBalanceBefore = userWallet.mainBalance;
      const userBalanceAfter = userBalanceBefore - totalAmount;
      const offeringBalanceBefore = offeringSettlement.mainBalance;
      const offeringBalanceAfter = offeringBalanceBefore + commissionAmount;
      const creatorBalanceBefore = settlePrincipalOnCreator ? creatorSettlement!.mainBalance : 0;
      const creatorBalanceAfter = settlePrincipalOnCreator ? creatorBalanceBefore + baseAmount : creatorBalanceBefore;

      await db.updateWalletBalance(userWallet.id, {
        mainBalance: userBalanceAfter,
        ledgerBalance: userWallet.ledgerBalance - totalAmount
      });

      if (commissionAmount > 0) {
        await db.updateWalletBalance(offeringSettlement.id, {
          mainBalance: offeringBalanceAfter,
          ledgerBalance: offeringSettlement.ledgerBalance + commissionAmount
        });
      }

      if (settlePrincipalOnCreator) {
        await db.updateWalletBalance(creatorSettlement!.id, {
          mainBalance: creatorBalanceAfter,
          ledgerBalance: creatorSettlement!.ledgerBalance + baseAmount
        });
      }

      const sharedMetadata = {
        productId,
        productType: 'COMMODITY',
        offeringMerchantId,
        offeringAppId,
        creatorMerchantId,
        creatorAppId,
        baseAmount,
        commissionAmount,
        totalAmount,
        currency,
        principalSettledOnCreator: settlePrincipalOnCreator,
        principalPendingExternalSettlement: !settlePrincipalOnCreator,
        ...(data.metadata ?? {})
      };

      const userTransaction = await db.createTransaction({
        walletId: userWallet.id,
        amount: -totalAmount,
        type: TransactionType.DEBIT,
        status: TransactionStatus.COMPLETED,
        description: `Commodity purchase (total ${totalAmount} ${currency})`,
        referenceId,
        balanceBefore: userBalanceBefore,
        balanceAfter: userBalanceAfter,
        category: 'COMMODITY_PURCHASE',
        source,
        externalReference: referenceId,
        metadata: sharedMetadata,
        tags: ['commodity-purchase', 'user-wallet-debit']
      });

      let commissionTransaction: Transaction | undefined;
      if (commissionAmount > 0) {
        commissionTransaction = await db.createTransaction({
          walletId: offeringSettlement.id,
          amount: commissionAmount,
          type: TransactionType.CREDIT,
          status: TransactionStatus.COMPLETED,
          description: `Commodity merchant commission (${commissionAmount} ${currency})`,
          referenceId: `${referenceId}:commission`,
          balanceBefore: offeringBalanceBefore,
          balanceAfter: offeringBalanceAfter,
          category: 'COMMODITY_CHARGE',
          source,
          externalReference: referenceId,
          metadata: {
            ...sharedMetadata,
            userId,
            userWalletId: userWallet.id,
            userTransactionId: userTransaction.id
          },
          tags: ['commodity-purchase', 'settlement-credit', 'commodity_charge']
        });
      }

      let principalDepositTransaction: Transaction | undefined;
      if (settlePrincipalOnCreator) {
        principalDepositTransaction = await db.createTransaction({
          walletId: creatorSettlement!.id,
          amount: baseAmount,
          type: TransactionType.CREDIT,
          status: TransactionStatus.COMPLETED,
          description: `Commodity principal to creator settlement (${baseAmount} ${currency})`,
          referenceId: `${referenceId}:principal-deposit`,
          balanceBefore: creatorBalanceBefore,
          balanceAfter: creatorBalanceAfter,
          category: 'COMMODITY_DEPOSIT',
          source,
          externalReference: referenceId,
          metadata: {
            ...sharedMetadata,
            userId,
            userWalletId: userWallet.id,
            userTransactionId: userTransaction.id
          },
          tags: ['commodity-purchase', 'settlement-credit', 'commodity_deposit', 'creator-settlement']
        });
      }

      const updatedUser = await db.getWalletById(userWallet.id);
      const updatedOffering = commissionAmount > 0 ? await db.getWalletById(offeringSettlement.id) : offeringSettlement;
      const updatedCreator = settlePrincipalOnCreator ? await db.getWalletById(creatorSettlement!.id) : undefined;

      logger.info('Commodity purchase collected on Spring wallet', {
        userId,
        offeringMerchantId,
        creatorMerchantId,
        referenceId,
        totalAmount,
        baseAmount,
        commissionAmount,
        principalSettledOnCreator: settlePrincipalOnCreator
      });

      return {
        success: true,
        duplicate: false,
        totalAmount,
        principalSettledOnCreator: settlePrincipalOnCreator,
        principalPendingExternalSettlement: !settlePrincipalOnCreator,
        userWallet: updatedUser as UserWallet,
        offeringSettlementWallet: updatedOffering as MerchantWallet,
        creatorSettlementWallet: updatedCreator as MerchantWallet | undefined,
        userTransaction,
        commissionTransaction,
        principalDepositTransaction
      };
    } catch (error) {
      logger.error('Error collecting commodity purchase', { error, referenceId: data.referenceId });
      return { success: false, error: 'Failed to collect commodity purchase' };
    }
  }

  /**
   * Reverse a commodity purchase on Spring wallet-ms (compensation when Plata principal credit fails).
   */
  static async reverseCommodityPurchase(data: CommodityPurchaseCollectInput): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const referenceId = data.referenceId.trim();
      const source = COMMODITY_PURCHASE_SOURCE;
      const existingTx = await db.findTransactionByExternalReferenceAndSource(referenceId, source);
      if (!existingTx) {
        return { success: true };
      }

      const userId = data.userId.trim();
      const offeringMerchantId = data.offeringMerchantId.trim();
      const offeringAppId = data.offeringAppId.trim();
      const creatorMerchantId = data.creatorMerchantId.trim();
      const creatorAppId = data.creatorAppId.trim();
      const legacyIntegratorMerchantId = data.integratorMerchantId?.trim();
      const legacyIntegratorAppId = data.integratorAppId?.trim() || undefined;
      const baseAmount = Number(data.baseAmount);
      const commissionAmount = Number(data.commissionAmount);
      const totalAmount = Math.round((baseAmount + commissionAmount) * 100) / 100;
      const currency = data.currency?.trim().toUpperCase() || 'NGN';

      const userWallet = await db.getUserWalletForMerchant(userId, offeringMerchantId);
      const offeringSettlementResult = await this.getSettlementWallet(offeringMerchantId, offeringAppId);
      const creatorSettlementResult = await this.getSettlementWallet(creatorMerchantId, creatorAppId);
      const legacyIntegratorSettlementResult = legacyIntegratorMerchantId
        ? await this.getSettlementWallet(legacyIntegratorMerchantId, legacyIntegratorAppId)
        : { success: false as const, wallet: undefined };

      if (!userWallet || !offeringSettlementResult.wallet) {
        return { success: false, error: 'Wallets not found for commodity purchase reversal' };
      }

      const offeringSettlement = offeringSettlementResult.wallet;
      const principalWallet =
        creatorSettlementResult.wallet || legacyIntegratorSettlementResult.wallet || undefined;

      if (commissionAmount > 0 && offeringSettlement.mainBalance < commissionAmount) {
        return { success: false, error: 'Insufficient offering settlement balance for reversal' };
      }
      if (principalWallet && principalWallet.mainBalance < baseAmount) {
        return { success: false, error: 'Insufficient creator settlement balance for reversal' };
      }

      await db.updateWalletBalance(userWallet.id, {
        mainBalance: userWallet.mainBalance + totalAmount,
        ledgerBalance: userWallet.ledgerBalance + totalAmount
      });

      if (commissionAmount > 0) {
        await db.updateWalletBalance(offeringSettlement.id, {
          mainBalance: offeringSettlement.mainBalance - commissionAmount,
          ledgerBalance: offeringSettlement.ledgerBalance - commissionAmount
        });
      }

      if (principalWallet) {
        await db.updateWalletBalance(principalWallet.id, {
          mainBalance: principalWallet.mainBalance - baseAmount,
          ledgerBalance: principalWallet.ledgerBalance - baseAmount
        });
      }

      await db.createTransaction({
        walletId: userWallet.id,
        amount: totalAmount,
        type: TransactionType.CREDIT,
        status: TransactionStatus.COMPLETED,
        description: `Commodity purchase reversal (${totalAmount} ${currency})`,
        referenceId: `${referenceId}:reversal`,
        balanceBefore: userWallet.mainBalance,
        balanceAfter: userWallet.mainBalance + totalAmount,
        category: 'COMMODITY_PURCHASE_REVERSAL',
        source: `${source}-reversal`,
        externalReference: `${referenceId}:reversal`,
        metadata: { reversedReferenceId: referenceId },
        tags: ['commodity-purchase-reversal']
      });

      logger.info('Commodity purchase reversed on Spring wallet', { referenceId, userId });
      return { success: true };
    } catch (error) {
      logger.error('Error reversing commodity purchase', { error, referenceId: data.referenceId });
      return { success: false, error: 'Failed to reverse commodity purchase' };
    }
  }

  /**
   * Commodity maturity payout: debit creator SETTLEMENT (principal + interest), credit user PRIMARY.
   */
  static async payoutCommodityMaturity(data: {
    userId: string;
    offeringMerchantId: string;
    creatorMerchantId: string;
    creatorAppId: string;
    principalAmount: number;
    interestAmount: number;
    referenceId: string;
    applicationId: string;
    currency?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{
    success: boolean;
    duplicate?: boolean;
    totalPayout?: number;
    userWallet?: UserWallet;
    error?: string;
  }> {
    try {
      const userId = data.userId.trim();
      const offeringMerchantId = data.offeringMerchantId.trim();
      const creatorMerchantId = data.creatorMerchantId.trim();
      const creatorAppId = data.creatorAppId.trim();
      const referenceId = data.referenceId.trim();
      const principalAmount = Number(data.principalAmount);
      const interestAmount = Number(data.interestAmount);
      const currency = data.currency?.trim().toUpperCase() || 'NGN';
      const source = COMMODITY_MATURITY_PAYOUT_SOURCE;

      if (!userId || !offeringMerchantId || !creatorMerchantId || !creatorAppId || !referenceId || !data.applicationId.trim()) {
        return {
          success: false,
          error: 'userId, offeringMerchantId, creatorMerchantId, creatorAppId, referenceId, and applicationId are required'
        };
      }
      if (!Number.isFinite(principalAmount) || principalAmount <= 0) {
        return { success: false, error: 'principalAmount must be a positive number' };
      }
      if (!Number.isFinite(interestAmount) || interestAmount < 0) {
        return { success: false, error: 'interestAmount must be zero or a positive number' };
      }

      const totalPayout = Math.round((principalAmount + interestAmount) * 100) / 100;
      if (totalPayout <= 0) {
        return { success: false, error: 'total payout must be positive' };
      }

      const existingTx = await db.findTransactionByExternalReferenceAndSource(referenceId, source);
      if (existingTx) {
        return { success: true, duplicate: true, totalPayout };
      }

      const userWallet = await db.getUserWalletForMerchant(userId, offeringMerchantId);
      if (!userWallet) {
        return { success: false, error: 'User wallet not found for merchant' };
      }
      if (userWallet.status !== WalletStatus.ACTIVE) {
        return { success: false, error: 'User wallet is not active' };
      }
      if (userWallet.currency !== currency) {
        return { success: false, error: `User wallet currency ${userWallet.currency} does not match ${currency}` };
      }

      const creatorSettlementResult = await this.getSettlementWallet(creatorMerchantId, creatorAppId);
      if (!creatorSettlementResult.success || !creatorSettlementResult.wallet) {
        return { success: false, error: creatorSettlementResult.error || 'Creator settlement wallet not found' };
      }
      const creatorSettlement = creatorSettlementResult.wallet;
      if (creatorSettlement.status !== WalletStatus.ACTIVE) {
        return { success: false, error: 'Creator settlement wallet is not active' };
      }
      if (creatorSettlement.currency !== currency) {
        return { success: false, error: `Creator settlement currency ${creatorSettlement.currency} does not match ${currency}` };
      }
      if (creatorSettlement.mainBalance < totalPayout) {
        return { success: false, error: 'Insufficient creator settlement balance for commodity maturity payout' };
      }

      const userBalanceBefore = userWallet.mainBalance;
      const userBalanceAfter = userBalanceBefore + totalPayout;
      const creatorBalanceBefore = creatorSettlement.mainBalance;
      const creatorBalanceAfter = creatorBalanceBefore - totalPayout;

      await db.updateWalletBalance(userWallet.id, {
        mainBalance: userBalanceAfter,
        ledgerBalance: userWallet.ledgerBalance + totalPayout
      });

      await db.updateWalletBalance(creatorSettlement.id, {
        mainBalance: creatorBalanceAfter,
        ledgerBalance: creatorSettlement.ledgerBalance - totalPayout
      });

      await db.createTransaction({
        walletId: creatorSettlement.id,
        amount: -totalPayout,
        type: TransactionType.DEBIT,
        status: TransactionStatus.COMPLETED,
        description: `Commodity maturity payout (${totalPayout} ${currency})`,
        referenceId: `${referenceId}:creator-debit`,
        balanceBefore: creatorBalanceBefore,
        balanceAfter: creatorBalanceAfter,
        category: 'COMMODITY_MATURITY_PAYOUT',
        source,
        externalReference: referenceId,
        metadata: {
          userId,
          applicationId: data.applicationId,
          principalAmount,
          interestAmount,
          totalPayout,
          currency,
          ...(data.metadata ?? {})
        },
        tags: ['commodity-maturity-payout', 'creator-settlement-debit']
      });

      await db.createTransaction({
        walletId: userWallet.id,
        amount: totalPayout,
        type: TransactionType.CREDIT,
        status: TransactionStatus.COMPLETED,
        description: `Commodity maturity payout (${totalPayout} ${currency})`,
        referenceId,
        balanceBefore: userBalanceBefore,
        balanceAfter: userBalanceAfter,
        category: 'COMMODITY_MATURITY_PAYOUT',
        source,
        externalReference: referenceId,
        metadata: {
          applicationId: data.applicationId,
          principalAmount,
          interestAmount,
          totalPayout,
          currency,
          ...(data.metadata ?? {})
        },
        tags: ['commodity-maturity-payout', 'user-wallet-credit']
      });

      const updatedUser = await db.getWalletById(userWallet.id);
      logger.info('Commodity maturity payout completed', { userId, referenceId, totalPayout });
      return {
        success: true,
        duplicate: false,
        totalPayout,
        userWallet: updatedUser as UserWallet
      };
    } catch (error) {
      logger.error('Error paying commodity maturity', { error, referenceId: data.referenceId });
      return { success: false, error: 'Failed to pay commodity maturity payout' };
    }
  }

  /**
   * Investment apply: debit user PRIMARY for full principal; credit offering SETTLEMENT (commission);
   * credit integrator SETTLEMENT (creator principal hold for Plata product creator settlement).
   */
  static async collectInvestmentPurchase(data: InvestmentPurchaseCollectInput): Promise<{
    success: boolean;
    duplicate?: boolean;
    insufficientFunds?: boolean;
    principalAmount?: number;
    userWallet?: UserWallet;
    offeringSettlementWallet?: MerchantWallet;
    integratorSettlementWallet?: MerchantWallet;
    userTransaction?: Transaction;
    commissionTransaction?: Transaction;
    principalHoldTransaction?: Transaction;
    error?: string;
  }> {
    try {
      const userId = data.userId.trim();
      const offeringMerchantId = data.offeringMerchantId.trim();
      const offeringAppId = data.offeringAppId.trim();
      const integratorMerchantId = data.integratorMerchantId.trim();
      const integratorAppId = data.integratorAppId?.trim() || undefined;
      const referenceId = data.referenceId.trim();
      const productId = data.productId.trim();
      const principalAmount = Number(data.principalAmount);
      const commissionAmount = Number(data.commissionAmount);
      const creatorPrincipalAmount = Number(data.creatorPrincipalAmount);
      const source = INVESTMENT_PURCHASE_SOURCE;
      const currency = data.currency?.trim().toUpperCase() || 'NGN';

      if (!userId || !offeringMerchantId || !offeringAppId || !integratorMerchantId || !referenceId || !productId) {
        return {
          success: false,
          error:
            'userId, offeringMerchantId, offeringAppId, integratorMerchantId, referenceId, and productId are required'
        };
      }
      if (!Number.isFinite(principalAmount) || principalAmount <= 0) {
        return { success: false, error: 'principalAmount must be a positive number' };
      }
      if (!Number.isFinite(commissionAmount) || commissionAmount < 0) {
        return { success: false, error: 'commissionAmount must be zero or a positive number' };
      }
      if (!Number.isFinite(creatorPrincipalAmount) || creatorPrincipalAmount < 0) {
        return { success: false, error: 'creatorPrincipalAmount must be zero or a positive number' };
      }
      const expectedCreatorPrincipal = Math.round((principalAmount - commissionAmount) * 100) / 100;
      if (Math.abs(expectedCreatorPrincipal - creatorPrincipalAmount) > 0.01) {
        return {
          success: false,
          error: 'creatorPrincipalAmount must equal principalAmount minus commissionAmount'
        };
      }
      if (commissionAmount + creatorPrincipalAmount > principalAmount + 0.01) {
        return { success: false, error: 'commission and creator principal cannot exceed investment principal' };
      }

      const existingTx = await db.findTransactionByExternalReferenceAndSource(referenceId, source);
      if (existingTx) {
        return { success: true, duplicate: true, principalAmount };
      }

      const userWallet = await db.getUserWalletForMerchant(userId, offeringMerchantId);
      if (!userWallet) {
        return { success: false, error: 'User wallet not found for merchant' };
      }
      if (userWallet.status !== WalletStatus.ACTIVE) {
        return { success: false, error: 'User wallet is not active' };
      }
      if (userWallet.currency !== currency) {
        return { success: false, error: `User wallet currency ${userWallet.currency} does not match ${currency}` };
      }
      if (userWallet.mainBalance < principalAmount) {
        return {
          success: false,
          insufficientFunds: true,
          userWallet,
          error: 'Insufficient balance in user wallet for investment'
        };
      }

      const offeringSettlementResult = await this.getSettlementWallet(offeringMerchantId, offeringAppId);
      if (!offeringSettlementResult.success || !offeringSettlementResult.wallet) {
        return { success: false, error: offeringSettlementResult.error || 'Offering settlement wallet not found' };
      }
      const offeringSettlement = offeringSettlementResult.wallet;
      if (offeringSettlement.status !== WalletStatus.ACTIVE) {
        return { success: false, error: 'Offering settlement wallet is not active' };
      }
      if (offeringSettlement.currency !== currency) {
        return {
          success: false,
          error: `Offering settlement currency ${offeringSettlement.currency} does not match ${currency}`
        };
      }

      const integratorSettlementResult = await this.getSettlementWallet(integratorMerchantId, integratorAppId);
      if (!integratorSettlementResult.success || !integratorSettlementResult.wallet) {
        return {
          success: false,
          error: integratorSettlementResult.error || 'Integrator settlement wallet not found for principal hold'
        };
      }
      const integratorSettlement = integratorSettlementResult.wallet;
      if (integratorSettlement.status !== WalletStatus.ACTIVE) {
        return { success: false, error: 'Integrator settlement wallet is not active' };
      }
      if (integratorSettlement.currency !== currency) {
        return {
          success: false,
          error: `Integrator settlement currency ${integratorSettlement.currency} does not match ${currency}`
        };
      }

      const userBalanceBefore = userWallet.mainBalance;
      const userBalanceAfter = userBalanceBefore - principalAmount;
      const offeringBalanceBefore = offeringSettlement.mainBalance;
      const offeringBalanceAfter = offeringBalanceBefore + commissionAmount;
      const integratorBalanceBefore = integratorSettlement.mainBalance;
      const integratorBalanceAfter = integratorBalanceBefore + creatorPrincipalAmount;

      await db.updateWalletBalance(userWallet.id, {
        mainBalance: userBalanceAfter,
        ledgerBalance: userWallet.ledgerBalance - principalAmount
      });

      if (commissionAmount > 0) {
        await db.updateWalletBalance(offeringSettlement.id, {
          mainBalance: offeringBalanceAfter,
          ledgerBalance: offeringSettlement.ledgerBalance + commissionAmount
        });
      }

      if (creatorPrincipalAmount > 0) {
        await db.updateWalletBalance(integratorSettlement.id, {
          mainBalance: integratorBalanceAfter,
          ledgerBalance: integratorSettlement.ledgerBalance + creatorPrincipalAmount
        });
      }

      const sharedMetadata = {
        productId,
        productType: 'INVESTMENT',
        applicationId: data.applicationId,
        offeringMerchantId,
        offeringAppId,
        integratorMerchantId,
        integratorAppId,
        creatorMerchantId: data.creatorMerchantId,
        creatorAppId: data.creatorAppId,
        principalAmount,
        commissionAmount,
        creatorPrincipalAmount,
        currency,
        ...(data.metadata ?? {})
      };

      const userTransaction = await db.createTransaction({
        walletId: userWallet.id,
        amount: -principalAmount,
        type: TransactionType.DEBIT,
        status: TransactionStatus.COMPLETED,
        description: `Investment principal (${principalAmount} ${currency})`,
        referenceId,
        balanceBefore: userBalanceBefore,
        balanceAfter: userBalanceAfter,
        category: 'INVESTMENT_PURCHASE',
        source,
        externalReference: referenceId,
        metadata: sharedMetadata,
        tags: ['investment-purchase', 'user-wallet-debit']
      });

      let commissionTransaction: Transaction | undefined;
      if (commissionAmount > 0) {
        commissionTransaction = await db.createTransaction({
          walletId: offeringSettlement.id,
          amount: commissionAmount,
          type: TransactionType.CREDIT,
          status: TransactionStatus.COMPLETED,
          description: `Investment merchant commission (${commissionAmount} ${currency})`,
          referenceId: `${referenceId}:commission`,
          balanceBefore: offeringBalanceBefore,
          balanceAfter: offeringBalanceAfter,
          category: 'INVESTMENT_CHARGE',
          source,
          externalReference: referenceId,
          metadata: {
            ...sharedMetadata,
            userId,
            userWalletId: userWallet.id,
            userTransactionId: userTransaction.id
          },
          tags: ['investment-purchase', 'settlement-credit', 'investment_charge']
        });
      }

      let principalHoldTransaction: Transaction | undefined;
      if (creatorPrincipalAmount > 0) {
        principalHoldTransaction = await db.createTransaction({
          walletId: integratorSettlement.id,
          amount: creatorPrincipalAmount,
          type: TransactionType.CREDIT,
          status: TransactionStatus.COMPLETED,
          description: `Investment principal hold for Plata creator (${creatorPrincipalAmount} ${currency})`,
          referenceId: `${referenceId}:principal-hold`,
          balanceBefore: integratorBalanceBefore,
          balanceAfter: integratorBalanceAfter,
          category: 'INVESTMENT_DEPOSIT',
          source,
          externalReference: referenceId,
          metadata: {
            ...sharedMetadata,
            userId,
            userWalletId: userWallet.id,
            userTransactionId: userTransaction.id,
            principalSettlementPending: true
          },
          tags: ['investment-purchase', 'settlement-credit', 'investment_deposit', 'principal-hold']
        });
      }

      const updatedUser = await db.getWalletById(userWallet.id);
      const updatedOffering =
        commissionAmount > 0 ? await db.getWalletById(offeringSettlement.id) : offeringSettlement;
      const updatedIntegrator =
        creatorPrincipalAmount > 0 ? await db.getWalletById(integratorSettlement.id) : integratorSettlement;

      logger.info('Investment purchase collected on Spring wallet', {
        userId,
        offeringMerchantId,
        referenceId,
        principalAmount,
        commissionAmount,
        creatorPrincipalAmount
      });

      return {
        success: true,
        duplicate: false,
        principalAmount,
        userWallet: updatedUser as UserWallet,
        offeringSettlementWallet: updatedOffering as MerchantWallet,
        integratorSettlementWallet: updatedIntegrator as MerchantWallet,
        userTransaction,
        commissionTransaction,
        principalHoldTransaction
      };
    } catch (error) {
      logger.error('Error collecting investment purchase', { error, referenceId: data.referenceId });
      return { success: false, error: 'Failed to collect investment purchase' };
    }
  }

  static async reverseInvestmentPurchase(data: InvestmentPurchaseCollectInput): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const referenceId = data.referenceId.trim();
      const source = INVESTMENT_PURCHASE_SOURCE;
      const existingTx = await db.findTransactionByExternalReferenceAndSource(referenceId, source);
      if (!existingTx) {
        return { success: true };
      }

      const userId = data.userId.trim();
      const offeringMerchantId = data.offeringMerchantId.trim();
      const offeringAppId = data.offeringAppId.trim();
      const integratorMerchantId = data.integratorMerchantId.trim();
      const integratorAppId = data.integratorAppId?.trim() || undefined;
      const principalAmount = Number(data.principalAmount);
      const commissionAmount = Number(data.commissionAmount);
      const creatorPrincipalAmount = Number(data.creatorPrincipalAmount);
      const currency = data.currency?.trim().toUpperCase() || 'NGN';

      const userWallet = await db.getUserWalletForMerchant(userId, offeringMerchantId);
      const offeringSettlementResult = await this.getSettlementWallet(offeringMerchantId, offeringAppId);
      const integratorSettlementResult = await this.getSettlementWallet(integratorMerchantId, integratorAppId);

      if (!userWallet || !offeringSettlementResult.wallet || !integratorSettlementResult.wallet) {
        return { success: false, error: 'Wallets not found for investment purchase reversal' };
      }

      const offeringSettlement = offeringSettlementResult.wallet;
      const integratorSettlement = integratorSettlementResult.wallet;

      if (commissionAmount > 0 && offeringSettlement.mainBalance < commissionAmount) {
        return { success: false, error: 'Insufficient offering settlement balance for reversal' };
      }
      if (creatorPrincipalAmount > 0 && integratorSettlement.mainBalance < creatorPrincipalAmount) {
        return { success: false, error: 'Insufficient integrator settlement balance for reversal' };
      }

      await db.updateWalletBalance(userWallet.id, {
        mainBalance: userWallet.mainBalance + principalAmount,
        ledgerBalance: userWallet.ledgerBalance + principalAmount
      });

      if (commissionAmount > 0) {
        await db.updateWalletBalance(offeringSettlement.id, {
          mainBalance: offeringSettlement.mainBalance - commissionAmount,
          ledgerBalance: offeringSettlement.ledgerBalance - commissionAmount
        });
      }

      if (creatorPrincipalAmount > 0) {
        await db.updateWalletBalance(integratorSettlement.id, {
          mainBalance: integratorSettlement.mainBalance - creatorPrincipalAmount,
          ledgerBalance: integratorSettlement.ledgerBalance - creatorPrincipalAmount
        });
      }

      await db.createTransaction({
        walletId: userWallet.id,
        amount: principalAmount,
        type: TransactionType.CREDIT,
        status: TransactionStatus.COMPLETED,
        description: `Investment purchase reversal (${principalAmount} ${currency})`,
        referenceId: `${referenceId}:reversal`,
        balanceBefore: userWallet.mainBalance,
        balanceAfter: userWallet.mainBalance + principalAmount,
        category: 'INVESTMENT_PURCHASE_REVERSAL',
        source: `${source}-reversal`,
        externalReference: `${referenceId}:reversal`,
        metadata: { reversedReferenceId: referenceId },
        tags: ['investment-purchase-reversal']
      });

      logger.info('Investment purchase reversed on Spring wallet', { referenceId, userId });
      return { success: true };
    } catch (error) {
      logger.error('Error reversing investment purchase', { error, referenceId: data.referenceId });
      return { success: false, error: 'Failed to reverse investment purchase' };
    }
  }

  /**
   * Savings deposit: debit user PRIMARY for full amount; credit integrator SETTLEMENT (0% commission v1).
   */
  static async collectSavingsPurchase(data: SavingsPurchaseCollectInput): Promise<{
    success: boolean;
    duplicate?: boolean;
    insufficientFunds?: boolean;
    principalAmount?: number;
    userWallet?: UserWallet;
    integratorSettlementWallet?: MerchantWallet;
    userTransaction?: Transaction;
    principalHoldTransaction?: Transaction;
    error?: string;
  }> {
    try {
      const userId = data.userId.trim();
      const offeringMerchantId = data.offeringMerchantId.trim();
      const offeringAppId = data.offeringAppId.trim();
      const integratorMerchantId = data.integratorMerchantId.trim();
      const integratorAppId = data.integratorAppId?.trim() || undefined;
      const referenceId = data.referenceId.trim();
      const productId = data.productId.trim();
      const principalAmount = Number(data.principalAmount);
      const source = SAVINGS_PURCHASE_SOURCE;
      const currency = data.currency?.trim().toUpperCase() || 'NGN';

      if (!userId || !offeringMerchantId || !offeringAppId || !integratorMerchantId || !referenceId || !productId) {
        return {
          success: false,
          error:
            'userId, offeringMerchantId, offeringAppId, integratorMerchantId, referenceId, and productId are required'
        };
      }
      if (!Number.isFinite(principalAmount) || principalAmount <= 0) {
        return { success: false, error: 'principalAmount must be a positive number' };
      }

      const existingTx = await db.findTransactionByExternalReferenceAndSource(referenceId, source);
      if (existingTx) {
        return { success: true, duplicate: true, principalAmount };
      }

      const userWallet = await db.getUserWalletForMerchant(userId, offeringMerchantId);
      if (!userWallet) {
        return { success: false, error: 'User wallet not found for merchant' };
      }
      if (userWallet.status !== WalletStatus.ACTIVE) {
        return { success: false, error: 'User wallet is not active' };
      }
      if (userWallet.currency !== currency) {
        return { success: false, error: `User wallet currency ${userWallet.currency} does not match ${currency}` };
      }
      if (userWallet.mainBalance < principalAmount) {
        return {
          success: false,
          insufficientFunds: true,
          userWallet,
          error: 'Insufficient balance in user wallet for savings deposit'
        };
      }

      const integratorSettlementResult = await this.getSettlementWallet(integratorMerchantId, integratorAppId);
      if (!integratorSettlementResult.success || !integratorSettlementResult.wallet) {
        return {
          success: false,
          error: integratorSettlementResult.error || 'Integrator settlement wallet not found for principal hold'
        };
      }
      const integratorSettlement = integratorSettlementResult.wallet;
      if (integratorSettlement.status !== WalletStatus.ACTIVE) {
        return { success: false, error: 'Integrator settlement wallet is not active' };
      }
      if (integratorSettlement.currency !== currency) {
        return {
          success: false,
          error: `Integrator settlement currency ${integratorSettlement.currency} does not match ${currency}`
        };
      }

      const userBalanceBefore = userWallet.mainBalance;
      const userBalanceAfter = userBalanceBefore - principalAmount;
      const integratorBalanceBefore = integratorSettlement.mainBalance;
      const integratorBalanceAfter = integratorBalanceBefore + principalAmount;

      await db.updateWalletBalance(userWallet.id, {
        mainBalance: userBalanceAfter,
        ledgerBalance: userWallet.ledgerBalance - principalAmount
      });
      await db.updateWalletBalance(integratorSettlement.id, {
        mainBalance: integratorBalanceAfter,
        ledgerBalance: integratorSettlement.ledgerBalance + principalAmount
      });

      const sharedMetadata = {
        productId,
        productType: 'SAVINGS',
        applicationId: data.applicationId,
        offeringMerchantId,
        offeringAppId,
        integratorMerchantId,
        integratorAppId,
        creatorMerchantId: data.creatorMerchantId,
        creatorAppId: data.creatorAppId,
        principalAmount,
        currency,
        ...(data.metadata ?? {})
      };

      const userTransaction = await db.createTransaction({
        walletId: userWallet.id,
        amount: -principalAmount,
        type: TransactionType.DEBIT,
        status: TransactionStatus.COMPLETED,
        description: `Savings deposit (${principalAmount} ${currency})`,
        referenceId,
        balanceBefore: userBalanceBefore,
        balanceAfter: userBalanceAfter,
        category: 'SAVINGS_DEPOSIT',
        source,
        externalReference: referenceId,
        metadata: sharedMetadata,
        tags: ['savings-deposit', 'user-wallet-debit']
      });

      const principalHoldTransaction = await db.createTransaction({
        walletId: integratorSettlement.id,
        amount: principalAmount,
        type: TransactionType.CREDIT,
        status: TransactionStatus.COMPLETED,
        description: `Savings principal hold for Plata creator (${principalAmount} ${currency})`,
        referenceId: `${referenceId}:principal-hold`,
        balanceBefore: integratorBalanceBefore,
        balanceAfter: integratorBalanceAfter,
        category: 'SAVINGS_DEPOSIT',
        source,
        externalReference: referenceId,
        metadata: {
          ...sharedMetadata,
          userId,
          userWalletId: userWallet.id,
          userTransactionId: userTransaction.id,
          principalSettlementPending: true
        },
        tags: ['savings-deposit', 'settlement-credit', 'principal-hold']
      });

      const updatedUser = await db.getWalletById(userWallet.id);
      const updatedIntegrator = await db.getWalletById(integratorSettlement.id);

      logger.info('Savings deposit collected on Spring wallet', {
        userId,
        offeringMerchantId,
        referenceId,
        principalAmount
      });

      return {
        success: true,
        duplicate: false,
        principalAmount,
        userWallet: updatedUser as UserWallet,
        integratorSettlementWallet: updatedIntegrator as MerchantWallet,
        userTransaction,
        principalHoldTransaction
      };
    } catch (error) {
      logger.error('Error collecting savings purchase', { error, referenceId: data.referenceId });
      return { success: false, error: 'Failed to collect savings deposit' };
    }
  }

  static async reverseSavingsPurchase(data: SavingsPurchaseCollectInput): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const referenceId = data.referenceId.trim();
      const source = SAVINGS_PURCHASE_SOURCE;
      const existingTx = await db.findTransactionByExternalReferenceAndSource(referenceId, source);
      if (!existingTx) {
        return { success: true };
      }

      const userId = data.userId.trim();
      const offeringMerchantId = data.offeringMerchantId.trim();
      const integratorMerchantId = data.integratorMerchantId.trim();
      const integratorAppId = data.integratorAppId?.trim() || undefined;
      const principalAmount = Number(data.principalAmount);
      const currency = data.currency?.trim().toUpperCase() || 'NGN';

      const userWallet = await db.getUserWalletForMerchant(userId, offeringMerchantId);
      const integratorSettlementResult = await this.getSettlementWallet(integratorMerchantId, integratorAppId);

      if (!userWallet || !integratorSettlementResult.wallet) {
        return { success: false, error: 'Wallets not found for savings deposit reversal' };
      }

      const integratorSettlement = integratorSettlementResult.wallet;
      if (integratorSettlement.mainBalance < principalAmount) {
        return { success: false, error: 'Insufficient integrator settlement balance for reversal' };
      }

      await db.updateWalletBalance(userWallet.id, {
        mainBalance: userWallet.mainBalance + principalAmount,
        ledgerBalance: userWallet.ledgerBalance + principalAmount
      });
      await db.updateWalletBalance(integratorSettlement.id, {
        mainBalance: integratorSettlement.mainBalance - principalAmount,
        ledgerBalance: integratorSettlement.ledgerBalance - principalAmount
      });

      await db.createTransaction({
        walletId: userWallet.id,
        amount: principalAmount,
        type: TransactionType.CREDIT,
        status: TransactionStatus.COMPLETED,
        description: `Savings deposit reversal (${principalAmount} ${currency})`,
        referenceId: `${referenceId}:reversal`,
        balanceBefore: userWallet.mainBalance,
        balanceAfter: userWallet.mainBalance + principalAmount,
        category: 'SAVINGS_DEPOSIT_REVERSAL',
        source: `${source}-reversal`,
        externalReference: `${referenceId}:reversal`,
        metadata: { reversedReferenceId: referenceId },
        tags: ['savings-deposit-reversal']
      });

      logger.info('Savings deposit reversed on Spring wallet', { referenceId, userId });
      return { success: true };
    } catch (error) {
      logger.error('Error reversing savings deposit', { error, referenceId: data.referenceId });
      return { success: false, error: 'Failed to reverse savings deposit' };
    }
  }

  /**
   * Payout from the merchant Repayment wallet (formerly "Settlement") to an external bank account via PayOnUs.
   */
  static async payoutRepaymentWalletToBank(payoutData: {
    merchantId: string;
    appId?: string;
    accountNumber: string;
    bankCode: string;
    accountName: string;
    bankName?: string;
    amount: number;
    currency?: string;
    narration?: string;
    reference?: string;
  }): Promise<{
    success: boolean;
    wallet?: MerchantWallet;
    transaction?: Transaction;
    providerReference?: string;
    providerStatus?: string;
    payoutReference?: string;
    duplicate?: boolean;
    error?: string;
  }> {
    try {
      const merchantId = payoutData.merchantId.trim();
      const appId = payoutData.appId?.trim() || undefined;
      const amount = Number(payoutData.amount);

      if (!merchantId) {
        return { success: false, error: 'merchantId is required' };
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        return { success: false, error: 'amount must be a positive number' };
      }

      const repaymentResult = await this.getRepaymentWallet(merchantId, appId);
      if (!repaymentResult.success || !repaymentResult.wallet) {
        return { success: false, error: repaymentResult.error || 'Repayment wallet not found for merchant app' };
      }

      const repaymentWallet = repaymentResult.wallet;
      if (repaymentWallet.status !== WalletStatus.ACTIVE) {
        return { success: false, error: 'Repayment wallet is not active' };
      }

      const currency = (payoutData.currency || repaymentWallet.currency).toUpperCase();
      if (currency !== repaymentWallet.currency.toUpperCase()) {
        return { success: false, error: 'Payout currency must match repayment wallet currency' };
      }

      const sourceAccountNumber = repaymentWallet.virtualNuban?.accountNumber;
      if (repaymentWallet.virtualNuban?.provisionStatus !== 'active' || !sourceAccountNumber) {
        return { success: false, error: 'Repayment PayOnUs virtual account is not active' };
      }

      if (repaymentWallet.mainBalance < amount) {
        return { success: false, error: 'Insufficient balance in Repayment wallet' };
      }

      const payoutReference =
        payoutData.reference?.trim() ||
        `repayment-payout:${repaymentWallet.id}:${Date.now()}`;

      const existingPayout = await db.findCompletedTransactionByReference(
        repaymentWallet.id,
        payoutReference
      );
      if (existingPayout) {
        const wallet = await db.getWalletById(repaymentWallet.id);
        return {
          success: true,
          wallet: (wallet as MerchantWallet | null) ?? repaymentWallet,
          transaction: existingPayout,
          payoutReference,
          providerReference: existingPayout.externalReference,
          duplicate: true
        };
      }

      const narration = payoutData.narration?.trim() || 'Repayment wallet bank payout';
      const providerResult = await initiateBankPayout({
        sourceAccountNumber,
        destinationAccountNumber: payoutData.accountNumber.trim(),
        destinationBankCode: payoutData.bankCode.trim(),
        destinationAccountName: payoutData.accountName.trim(),
        amount,
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

      const balanceBefore = repaymentWallet.mainBalance;
      const newBalance = balanceBefore - amount;
      await db.updateWalletBalance(repaymentWallet.id, {
        mainBalance: newBalance,
        ledgerBalance: repaymentWallet.ledgerBalance - amount
      });

      const transaction = await db.createTransaction({
        walletId: repaymentWallet.id,
        amount: -amount,
        type: TransactionType.DEBIT,
        status: TransactionStatus.COMPLETED,
        description: `External bank payout: ${narration}`,
        referenceId: payoutReference,
        externalReference: providerResult.providerReference || payoutReference,
        category: 'SETTLEMENT_PAYOUT',
        source: 'PAYONUS',
        tags: ['payonus', 'bank-payout', 'repayment-wallet', 'settlement-wallet'],
        metadata: {
          providerStatus: providerResult.providerStatus,
          httpStatus: providerResult.httpStatus,
          destinationBankCode: payoutData.bankCode,
          destinationBankName: payoutData.bankName,
          destinationAccountName: payoutData.accountName,
          destinationAccountLast4: payoutData.accountNumber.slice(-4),
          sourceAccountLast4: sourceAccountNumber.slice(-4),
          merchantId,
          appId
        },
        balanceBefore,
        balanceAfter: newBalance
      });

      const updated = await db.getWalletById(repaymentWallet.id);

      logger.info('Repayment wallet bank payout completed', {
        merchantId,
        appId,
        amount,
        payoutReference,
        providerReference: providerResult.providerReference
      });

      return {
        success: true,
        wallet: updated as MerchantWallet,
        transaction,
        payoutReference,
        providerReference: providerResult.providerReference,
        providerStatus: providerResult.providerStatus,
        duplicate: false
      };
    } catch (error) {
      logger.error('Error paying out repayment wallet to bank', { error, merchantId: payoutData.merchantId });
      return { success: false, error: 'Failed to payout repayment wallet to bank' };
    }
  }

  /** @deprecated use payoutRepaymentWalletToBank */
  static async payoutSettlementWalletToBank(payoutData: Parameters<typeof WalletService.payoutRepaymentWalletToBank>[0]) {
    return this.payoutRepaymentWalletToBank(payoutData);
  }

  /**
   * Get Repayment Wallet for a merchant (formerly "Settlement", optionally app-scoped).
   */
  static async getRepaymentWallet(merchantId: string, appId?: string): Promise<{
    success: boolean;
    wallet?: MerchantWallet;
    error?: string
  }> {
    return this.getMerchantWalletByType(merchantId, MerchantWalletType.REPAYMENT, appId);
  }

  /** @deprecated use getRepaymentWallet */
  static async getSettlementWallet(merchantId: string, appId?: string) {
    return this.getRepaymentWallet(merchantId, appId);
  }

  /**
   * Debit a merchant's Repayment Wallet (formerly "Settlement")
   */
  static async debitRepaymentWallet(debitData: {
    merchantId: string,
    appId?: string,
    amount: number,
    description: string
  }): Promise<{
    success: boolean; 
    wallet?: MerchantWallet; 
    transaction?: Transaction; 
    error?: string 
  }> {
    try {
      const repaymentResult = await this.getRepaymentWallet(debitData.merchantId, debitData.appId);
      if (!repaymentResult.success || !repaymentResult.wallet) return { success: false, error: 'Repayment wallet not found for merchant' };
      const repaymentWallet = repaymentResult.wallet;
      if (repaymentWallet.status !== WalletStatus.ACTIVE) return { success: false, error: 'Repayment wallet is not active' };
      if (repaymentWallet.mainBalance < debitData.amount) return { success: false, error: 'Insufficient balance in Repayment wallet' };

      const balanceBefore = repaymentWallet.mainBalance;
      const newBalance = balanceBefore - debitData.amount;
      await db.updateWalletBalance(repaymentWallet.id, { mainBalance: newBalance, ledgerBalance: repaymentWallet.ledgerBalance - debitData.amount });
      const transaction = await db.createTransaction({
        walletId: repaymentWallet.id,
        amount: -debitData.amount,
        type: TransactionType.DEBIT,
        status: TransactionStatus.COMPLETED,
        description: debitData.description,
        balanceBefore,
        balanceAfter: newBalance
      });
      const updated = await db.getWalletById(repaymentWallet.id);
      logger.info('Repayment wallet debited', { walletId: repaymentWallet.id, merchantId: debitData.merchantId, amount: debitData.amount });
      return { success: true, wallet: updated as MerchantWallet, transaction };
    } catch (error) {
      logger.error('Error debiting Repayment wallet', { error });
      return { success: false, error: 'Failed to debit Repayment wallet' };
    }
  }

  /** @deprecated use debitRepaymentWallet */
  static async debitSettlementWallet(debitData: {
    merchantId: string,
    appId?: string,
    amount: number,
    description: string
  }) {
    return this.debitRepaymentWallet(debitData);
  }

  /**
   * Debit a merchant's Billing Wallet
   */
  static async debitBillingWallet(debitData: {
    merchantId: string,
    appId?: string,
    amount: number,
    description: string
  }): Promise<{ 
    success: boolean; 
    wallet?: MerchantWallet; 
    transaction?: Transaction; 
    error?: string 
  }> {
    try {
      const billingResult = await this.getBillingWallet(debitData.merchantId, debitData.appId);
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
  static async debitKycWallet(debitData: {
    merchantId: string,
    appId?: string,
    amount: number,
    description: string
  }): Promise<{ 
    success: boolean; 
    wallet?: MerchantWallet; 
    transaction?: Transaction; 
    error?: string 
  }> {
    try {
      const kycResult = await this.getKycWallet(debitData.merchantId, debitData.appId);
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
  static async processKycFee(
    merchantId: string,
    amount: number,
    description: string = 'KYC Fee',
    appId?: string
  ): Promise<{
    success: boolean;
    wallet?: MerchantWallet;
    transaction?: Transaction;
    error?: string;
  }> {
    try {
      if (amount <= 0) return { success: false, error: 'KYC fee amount must be positive' };
      const kycResult = await this.getKycWallet(merchantId, appId);
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
