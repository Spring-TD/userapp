import type { Transaction } from './app';

/**
 * Active / Inactive / Pending loan tabs — table columns:
 * Amount, Ref, Timestamp, Fee, Product, Meta_Ref, user email, user phone.
 */
export type ProductOverviewLoanTableRow = {
  applicationId: string;
  userId: string;
  amount: number;
  currency: string;
  /** Product reference e.g. SPI-234-BY45K */
  ref: string;
  /** Display e.g. `12:45 / Apr 12, 2025` (from application createdAt) */
  timestamp: string;
  /** First aggregate of numeric `feesAndCharges.fees[].value` when parseable */
  fee: number | null;
  feeCurrency: string;
  product: string;
  /** Secondary ref: `user_ref` when set, else `userId` */
  metaRef: string;
  /** “All users” column — customer email */
  userEmail: string;
  userPhone: string | null;
  status: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
};

/** General Info tab — matches dashboard sections: Loan information, Loan Tenure, Loan Requirement. */
export type ProductOverviewLoanInformation = {
  /** Borrower display name when resolvable via gateway user list */
  name: string;
  /** e.g. Mortgage Loan */
  type: string;
};

export type ProductOverviewLoanTenure = {
  /** e.g. "6 Months" from product template when derivable */
  tenure: string | null;
  /**
   * Estimated total repayment (principal + simple interest) when tenure + monthly rate exist on product;
   * otherwise null — UI may show placeholder.
   */
  repayment: number | null;
  currency: string;
};

export type ProductOverviewLoanRequirement = {
  /** Primary requirement label from product.requirements when present */
  name: string | null;
};

/** One column/card on the General Info tab (one application / facility). */
export type ProductOverviewGeneralInfoCard = {
  applicationId: string;
  userId: string;
  loanInformation: ProductOverviewLoanInformation;
  loanTenure: ProductOverviewLoanTenure;
  loanRequirement: ProductOverviewLoanRequirement;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type ProductOverviewSummary = {
  requestedAmount: number;
  approvedAmount: number;
  pendingAmount: number;
  rejectedAmount: number;
  applicationCount: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  totalTransactionsAmount: number;
  completedTransactionsCount: number;
  pendingTransactionsCount: number;
  uniqueCustomerCount: number;
};

/** Latest drive document shown for “View” on the Customers tab. */
export type ProductOverviewSubmittedFile = {
  documentId: string;
  url: string;
  fileName: string;
};

/** One row for the Customers tab (table: name, email, user id, submitted file). */
export type ProductOverviewCustomerTabRow = {
  userId: string;
  userName: string;
  email: string;
  /**
   * Value for the “User ID” column: `user_ref` from client-auth when set, otherwise the Mongo `userId`.
   */
  userDisplayId: string;
  applicationIds: string[];
  applicationCount: number;
  /** Most recently uploaded drive document for this user on this app, if any. */
  submittedFile: ProductOverviewSubmittedFile | null;
};

/** Merchant-facing pricing slice from product-ms config. */
export type ProductOverviewPricingSettings = {
  feesAndCharges?: unknown;
  baseFeesAndCharges?: unknown;
  merchantFeeAdditions?: unknown;
  /** Passthrough of common merchant config keys when present on product doc */
  pricingType?: unknown;
  pricingCondition?: unknown;
  upperCap?: unknown;
  lowerCap?: unknown;
  springTDFee?: unknown;
  serviceFee?: unknown;
  markupRate?: unknown;
  customTerms?: unknown;
  enabledFeatures?: unknown;
};

export type ProductOverviewTransactionsTab = {
  items: Transaction[];
  pagination: { page: number; limit: number };
};

export type ProductOverviewTabs = {
  /** One entry per loan/mortgage application (or all scoped apps for non–loan-like products). */
  generalInfo: ProductOverviewGeneralInfoCard[];
  activeLoans: ProductOverviewLoanTableRow[];
  inactiveLoans: ProductOverviewLoanTableRow[];
  pendingLoans: ProductOverviewLoanTableRow[];
  customers: ProductOverviewCustomerTabRow[];
  transactions: ProductOverviewTransactionsTab;
  pricingSettings: ProductOverviewPricingSettings;
};

export type ProductOverviewResponse = {
  product: unknown;
  summary: ProductOverviewSummary;
  tabs: ProductOverviewTabs;
  warnings: string[];
};
