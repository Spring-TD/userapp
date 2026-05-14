import type { ProductDiscriminator } from './product';

/**
 * Stable overview payload for merchant product dashboards (`schemaVersion` bumps on breaking changes).
 * Monetary fields use the platform’s primary currency in major units (e.g. NGN); extend as requirements land.
 */
export const PRODUCT_OVERVIEW_SCHEMA_VERSION = 1 as const;

/** Top strip — lending totals from `contractSnapshot`; transactions/savings/interest still placeholders */
export interface ProductOverviewHeadline {
  /** Sum of principal on LOAN/MORTGAGE apps in requested/under_review pipeline (see `lendingSnapshotAmounts`) */
  requestedAmount: number;
  /** Sum of principal on LOAN/MORTGAGE apps with `loanWorkflowStatus: approved` */
  approvedAmount: number;
  /** Count of LOAN/MORTGAGE applications in “requested” state (includes legacy docs with no `loanWorkflowStatus`) */
  lendingApplicationsRequestedCount: number;
  /** Count of LOAN/MORTGAGE applications with `loanWorkflowStatus: approved` */
  lendingApplicationsApprovedCount: number;
  /**
   * Total transaction value for the app.
   * Canonical source: create-app-ms `GET /api/v1/apps/:id/transaction-stats` (credit + debit totals).
   */
  totalTransactions: number;
  /** Sum of current deposit/balance fields across SAVINGS + INVESTMENT application snapshots */
  totalSavings: number;
  /** Sum of cumulative interest paid fields across SAVINGS + INVESTMENT application snapshots */
  totalInterest: number;
}

/** Per–product-type block; COMMODITY may use `inventoryAmount` / `salesAmount` in the UI instead of capital/issued */
export interface ProductOverviewCategoryRow {
  type: ProductDiscriminator;
  /**
   * Total products of this type created for the app (`Product.appId` + discriminator).
   * Use this for dashboard category header counts (e.g. “Mortgage Products: N”).
   */
  configuredProductCount: number;
  /** Rows in `user_product_applications` for this app and type */
  applicationCount: number;
  /** Distinct `userId` values among those applications (unique holders for savings/investment cards) */
  customerCount: number;
  /**
   * LOAN/MORTGAGE: requested/under_review principal.
   * SAVINGS/INVESTMENT: total current balance / deposits held (`contractSnapshot`).
   * Other types: 0.
   */
  capitalAmount: number;
  /**
   * LOAN/MORTGAGE: approved principal.
   * SAVINGS/INVESTMENT: cumulative interest paid out to customers.
   * Other types: 0.
   */
  issuedAmount: number;
  /**
   * LOAN/MORTGAGE: repayments on approved apps.
   * SAVINGS/INVESTMENT: cumulative withdrawals.
   * COMMODITY: cost of goods sold (COGS), for backward compatibility with existing payload key.
   * Other types: 0.
   */
  repaymentAmount: number;
  /** COMMODITY: inventory value held (other types default 0) */
  inventoryAmount: number;
  /** COMMODITY: gross sales income (other types default 0) */
  salesAmount: number;
}

export interface ProductOverview {
  schemaVersion: typeof PRODUCT_OVERVIEW_SCHEMA_VERSION;
  generatedAt: string;
  appId: string;
  headline: ProductOverviewHeadline;
  byCategory: ProductOverviewCategoryRow[];
}

/** Per-product drill-down for one overview category (`schemaVersion` bumps on breaking changes). */
export const PRODUCT_OVERVIEW_BY_TYPE_SCHEMA_VERSION = 1 as const;

/** One configured product row for tables (e.g. all LOAN products for an app). */
export interface ProductOverviewByTypeRow {
  productId: string;
  referenceNumber: string;
  name: string;
  /** Distinct applicants (`userId`) for this product. */
  customerCount: number;
  applicationCount: number;
  /**
   * LOAN/MORTGAGE: requested/under_review principal sums.
   * SAVINGS/INVESTMENT: deposit/balance sums.
   * COMMODITY: 0 (use inventory / sales / repayment for COGS).
   */
  capitalAmount: number;
  /**
   * LOAN/MORTGAGE: approved principal sums.
   * SAVINGS/INVESTMENT: cumulative interest paid sums.
   * COMMODITY: 0.
   */
  issuedAmount: number;
  /**
   * LOAN/MORTGAGE: repayments on approved apps.
   * SAVINGS/INVESTMENT: withdrawals.
   * COMMODITY: COGS (same key as category overview).
   */
  repaymentAmount: number;
  /** COMMODITY inventory; other types 0. */
  inventoryAmount: number;
  /** COMMODITY sales; other types 0. */
  salesAmount: number;
}

export interface ProductOverviewByTypeTotals {
  /** Distinct customers across all applications of this `type` for the app (not a sum of row counts). */
  distinctCustomerCount: number;
  applicationCount: number;
  capitalAmount: number;
  issuedAmount: number;
  repaymentAmount: number;
  inventoryAmount: number;
  salesAmount: number;
}

export interface ProductOverviewByType {
  schemaVersion: typeof PRODUCT_OVERVIEW_BY_TYPE_SCHEMA_VERSION;
  generatedAt: string;
  appId: string;
  type: ProductDiscriminator;
  products: ProductOverviewByTypeRow[];
  totals: ProductOverviewByTypeTotals;
}
