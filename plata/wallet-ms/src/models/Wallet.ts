export type VirtualNubanAccountType = 'static' | 'reserved' | 'dynamic';

export type VirtualNubanProvisionStatus = 'active' | 'failed';

export type NubanProvider = 'payonus' | 'legerblock';

export interface VirtualNubanDetails {
  accountType: VirtualNubanAccountType;
  provisionStatus: VirtualNubanProvisionStatus;
  accountNumber?: string;
  bankName?: string;
  bankCode?: string;
  providerReference?: string;
  provisionError?: string;
  provisionedAt?: Date;
}

export interface BaseWallet {
  id: string;
  balance: number; // Alias for mainBalance for backward compatibility
  mainBalance: number;
  ledgerBalance: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  status: WalletStatus;
  /** Payonus / LegerBlock virtual NUBAN, when provisioned */
  virtualNuban?: VirtualNubanDetails;
  nubanProvider?: NubanProvider;
  legerblockUserRef?: string;
  legerblockWalletId?: string;
}

// Define wallet types for merchants
export enum MerchantWalletType {
  TREASURY = 'TREASURY',     // Treasury Wallet
  OPERATION = 'OPERATION',   // Operation Wallet
  KYC = 'KYC'                // KYC Wallet
}

export interface MerchantWallet extends BaseWallet {
  merchantId: string;
  /**
   * Auth primary user id (JWT userId). Shareholders in compliance-ms are keyed by this value,
   * not by userMerchantId (`merchantId`).
   */
  complianceShareholderUserId?: string;
  appId?: string;
  appName?: string;
  payonusSubaccountCode?: string;
  walletType: 'MERCHANT';
  merchantWalletType: MerchantWalletType; // Specific type for merchant wallets
  name: string;
}

export interface UserWallet extends BaseWallet {
  userId: string;
  merchantId: string;
  /** Same as merchant wallets — merchant owner's auth userId for compliance shareholder / BVN lookup. */
  complianceShareholderUserId?: string;
  walletType: 'USER';
  name: string;
}

export type Wallet = MerchantWallet | UserWallet;

export interface Transaction {
  id: string;
  walletId: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  referenceId?: string;
  balanceBefore?: number;
  balanceAfter?: number;
  category?: string;
  source?: string;
  metadata?: Record<string, any>;
  tags?: string[];
  externalReference?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum WalletStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED'
}

export enum TransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}