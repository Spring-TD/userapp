import { Transaction, TransactionType, TransactionStatus } from '../models/Wallet';
export interface FilterTransactionData {
    startDate?: Date;
    endDate?: Date;
    type?: TransactionType;
    limit?: number;
    skip?: number;
}
/**
 * Lazy-migrate legacy Naira transaction amounts to integer kobo.
 * Rows already tagged `amountUnit: 'kobo'` are left unchanged.
 */
export declare function normalizeTransactionDoc(doc: unknown): Promise<Transaction | null>;
export declare function createTransaction(data: {
    walletId: string;
    amount: number;
    /** Ignored on write — new transactions always persist as integer kobo. */
    amountUnit?: 'kobo' | 'naira';
    type: TransactionType;
    status?: TransactionStatus;
    description: string;
    referenceId?: string;
    balanceBefore?: number;
    balanceAfter?: number;
    category?: string;
    source?: string;
    metadata?: Record<string, unknown>;
    tags?: string[];
    externalReference?: string;
    ipAddress?: string;
    userAgent?: string;
}): Promise<Transaction>;
export declare function getTransactionById(transactionId: string): Promise<Transaction | null>;
export declare function getTransactionsByWalletId(walletId: string, opts?: {
    limit?: number;
    skip?: number;
}): Promise<{
    transactions: Transaction[];
    total: number;
    limit: number;
    skip: number;
}>;
export declare function findCompletedTransactionByReference(walletId: string, referenceId: string): Promise<Transaction | null>;
export declare function filterTransactions(walletId: string, filter: FilterTransactionData): Promise<{
    transactions: Transaction[];
    total: number;
}>;
export declare function listRecentCreditsByAppCategory(input: {
    appId: string;
    category: string;
    limit?: number;
}): Promise<Array<{
    reference: string;
    applicationId: string;
    productId?: string;
    /** Naira major units for storefront / analytics consumers. */
    amount: number;
    at: string;
}>>;
/**
 * Recent SAVINGS_DEPOSIT credits with DEPOSIT vs TOP_UP (first credit per application = DEPOSIT).
 */
export declare function listSavingsDepositActivityForApp(input: {
    appId: string;
    limit?: number;
}): Promise<Array<{
    reference: string;
    applicationId: string;
    productId?: string;
    amount: number;
    at: string;
    activity: 'DEPOSIT' | 'TOP_UP';
}>>;
/** Completed savings-related debits in the current calendar month (Africa/Lagos). */
export declare function aggregateSavingsWithdrawalsThisMonth(appId: string): Promise<{
    amount: number;
    count: number;
}>;
/** Pending savings withdrawal requests (ledger or metadata). */
export declare function listPendingSavingsWithdrawalRequests(appId: string, limit?: number): Promise<Array<{
    reference: string;
    applicationId: string;
    amount: number;
    requestedOn: string;
    status: 'pending';
}>>;
/**
 * Recent INVESTMENT_DEPOSIT credits with NEW_INVESTMENT vs TOP_UP (first credit per application = NEW_INVESTMENT).
 */
export declare function listInvestmentDepositActivityForApp(input: {
    appId: string;
    limit?: number;
}): Promise<Array<{
    reference: string;
    applicationId: string;
    productId?: string;
    amount: number;
    at: string;
    activity: 'NEW_INVESTMENT' | 'TOP_UP';
}>>;
/** Pending investment liquidation / early withdrawal requests. */
export declare function listPendingInvestmentLiquidationRequests(appId: string, limit?: number): Promise<Array<{
    reference: string;
    applicationId: string;
    amount: number;
    requestedOn: string;
    status: 'pending';
}>>;
/** Recently completed investment liquidations (paid out). */
export declare function listRecentApprovedInvestmentLiquidations(appId: string, limit?: number): Promise<Array<{
    reference: string;
    applicationId: string;
    amount: number;
    settledOn: string;
    status: 'paid_out';
}>>;
/**
 * Recent COMMODITY_DEPOSIT credits with NEW_INVESTMENT vs TOP_UP (first credit per application = NEW_INVESTMENT).
 */
export declare function listCommodityDepositActivityForApp(input: {
    appId: string;
    limit?: number;
}): Promise<Array<{
    reference: string;
    applicationId: string;
    productId?: string;
    amount: number;
    at: string;
    activity: 'NEW_INVESTMENT' | 'TOP_UP';
}>>;
/** Pending commodity liquidation / cash-out requests. */
export declare function listPendingCommodityLiquidationRequests(appId: string, limit?: number): Promise<Array<{
    reference: string;
    applicationId: string;
    amount: number;
    requestedOn: string;
    status: 'pending';
}>>;
/** Recently completed commodity liquidations (paid out). */
export declare function listRecentApprovedCommodityLiquidations(appId: string, limit?: number): Promise<Array<{
    reference: string;
    applicationId: string;
    amount: number;
    settledOn: string;
    status: 'paid_out';
}>>;
//# sourceMappingURL=transactionRepository.d.ts.map