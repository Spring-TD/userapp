export type VirtualNubanAccountType = 'static' | 'reserved' | 'dynamic';

export type VirtualNubanProvisionStatus = 'active' | 'failed';

/** Rails provider that issued the wallet's virtual NUBAN. */
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
  /** Which provider owns this wallet's NUBAN (default/inferred: payonus). */
  nubanProvider?: NubanProvider;
  /** LegerBlock user_ref when provisioned via LegerBlock. */
  legerblockUserRef?: string;
  /** LegerBlock wallet_id when provisioned via LegerBlock. */
  legerblockWalletId?: string;
}

// Define wallet types for merchants (one set per app at creation)
export enum MerchantWalletType {
  BILLING = 'BILLING',         // Billing Wallet
  KYC = 'KYC',                 // KYC link fee Wallet (Spring-only; distinct from Repayment)
  REPAYMENT = 'REPAYMENT'      // Repayment Wallet (formerly Settlement)
}

export type UserWalletPurpose = 'PRIMARY' | 'PRODUCT';

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
  contactName?: string;
  email?: string;
  phone?: string;
}

export interface UserWallet extends BaseWallet {
  userId: string;
  merchantId: string;
  /** Merchant owner's auth userId for compliance shareholder / BVN lookup. */
  complianceShareholderUserId?: string;
  walletType: 'USER';
  walletPurpose: UserWalletPurpose;
  productApplicationId?: string;
  productId?: string;
  productType?: string;
  appId?: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
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
  contactName?: string;
  email?: string;
  phone?: string;
  senderDetails?: {
    name?: string;
    accountNumber?: string;
    bankName?: string;
    bankCode?: string;
  };
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