export enum RecordType {
  MERCHANT = 'MERCHANT',
  MERCHANT_USER = 'MERCHANT_USER'
}

export enum LedgerEntryType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED'
}

export enum TransactionType {
  TRANSFER = 'TRANSFER',
  UTILITY_PAYMENT = 'UTILITY_PAYMENT',
  AIRTIME_PURCHASE = 'AIRTIME_PURCHASE',
  BILL_PAYMENT = 'BILL_PAYMENT',
  MERCHANT_PAYMENT = 'MERCHANT_PAYMENT',
  WITHDRAWAL = 'WITHDRAWAL',
  DEPOSIT = 'DEPOSIT',
  REFUND = 'REFUND',
  PAYOUT = 'PAYOUT',
  OTHER = 'OTHER'
}

/**
 * Financial Category for Records
 * Categorizes transactions by financial product type
 */
export enum FinancialCategory {
  LOAN = 'LOAN',
  SAVINGS = 'SAVINGS',
  MORTGAGE = 'MORTGAGE',
  COMMODITY = 'COMMODITY',
  WALLET = 'WALLET'
}

/**
 * Beneficiary Information for Fiat Transactions
 * Used for fraud detection and transaction tracking
 */
export interface BeneficiaryFiatInfo {
  beneficiary_fiat_ref: string; // Unique reference - treated as account number for fraud detection
  bank_name: string;
  bank_code: string;
  account_number: string;
  account_holder_name: string;
  other_data?: { [key: string]: any }; // Extensibility container
}

/**
 * Sender Information
 */
export interface SenderInfo {
  full_name: string;
  email: string;
  phone: string;
}

/**
 * Fee Breakdown Structure
 */
export interface FeeBreakdown {
  payout_fee: number;
  merchant_commission: number;
  other_fee?: Array<{
    name: string;
    amount: number;
  }>; // Extensibility for additional fees
}

/**
 * Comprehensive Debit/Credit Ledger Entry
 * Tracks all financial transactions with complete audit trail
 */
export interface LedgerEntry {
  // Primary identifiers
  ledgerEntryId: string;
  recordId: string;
  
  // Entry classification
  entryType: LedgerEntryType; // DEBIT or CREDIT
  transactionType: TransactionType; // Transfer, Utility payment, etc.
  financialCategory: FinancialCategory; // Loan, Savings, Mortgage, Commodity, or Wallet
  status: TransactionStatus;
  
  // Core transaction fields
  balance_bf: number; // Opening balance (Balance Brought Forward)
  debit_amount_local: number; // Debit amount in local currency
  balance_after: number; // Closing balance after transaction
  transaction_timestamp: Date;
  
  // Transaction references
  txn_ref: string; // Internal transaction reference
  session_id: string; // Session identifier
  third_party_ref_id?: string; // External reference ID
  
  // Transaction details
  transaction_description: string; // Description/reasons
  
  // Currency information
  from_currency: string; // Source currency
  to_currency: string; // Target currency
  
  // Beneficiary information (for fiat transactions)
  beneficiary_info?: BeneficiaryFiatInfo;
  
  // Sender information
  sender_info: SenderInfo;
  
  // Fee breakdown
  fee_breakdown: FeeBreakdown;
  
  // Audit trail
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Merchant Record
 * Created for verified merchants after successful signup
 */
export interface MerchantRecord {
  recordId: string;
  recordType: RecordType.MERCHANT;
  userId: string; // Reference to user ID from service-auth-ms
  email: string;
  firstName: string;
  lastName: string;
  userMerchantId: string; // Unique merchant identifier
  country: string;
  phone?: string;
  
  // Ledger information
  currentBalance: number;
  currency: string; // Default currency for this merchant
  totalDebits: number;
  totalCredits: number;
  
  // Status and metadata
  isActive: boolean;
  verifiedAt: Date;
  metadata?: { [key: string]: any };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Merchant-User Record
 * Created for verified merchant users after successful signup
 */
export interface MerchantUserRecord {
  recordId: string;
  recordType: RecordType.MERCHANT_USER;
  userId: string; // Reference to user ID from service-auth-ms
  email: string;
  firstName: string;
  lastName: string;
  userMerchantId: string; // Reference to parent merchant
  country: string;
  phone?: string;
  
