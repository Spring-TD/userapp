export type VirtualNubanAccountType = 'static' | 'reserved' | 'dynamic';
export type VirtualNubanProvisionStatus = 'active' | 'failed';
export type VirtualNubanProvider = 'bankone' | 'payonus' | 'legerblock';
export interface VirtualNubanDetails {
    accountType: VirtualNubanAccountType;
    provisionStatus: VirtualNubanProvisionStatus;
    /** Issuer that created this virtual account. Defaults to payonus for legacy rows. */
    provider?: VirtualNubanProvider;
    accountNumber?: string;
    bankName?: string;
    bankCode?: string;
    providerReference?: string;
    provisionError?: string;
    provisionedAt?: Date;
}
export interface BaseWallet {
    id: string;
    balance: number;
    /** Spendable balance in integer kobo (100 kobo = ₦1). */
    mainBalance: number;
    /** Ledger balance in integer kobo. */
    ledgerBalance: number;
    /**
     * Storage unit for mainBalance/ledgerBalance. After lazy migration all wallets are `kobo`.
     * HTTP responses convert to Naira via walletForApi.
     */
    balanceUnit?: 'kobo' | 'naira';
    currency: string;
    createdAt: Date;
    updatedAt: Date;
    status: WalletStatus;
    /** Payonus (or compatible) virtual NUBAN, when provisioned */
    virtualNuban?: VirtualNubanDetails;
    /** Issuer that owns this wallet's virtual NUBAN (legerblock dual-run). */
    nubanProvider?: 'bankone' | 'payonus' | 'legerblock';
    legerblockUserRef?: string;
    legerblockWalletId?: string;
}
export declare enum MerchantWalletType {
    BILLING = "BILLING",// Billing Wallet
    TREASURY = "TREASURY",// Treasury Wallet
    REPAYMENT = "REPAYMENT"
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
    merchantWalletType: MerchantWalletType;
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
}
export interface UserWallet extends BaseWallet {
    userId: string;
    merchantId: string;
    /** Same as merchant wallets — merchant owner's auth userId for compliance shareholder / BVN lookup. */
    complianceShareholderUserId?: string;
    walletType: 'USER';
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
}
export type Wallet = MerchantWallet | UserWallet;
export interface Transaction {
    id: string;
    walletId: string;
    /** Signed amount in integer kobo when amountUnit is kobo (default for new txs). */
    amount: number;
    /** Storage unit; omit/legacy = treat carefully; new writes use kobo. */
    amountUnit?: 'kobo' | 'naira';
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
    tags?: string[];
    externalReference?: string;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare enum WalletStatus {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
    SUSPENDED = "SUSPENDED"
}
export declare enum TransactionType {
    CREDIT = "CREDIT",
    DEBIT = "DEBIT"
}
export declare enum TransactionStatus {
    PENDING = "PENDING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    CANCELLED = "CANCELLED"
}
//# sourceMappingURL=Wallet.d.ts.map