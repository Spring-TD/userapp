/**
 * App-scoped merchant analytics (`GET /api/v1/apps/:appId/analytics`).
 * Monetary fields are major currency units (e.g. NGN).
 */

export const APP_ANALYTICS_SCHEMA_VERSION = 1 as const;

export type AppAnalyticsRange = '7d' | '30d' | '90d';

export type AppAnalyticsProductType =
  | 'LOAN'
  | 'MORTGAGE'
  | 'SAVINGS'
  | 'INVESTMENT'
  | 'COMMODITY';

export interface AppAnalyticsVolumeMetric {
  amount: number;
  currency: string;
  /** Percent change vs the immediately prior window of the same length (e.g. prior 30d). */
  changePercentVsPrior: number;
  comparisonLabel: string;
}

export interface AppAnalyticsPendingMetric {
  count: number;
  amount: number;
  currency: string;
}

export interface AppAnalyticsSuccessMetric {
  /** 0–100 */
  successRatePercent: number;
  /** 0–100 — failed + cancelled / reversed share */
  failedOrReversedPercent: number;
}

export interface AppAnalyticsProductBreakdownRow {
  productType: AppAnalyticsProductType;
  label: string;
  amount: number;
  transactionCount: number;
  /** 0–100 share of volume among the five product types */
  percentage: number;
}

export interface AppAnalyticsWeeklyVolumePoint {
  week: number;
  label: string;
  /** Start of bucket (ISO) */
  start: string;
  /** End of bucket (ISO) */
  end: string;
  amount: number;
}

export interface AppAnalyticsPendingByProductRow {
  productType: AppAnalyticsProductType;
  label: string;
  pendingCount: number;
  value: number;
  /** Human duration of oldest pending tx, e.g. `4d`, `6h`, `45m`. Empty if none. */
  oldest: string;
  oldestAt?: string;
}

/** Retail customers on the app (`client-auth-ms` users with `app_id`). */
export interface AppAnalyticsCustomersMetric {
  /** All registered storefront users for the app. */
  registered: number;
  /** Subset with account `status: active`. */
  active: number;
  /** Registrations whose `created_at` falls in the current calendar month (Africa/Lagos). */
  registeredDeltaThisMonth: number;
}

/** One row for “Volume per customer, top accounts”. */
export interface AppAnalyticsTopAccountRow {
  userId: string;
  customerName: string;
  productType: AppAnalyticsProductType;
  product: string;
  volume: number;
  transactionCount: number;
  averageTicket: number;
  status: string;
}

export interface AppAnalytics {
  schemaVersion: typeof APP_ANALYTICS_SCHEMA_VERSION;
  generatedAt: string;
  appId: string;
  merchantId: string;
  currency: string;
  range: AppAnalyticsRange;
  productType: AppAnalyticsProductType | 'ALL';
  period: {
    start: string;
    end: string;
  };
  priorPeriod: {
    start: string;
    end: string;
  };
  customers: AppAnalyticsCustomersMetric;
  transactionVolume: AppAnalyticsVolumeMetric;
  pendingTransactions: AppAnalyticsPendingMetric;
  successRate: AppAnalyticsSuccessMetric;
  byProductType: AppAnalyticsProductBreakdownRow[];
  weeklyVolume: AppAnalyticsWeeklyVolumePoint[];
  pendingByProductType: AppAnalyticsPendingByProductRow[];
  /** Top customer×product rows by volume in the selected period (default limit 10). */
  topAccountsByVolume: AppAnalyticsTopAccountRow[];
}