  // Ledger information
  currentBalance: number;
  currency: string;
  totalDebits: number;
  totalCredits: number;
  
  // Status and metadata
  isActive: boolean;
  verifiedAt: Date;
  metadata?: { [key: string]: any };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Union type for all record types
 */
export type MerchantRecordUnion = MerchantRecord | MerchantUserRecord;

/**
 * Request payload for creating a record
 * Received from service-auth-ms webhook
 */
export interface CreateRecordRequest {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: 'MERCHANT' | 'USER'; // Maps to RecordType
  userMerchantId: string;
  country: string;
  phone?: string;
  verifiedAt: string; // ISO date string
  metadata?: { [key: string]: any };
}

/**
 * Response after record creation
 */
export interface CreateRecordResponse {
  success: boolean;
  data?: {
    record: MerchantRecordUnion;
    message: string;
  };
  error?: string;
}

/**
 * Sort order for ledger queries
 */
export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC'
}

/**
 * Sort field options for ledger entries
 */
export enum LedgerSortField {
  DATE = 'DATE',
  AMOUNT = 'AMOUNT',
  TRANSACTION_TYPE = 'TRANSACTION_TYPE',
  FINANCIAL_CATEGORY = 'FINANCIAL_CATEGORY',
  ENTRY_TYPE = 'ENTRY_TYPE',
  BALANCE = 'BALANCE'
}

/**
 * Ledger query parameters
 */
export interface LedgerQueryParams {
  recordId: string;
  startDate?: Date;
  endDate?: Date;
  entryType?: LedgerEntryType;
  financialCategory?: FinancialCategory;
  transactionType?: TransactionType;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: LedgerSortField;
  sortOrder?: SortOrder;
  limit?: number;
  offset?: number;
}

/**
 * Ledger summary for a record
 */
export interface LedgerSummary {
  recordId: string;
  currentBalance: number;
  totalDebits: number;
  totalCredits: number;
  currency: string;
  lastTransactionAt?: Date;
  transactionCount: number;
}

/**
 * Category-specific summary for a record
 */
export interface CategorySummary {
  category: FinancialCategory;
  totalDebits: number;
  totalCredits: number;
  balance: number;
  transactionCount: number;
}

/**
 * Analytics summary for a record or merchant
 */
export interface AnalyticsSummary {
  recordId?: string;
  userMerchantId?: string;
  
  // Overall totals
  totalPayin: number;        // Total CREDIT transactions
  totalPayout: number;       // Total DEBIT transactions
  netBalance: number;        // totalPayin - totalPayout
  totalTransactions: number;
  
  // Category-specific totals
  totalLoan: number;         // Total in LOAN category
  totalSavings: number;      // Total in SAVINGS category
  totalMortgage: number;     // Total in MORTGAGE category
  totalCommodity: number;    // Total in COMMODITY category
  totalWallet: number;       // Total in WALLET category
  
  // Customer metrics (for merchants)
  totalCustomers?: number;   // Total merchant users
  activeCustomers?: number;  // Active merchant users
  
  // Date range for the analytics
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  
  // Breakdown by category
  categoryBreakdown: CategorySummary[];
}

/**
 * Request for funding a record in a specific category
 */
export interface FundRecordRequest {
  recordId: string;
  category: FinancialCategory;
  amount: number;
  description: string;
  transactionType: TransactionType;
  txnRef: string;
  sessionId: string;
  fromCurrency: string;
  toCurrency: string;
  senderInfo: SenderInfo;
  feeBreakdown: FeeBreakdown;
  thirdPartyRefId?: string;
  beneficiaryInfo?: BeneficiaryFiatInfo;
}

/**
 * Request for debiting a record in a specific category
 */
export interface DebitRecordRequest {
  recordId: string;
  category: FinancialCategory;
  amount: number;
  description: string;
  transactionType: TransactionType;
  txnRef: string;
  sessionId: string;
  fromCurrency: string;
  toCurrency: string;
  senderInfo: SenderInfo;
  feeBreakdown: FeeBreakdown;
  thirdPartyRefId?: string;
  beneficiaryInfo?: BeneficiaryFiatInfo;
}

/**
 * Response for fund/debit operations
 */
export interface FundDebitResponse {
  success: boolean;
  data?: {
    entry: LedgerEntry;
    record: MerchantRecordUnion;
    message: string;
  };
  error?: string;
}
