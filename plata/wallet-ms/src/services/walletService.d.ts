import { Wallet, MerchantWallet, UserWallet, Transaction, TransactionType, MerchantWalletType } from '../models/Wallet';
import type { ApplicantProfile } from './nuban/types';
export declare const LOAN_DISBURSEMENT_SOURCE = "loan-disbursement";
export declare const TREASURY_DISBURSEMENT_SOURCE = "treasury-disbursement";
export declare const REPAYMENT_COLLECTION_SOURCE = "repayment-collection";
/** @deprecated Use REPAYMENT_COLLECTION_SOURCE */
export declare const SETTLEMENT_COLLECTION_SOURCE = "repayment-collection";
export type RepaymentCollectionCategory = 'LOAN_REPAYMENT' | 'MORTGAGE_EQUITY' | 'INTEREST_PAYMENT' | 'SAVINGS_DEPOSIT' | 'INVESTMENT_DEPOSIT' | 'COMMODITY_DEPOSIT';
/** @deprecated Use RepaymentCollectionCategory */
export type SettlementCollectionCategory = RepaymentCollectionCategory;
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
    /** Applicant BVN supplied by an external platform for VA provisioning. */
    bvn?: string;
    /** Extra KYC fields for BankOne CreateAccountQuick (ignored by PayOnUs). */
    applicantProfile?: ApplicantProfile;
    name: string;
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
    /** Page size (default 20, max 100). */
    limit?: number;
    /** Rows to skip (default 0). */
    skip?: number;
}
export interface TransactionPagination {
    total: number;
    limit: number;
    skip: number;
    hasMore: boolean;
}
export declare function normalizeTransactionPagination(filterData: FilterTransactionData): {
    limit: number;
    skip: number;
};
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
export declare class WalletService {
    private static enrichWalletContact;
    private static enrichMerchantWalletContacts;
    private static enrichUserWalletContacts;
    private static enrichTransactionContacts;
    /**
     * Create a new merchant wallet of specific type
     * When any merchant wallet is created, automatically create all three internal wallets
     */
    static createMerchantWallet(data: CreateMerchantWalletData, skipAutoCreate?: boolean): Promise<{
        success: boolean;
        wallet?: MerchantWallet;
        error?: string;
    }>;
    /**
     * Create all required merchant wallets (Billing, Treasury, Repayment)
     */
    static createAllMerchantWallets(merchantId: string, currency?: string, skipAutoCreate?: boolean, appId?: string, appName?: string, payonusSubaccountCode?: string, complianceShareholderUserId?: string): Promise<{
        success: boolean;
        wallets?: MerchantWallet[];
        error?: string;
    }>;
    /**
     * Get merchant wallet by merchant ID and wallet type
     */
    static getMerchantWalletByType(merchantId: string, walletType: MerchantWalletType, appId?: string): Promise<{
        success: boolean;
        wallet?: MerchantWallet;
        error?: string;
    }>;
    /** Recent completed SAVINGS_DEPOSIT credits for an app (product overview). */
    static listRecentSavingsDepositsForApp(appId: string, limit?: number): Promise<Array<{
        reference: string;
        applicationId: string;
        productId?: string;
        amount: number;
        at: string;
        status: 'successful';
    }>>;
    /** Savings product overview: deposits (with activity), monthly withdrawals, pending requests. */
    static buildSavingsOverviewForApp(appId: string, recentLimit?: number): Promise<{
        recentDeposits: Array<{
            reference: string;
            applicationId: string;
            productId?: string;
            amount: number;
            at: string;
            activity: 'DEPOSIT' | 'TOP_UP';
            status: 'successful';
        }>;
        withdrawalsThisMonth: {
            amount: number;
            count: number;
        };
        pendingWithdrawalRequests: Array<{
            reference: string;
            applicationId: string;
            amount: number;
            requestedOn: string;
            status: 'pending';
        }>;
    }>;
    /** Investment product overview: deposits (with activity), pending + settled liquidations. */
    static buildInvestmentOverviewForApp(appId: string, recentLimit?: number): Promise<{
        recentDeposits: Array<{
            reference: string;
            applicationId: string;
            productId?: string;
            amount: number;
            at: string;
            activity: 'NEW_INVESTMENT' | 'TOP_UP';
            status: 'successful';
        }>;
        pendingLiquidationRequests: Array<{
            reference: string;
            applicationId: string;
            amount: number;
            requestedOn: string;
            status: 'pending';
        }>;
        approvedLiquidations: Array<{
            reference: string;
            applicationId: string;
            amount: number;
            settledOn: string;
            status: 'paid_out';
        }>;
    }>;
    /** Recent completed INVESTMENT_DEPOSIT credits for an app (product overview). */
    static listRecentInvestmentDepositsForApp(appId: string, limit?: number): Promise<Array<{
        reference: string;
        applicationId: string;
        productId?: string;
        amount: number;
        at: string;
        status: 'successful';
    }>>;
    /** Commodity product overview: deposits (with activity), pending + settled liquidations. */
    static buildCommodityOverviewForApp(appId: string, recentLimit?: number): Promise<{
        recentDeposits: Array<{
            reference: string;
            applicationId: string;
            productId?: string;
            amount: number;
            at: string;
            activity: 'NEW_INVESTMENT' | 'TOP_UP';
            status: 'successful';
        }>;
        pendingLiquidationRequests: Array<{
            reference: string;
            applicationId: string;
            amount: number;
            requestedOn: string;
            status: 'pending';
        }>;
        approvedLiquidations: Array<{
            reference: string;
            applicationId: string;
            amount: number;
            settledOn: string;
            status: 'paid_out';
        }>;
    }>;
    /** Recent completed COMMODITY_DEPOSIT credits for an app (product overview). */
    static listRecentCommodityDepositsForApp(appId: string, limit?: number): Promise<Array<{
        reference: string;
        applicationId: string;
        productId?: string;
        amount: number;
        at: string;
        status: 'successful';
    }>>;
    /**
     * Get all merchant wallets by merchant ID
     */
    static getAllMerchantWallets(merchantId: string, appId?: string): Promise<{
        success: boolean;
        wallets?: MerchantWallet[];
        error?: string;
    }>;
    /**
     * Create a new user wallet
     */
    static createUserWallet(data: CreateUserWalletData): Promise<{
        success: boolean;
        wallet?: UserWallet;
        error?: string;
    }>;
    /**
     * Get user wallet by user ID
     */
    static getUserWallet(userId: string): Promise<{
        success: boolean;
        wallet?: UserWallet;
        error?: string;
    }>;
    /**
     * Get all user wallets associated with a merchant
     */
    static getUserWalletsByMerchant(merchantId: string, pagination?: {
        limit?: number;
        skip?: number;
    }): Promise<{
        success: boolean;
        wallets?: UserWallet[];
        pagination?: TransactionPagination;
        error?: string;
    }>;
    /**
     * Update wallet balance
     */
    static updateWalletBalance(walletId: string, amount: number, description: string): Promise<{
        success: boolean;
        wallet?: Wallet;
        error?: string;
    }>;
    /**
     * Credit a user wallet under a merchant. Idempotent when `externalReference` is supplied.
     */
    static creditUserWalletForMerchant(data: {
        userId: string;
        merchantId: string;
        amount: number;
        description: string;
        externalReference: string;
        source?: string;
        category?: string;
    }): Promise<{
        success: boolean;
        wallet?: UserWallet;
        transaction?: Transaction;
        duplicate?: boolean;
        error?: string;
    }>;
    static buildTreasuryWalletFundingInstructions(wallet: MerchantWallet, requiredAmount: number): ReturnType<typeof WalletService.buildBillingWalletFundingInstructions>;
    /**
     * Disburse capital from the app-scoped Treasury wallet to a user's wallet under the same merchant.
     * Used for loan / mortgage approval (and similar product payouts).
     */
    static disburseFromTreasury(data: {
        merchantId: string;
        appId: string;
        userId: string;
        amount: number;
        description: string;
        referenceId: string;
        applicationId?: string;
        productId?: string;
        productType?: string;
        currency?: string;
    }): Promise<{
        success: boolean;
        treasuryWallet?: MerchantWallet;
        userWallet?: UserWallet;
        treasuryTransaction?: Transaction;
        userTransaction?: Transaction;
        duplicate?: boolean;
        insufficientFunds?: boolean;
        fundingInstructions?: ReturnType<typeof WalletService.buildTreasuryWalletFundingInstructions>;
        error?: string;
    }>;
    /**
     * Debit app-scoped Treasury for an outbound settlement (e.g. Spring Management Fee).
     * Idempotent on referenceId. Does not credit another wallet on this ledger —
     * the counterparty credit happens on Spring wallet-ms via the loan-workflow webhook.
     */
    static debitTreasuryForSettlement(data: {
        merchantId: string;
        appId: string;
        amount: number;
        description: string;
        referenceId: string;
        category?: string;
        applicationId?: string;
        productId?: string;
        productType?: string;
        offeringMerchantId?: string;
        currency?: string;
    }): Promise<{
        success: boolean;
        treasuryWallet?: MerchantWallet;
        treasuryTransaction?: Transaction;
        duplicate?: boolean;
        insufficientFunds?: boolean;
        fundingInstructions?: ReturnType<typeof WalletService.buildTreasuryWalletFundingInstructions>;
        error?: string;
    }>;
    /**
     * Credit the app-scoped Repayment wallet when customer money is collected.
     * External collections (Mono, PayOnUs) credit Repayment only.
     * In-app collections optionally debit the user's wallet first.
     */
    static collectToRepayment(data: {
        merchantId: string;
        appId?: string;
        userId?: string;
        amount: number;
        referenceId: string;
        source: string;
        category: RepaymentCollectionCategory | string;
        description?: string;
        applicationId?: string;
        productId?: string;
        productType?: string;
        installmentNumber?: number;
        currency?: string;
        metadata?: Record<string, unknown>;
        debitUserWallet?: boolean;
    }): Promise<{
        success: boolean;
        repaymentWallet?: MerchantWallet;
        /** @deprecated Use repaymentWallet */
        settlementWallet?: MerchantWallet;
        userWallet?: UserWallet;
        repaymentTransaction?: Transaction;
        /** @deprecated Use repaymentTransaction */
        settlementTransaction?: Transaction;
        userTransaction?: Transaction;
        transaction?: Transaction;
        wallet?: MerchantWallet;
        duplicate?: boolean;
        insufficientFunds?: boolean;
        error?: string;
    }>;
    /** @deprecated Use collectToRepayment */
    static collectToSettlement(data: Parameters<typeof WalletService.collectToRepayment>[0]): ReturnType<typeof WalletService.collectToRepayment>;
    static applyLoanRepaymentCollection(data: {
        merchantId: string;
        appId?: string;
        applicationId: string;
        userId: string;
        productId: string;
        amount: number;
        currency?: string;
        referenceId: string;
        installmentNumber: number;
        description?: string;
        metadata?: Record<string, unknown>;
    }): Promise<{
        success: boolean;
        wallet?: MerchantWallet;
        transaction?: Transaction;
        duplicate?: boolean;
        error?: string;
    }>;
    /**
     * Get wallet by ID
     */
    static getWalletById(walletId: string): Promise<{
        success: boolean;
        wallet?: Wallet;
        error?: string;
    }>;
    static getWalletByPayonusAccountNumber(accountNumber: string): Promise<{
        success: boolean;
        wallet?: Wallet;
        error?: string;
    }>;
    static getWalletByVirtualAccountNumber(accountNumber: string): Promise<{
        success: boolean;
        wallet?: Wallet;
        error?: string;
    }>;
    /**
     * Filter transactions by date range and type for a specific wallet
     */
    static filterWalletTransactions(walletId: string, filterData: FilterTransactionData): Promise<{
        success: boolean;
        transactions?: Transaction[];
        pagination?: TransactionPagination;
        error?: string;
    }>;
    /**
     * Filter User Wallet transactions by date range and type
     */
    static filterUserTransactions(userId: string, filterData: FilterTransactionData): Promise<{
        success: boolean;
        transactions?: Transaction[];
        pagination?: TransactionPagination;
        error?: string;
    }>;
    /**
     * Filter Billing Wallet transactions by date range and type
     */
    static filterBillingTransactions(merchantId: string, filterData: FilterTransactionData, appId?: string): Promise<{
        success: boolean;
        transactions?: Transaction[];
        pagination?: TransactionPagination;
        error?: string;
    }>;
    /** @deprecated Use filterBillingTransactions */
    static filterOperationTransactions(merchantId: string, filterData: FilterTransactionData, appId?: string): Promise<{
        success: boolean;
        transactions?: Transaction[];
        pagination?: TransactionPagination;
        error?: string;
    }>;
    /**
     * Filter Repayment Wallet transactions by date range and type
     */
    static filterRepaymentTransactions(merchantId: string, filterData: FilterTransactionData, appId?: string): Promise<{
        success: boolean;
        transactions?: Transaction[];
        pagination?: TransactionPagination;
        error?: string;
    }>;
    /** @deprecated Use filterRepaymentTransactions */
    static filterSettlementTransactions(merchantId: string, filterData: FilterTransactionData, appId?: string): Promise<{
        success: boolean;
        transactions?: Transaction[];
        pagination?: TransactionPagination;
        error?: string;
    }>;
    /**
     * Filter Treasury Wallet transactions by date range and type
     */
    static filterTreasuryTransactions(merchantId: string, filterData: FilterTransactionData, appId?: string): Promise<{
        success: boolean;
        transactions?: Transaction[];
        pagination?: TransactionPagination;
        error?: string;
    }>;
    /** @deprecated Use filterRepaymentTransactions */
    static filterKycTransactions(merchantId: string, filterData: FilterTransactionData, appId?: string): Promise<{
        success: boolean;
        transactions?: Transaction[];
        error?: string;
    }>;
    /**
     * Transfer money out from one wallet to another
     */
    static transferOut(transferData: TransferOutData): Promise<{
        success: boolean;
        fromWallet?: Wallet;
        toWallet?: Wallet;
        transaction?: Transaction;
        error?: string;
    }>;
    /**
     * Transfer money out from user wallet to another wallet
     */
    static transferOutFromUser(transferData: {
        userId: string;
        toWalletId: string;
        amount: number;
        description: string;
    }): Promise<{
        success: boolean;
        fromWallet?: UserWallet;
        toWallet?: Wallet;
        transaction?: Transaction;
        error?: string;
    }>;
    /**
     * Debit a user wallet (used for billing)
     */
    static debitUserWallet(debitData: DebitWalletData): Promise<{
        success: boolean;
        wallet?: Wallet;
        transaction?: Transaction;
        error?: string;
    }>;
    /**
     * Transfer money from Billing Wallet to Repayment Wallet
     */
    static transferFromBillingToRepayment(transferData: {
        merchantId: string;
        amount: number;
        description: string;
    }): Promise<{
        success: boolean;
        fromWallet?: MerchantWallet;
        toWallet?: MerchantWallet;
        transaction?: Transaction;
        error?: string;
    }>;
    /** @deprecated Use transferFromBillingToRepayment */
    static transferFromBillingToSettlement(transferData: {
        merchantId: string;
        amount: number;
        description: string;
    }): Promise<{
        success: boolean;
        fromWallet?: MerchantWallet;
        toWallet?: MerchantWallet;
        transaction?: Transaction;
        error?: string;
    }>;
    /** @deprecated Use transferFromBillingToRepayment */
    static transferFromOperationToKyc(transferData: {
        merchantId: string;
        amount: number;
        description: string;
    }): Promise<{
        success: boolean;
        fromWallet?: MerchantWallet;
        toWallet?: MerchantWallet;
        transaction?: Transaction;
        error?: string;
    }>;
    /**
     * Transfer money from Repayment Wallet to Billing Wallet
     */
    static transferFromRepaymentToBilling(transferData: {
        merchantId: string;
        amount: number;
        description: string;
    }): Promise<{
        success: boolean;
        fromWallet?: MerchantWallet;
        toWallet?: MerchantWallet;
        transaction?: Transaction;
        error?: string;
    }>;
    /** @deprecated Use transferFromRepaymentToBilling */
    static transferFromSettlementToBilling(transferData: {
        merchantId: string;
        amount: number;
        description: string;
    }): Promise<{
        success: boolean;
        fromWallet?: MerchantWallet;
        toWallet?: MerchantWallet;
        transaction?: Transaction;
        error?: string;
    }>;
    /** @deprecated Use transferFromRepaymentToBilling */
    static transferFromKycToOperation(transferData: {
        merchantId: string;
        amount: number;
        description: string;
    }): Promise<{
        success: boolean;
        fromWallet?: MerchantWallet;
        toWallet?: MerchantWallet;
        transaction?: Transaction;
        error?: string;
    }>;
    /**
     * Get Billing Wallet for a merchant
     */
    static getBillingWallet(merchantId: string, appId?: string): Promise<{
        success: boolean;
        wallet?: MerchantWallet;
        error?: string;
    }>;
    /** @deprecated Use getBillingWallet */
    static getOperationWallet(merchantId: string, appId?: string): Promise<{
        success: boolean;
        wallet?: MerchantWallet;
        error?: string;
    }>;
    /**
     * Get Repayment Wallet for a merchant
     */
    static getRepaymentWallet(merchantId: string, appId?: string): Promise<{
        success: boolean;
        wallet?: MerchantWallet;
        error?: string;
    }>;
    /** @deprecated Use getRepaymentWallet */
    static getSettlementWallet(merchantId: string, appId?: string): Promise<{
        success: boolean;
        wallet?: MerchantWallet;
        error?: string;
    }>;
    /** @deprecated Use getRepaymentWallet */
    static getKycWallet(merchantId: string, appId?: string): Promise<{
        success: boolean;
        wallet?: MerchantWallet;
        error?: string;
    }>;
    /**
     * Get Treasury Wallet for a merchant
     */
    static getTreasuryWallet(merchantId: string, appId?: string): Promise<{
        success: boolean;
        wallet?: MerchantWallet;
        error?: string;
    }>;
    /**
     * Debit a merchant's Treasury Wallet (used for billing)
     */
    static debitTreasuryWallet(debitData: {
        merchantId: string;
        amount: number;
        description: string;
    }): Promise<{
        success: boolean;
        wallet?: MerchantWallet;
        transaction?: Transaction;
        error?: string;
    }>;
    /**
     * Debit a merchant's Billing Wallet
     */
    static debitBillingWallet(debitData: {
        merchantId: string;
        amount: number;
        description: string;
    }): Promise<{
        success: boolean;
        wallet?: MerchantWallet;
        transaction?: Transaction;
        error?: string;
    }>;
    /** @deprecated Use debitBillingWallet */
    static debitOperationWallet(debitData: {
        merchantId: string;
        amount: number;
        description: string;
    }): Promise<{
        success: boolean;
        wallet?: MerchantWallet;
        transaction?: Transaction;
        error?: string;
    }>;
    /**
     * Debit a merchant's Repayment Wallet
     */
    static debitRepaymentWallet(debitData: {
        merchantId: string;
        amount: number;
        description: string;
    }): Promise<{
        success: boolean;
        wallet?: MerchantWallet;
        transaction?: Transaction;
        error?: string;
    }>;
    /** @deprecated Use debitRepaymentWallet */
    static debitSettlementWallet(debitData: {
        merchantId: string;
        amount: number;
        description: string;
    }): Promise<{
        success: boolean;
        wallet?: MerchantWallet;
        transaction?: Transaction;
        error?: string;
    }>;
    /** @deprecated Use debitRepaymentWallet */
    static debitKycWallet(debitData: {
        merchantId: string;
        amount: number;
        description: string;
    }): Promise<{
        success: boolean;
        wallet?: MerchantWallet;
        transaction?: Transaction;
        error?: string;
    }>;
    /**
     * Process KYC fee by debiting the merchant's Repayment wallet
     */
    static processKycFee(merchantId: string, amount: number, description?: string): Promise<{
        success: boolean;
        wallet?: MerchantWallet;
        transaction?: Transaction;
        error?: string;
    }>;
    /**
     * Make a 3rd party API call from a user wallet
     */
    static makeUserApiCall(apiCallData: UserApiCallData): Promise<{
        success: boolean;
        wallet?: UserWallet;
        transaction?: Transaction;
        apiResponse?: any;
        error?: string;
    }>;
    static buildBillingWalletFundingInstructions(wallet: MerchantWallet, requiredAmount: number): {
        walletId: string;
        balance: number;
        currency: string;
        requiredAmount: number;
        shortfall: number;
        virtualNuban?: MerchantWallet['virtualNuban'];
        fundingHint: string;
    };
    /**
     * Debit the app-scoped Billing wallet for monthly platform fees (per customer count).
     */
    static chargeMonthlyCustomerBilling(data: {
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
    }>;
    /**
     * One-time debit of the merchant Billing wallet for business KYC (idempotent per merchant).
     */
    static chargeBusinessKycFee(data: {
        merchantId: string;
        appId?: string;
        amount: number;
        description: string;
        referenceId: string;
        authUserId?: string;
    }): Promise<{
        success: boolean;
        wallet?: MerchantWallet;
        transaction?: Transaction;
        duplicate?: boolean;
        insufficientFunds?: boolean;
        skippedZeroAmount?: boolean;
        fundingInstructions?: ReturnType<typeof WalletService.buildBillingWalletFundingInstructions>;
        error?: string;
    }>;
    /**
     * Payout from the merchant Repayment wallet to an external bank account via PayOnUs.
     */
    static payoutRepaymentWalletToBank(payoutData: {
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
    }>;
    /** @deprecated Use payoutRepaymentWalletToBank */
    static payoutSettlementWalletToBank(payoutData: Parameters<typeof WalletService.payoutRepaymentWalletToBank>[0]): ReturnType<typeof WalletService.payoutRepaymentWalletToBank>;
}
//# sourceMappingURL=walletService.d.ts.map