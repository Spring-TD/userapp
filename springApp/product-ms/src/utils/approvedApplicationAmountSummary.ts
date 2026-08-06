import type {
  ApprovedApplicationAmountBucket,
  ApprovedApplicationAmountSummary
} from '../types/productApplication';

const STOREFRONT_PRODUCT_TYPES = ['LOAN', 'MORTGAGE', 'SAVINGS', 'INVESTMENT', 'COMMODITY'] as const;

export interface ApprovedAmountAggregateRow {
  _id: {
    productType?: string;
    currency?: string;
  };
  totalAmount?: number;
  applicationCount?: number;
}

function emptyBucket(currency: string): ApprovedApplicationAmountBucket {
  return {
    totalAmount: 0,
    applicationCount: 0,
    currency
  };
}

export function buildApprovedApplicationAmountSummary(
  userId: string,
  appId: string | undefined,
  rows: ApprovedAmountAggregateRow[],
  defaultCurrency = 'NGN'
): ApprovedApplicationAmountSummary {
  const summary: Record<string, ApprovedApplicationAmountBucket> = Object.fromEntries(
    STOREFRONT_PRODUCT_TYPES.map((type) => [type, emptyBucket(defaultCurrency)])
  );

  for (const row of rows) {
    const productType = row._id.productType?.trim().toUpperCase();
    if (!productType) continue;

    const currency = row._id.currency?.trim().toUpperCase() || defaultCurrency;
    const bucket = summary[productType] ?? emptyBucket(currency);
    bucket.totalAmount += Number(row.totalAmount) || 0;
    bucket.applicationCount += Number(row.applicationCount) || 0;
    bucket.currency = currency;
    summary[productType] = bucket;
  }

  return {
    userId,
    ...(appId ? { appId } : {}),
    status: 'APPROVED',
    summary
  };
}
