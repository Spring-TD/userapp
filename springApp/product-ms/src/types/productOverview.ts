import type { ProductDiscriminator } from './product';

export const PRODUCT_OVERVIEW_SCHEMA_VERSION = 1 as const;
export const PRODUCT_OVERVIEW_BY_TYPE_SCHEMA_VERSION = 1 as const;

export interface ProductOverviewHeadline {
  requestedAmount: number;
  approvedAmount: number;
  lendingApplicationsRequestedCount: number;
  lendingApplicationsApprovedCount: number;
  totalTransactions: number;
  totalSavings: number;
  totalInterest: number;
}

export interface ProductOverviewCategoryRow {
  type: ProductDiscriminator;
  configuredProductCount: number;
  applicationCount: number;
  customerCount: number;
  capitalAmount: number;
  issuedAmount: number;
  repaymentAmount: number;
  inventoryAmount: number;
  salesAmount: number;
}

export interface ProductOverview {
  schemaVersion: typeof PRODUCT_OVERVIEW_SCHEMA_VERSION;
  generatedAt: string;
  appId: string;
  headline: ProductOverviewHeadline;
  byCategory: ProductOverviewCategoryRow[];
}

export interface ProductOverviewByTypeRow {
  productId: string;
  referenceNumber: string;
  name: string;
  customerCount: number;
  applicationCount: number;
  capitalAmount: number;
  issuedAmount: number;
  repaymentAmount: number;
  inventoryAmount: number;
  salesAmount: number;
}

export interface ProductOverviewByTypeTotals {
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
