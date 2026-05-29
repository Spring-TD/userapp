import { ProductModel } from '../models/ProductModel';
import { ProductApplicationModel } from '../models/ProductApplicationModel';
import type { ProductDiscriminator } from '../types/product';
import {
  PRODUCT_OVERVIEW_BY_TYPE_SCHEMA_VERSION,
  PRODUCT_OVERVIEW_SCHEMA_VERSION,
  type ProductOverview,
  type ProductOverviewByType,
  type ProductOverviewByTypeRow,
  type ProductOverviewByTypeTotals,
  type ProductOverviewCategoryRow,
  type ProductOverviewHeadline
} from '../types/productOverview';
import { getCanonicalTransactionTotalForApp } from './appTransactionStatsService';
import { discriminatorFromStoredType, normalizeProductType, PRODUCT_DISCRIMINATORS } from '../utils/productType';
import {
  extractCostOfGoodsSoldFromSnapshot,
  extractDepositBalanceFromSnapshot,
  extractInterestPaidFromSnapshot,
  extractInventoryFromSnapshot,
  extractPrincipalFromSnapshot,
  extractRepaymentFromSnapshot,
  extractSalesFromSnapshot,
  extractWithdrawalsFromSnapshot
} from '../utils/moneySnapshotAmounts';

const LENDING_TYPES: ProductDiscriminator[] = ['LOAN', 'MORTGAGE'];

type ApplicationOverviewDoc = {
  productId?: unknown;
  userId?: unknown;
  productType?: unknown;
  amount?: unknown;
  status?: unknown;
  loanWorkflowStatus?: unknown;
  contractSnapshot?: unknown;
};

type ProductAgg = {
  userIds: Set<string>;
  applicationCount: number;
  capitalAmount: number;
  issuedAmount: number;
  repaymentAmount: number;
  inventoryAmount: number;
  salesAmount: number;
};

function emptyHeadline(): ProductOverviewHeadline {
  return {
    requestedAmount: 0,
    approvedAmount: 0,
    lendingApplicationsRequestedCount: 0,
    lendingApplicationsApprovedCount: 0,
    totalTransactions: 0,
    totalSavings: 0,
    totalInterest: 0
  };
}

function emptyCategoryRow(type: ProductDiscriminator): ProductOverviewCategoryRow {
  return {
    type,
    configuredProductCount: 0,
    applicationCount: 0,
    customerCount: 0,
    capitalAmount: 0,
    issuedAmount: 0,
    repaymentAmount: 0,
    inventoryAmount: 0,
    salesAmount: 0
  };
}

function emptyProductAgg(): ProductAgg {
  return {
    userIds: new Set<string>(),
    applicationCount: 0,
    capitalAmount: 0,
    issuedAmount: 0,
    repaymentAmount: 0,
    inventoryAmount: 0,
    salesAmount: 0
  };
}

function emptyByTypeTotals(): ProductOverviewByTypeTotals {
  return {
    distinctCustomerCount: 0,
    applicationCount: 0,
    capitalAmount: 0,
    issuedAmount: 0,
    repaymentAmount: 0,
    inventoryAmount: 0,
    salesAmount: 0
  };
}

function snapshotFrom(doc: ApplicationOverviewDoc): Record<string, unknown> | undefined {
  return doc.contractSnapshot && typeof doc.contractSnapshot === 'object' && !Array.isArray(doc.contractSnapshot)
    ? (doc.contractSnapshot as Record<string, unknown>)
    : undefined;
}

function amountFrom(doc: ApplicationOverviewDoc): number {
  const amount = Number(doc.amount ?? 0);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function withAmountFallback(snapshotAmount: number, doc: ApplicationOverviewDoc): number {
  return snapshotAmount > 0 ? snapshotAmount : amountFrom(doc);
}

function normalizedStatus(doc: ApplicationOverviewDoc): string {
  return String(doc.status ?? '').trim().toUpperCase();
}

function workflowStatus(doc: ApplicationOverviewDoc): string {
  return String(doc.loanWorkflowStatus ?? '').trim().toLowerCase();
}

function isApprovedLending(doc: ApplicationOverviewDoc): boolean {
  return workflowStatus(doc) === 'approved' || normalizedStatus(doc) === 'APPROVED';
}

function isRequestedLending(doc: ApplicationOverviewDoc): boolean {
  const workflow = workflowStatus(doc);
  const status = normalizedStatus(doc);
  if (workflow === 'requested' || workflow === 'under_review') {
    return true;
  }
  return !workflow && (!status || status === 'PENDING');
}

function applyApplicationMoney(
  type: ProductDiscriminator,
  doc: ApplicationOverviewDoc,
  target: ProductAgg | { capitalAmount: number; issuedAmount: number; repaymentAmount: number; inventoryAmount: number; salesAmount: number },
  headline?: ProductOverviewHeadline
): void {
  const snapshot = snapshotFrom(doc);

  if (type === 'LOAN' || type === 'MORTGAGE') {
    const principal = withAmountFallback(extractPrincipalFromSnapshot(snapshot), doc);
    const repayment = extractRepaymentFromSnapshot(snapshot);
    if (isApprovedLending(doc)) {
      target.issuedAmount += principal;
      target.repaymentAmount += repayment;
      if (headline) {
        headline.approvedAmount += principal;
        headline.lendingApplicationsApprovedCount += 1;
      }
    } else if (isRequestedLending(doc)) {
      target.capitalAmount += principal;
      if (headline) {
        headline.requestedAmount += principal;
        headline.lendingApplicationsRequestedCount += 1;
      }
    }
    return;
  }

  if (type === 'SAVINGS' || type === 'INVESTMENT') {
    const deposits = withAmountFallback(extractDepositBalanceFromSnapshot(snapshot), doc);
    const interestPaid = extractInterestPaidFromSnapshot(snapshot);
    const withdrawals = extractWithdrawalsFromSnapshot(snapshot);
    target.capitalAmount += deposits;
    target.issuedAmount += interestPaid;
    target.repaymentAmount += withdrawals;
    if (headline) {
      headline.totalSavings += deposits;
      headline.totalInterest += interestPaid;
    }
    return;
  }

  if (type === 'COMMODITY') {
    target.inventoryAmount += extractInventoryFromSnapshot(snapshot);
    target.salesAmount += extractSalesFromSnapshot(snapshot);
    target.repaymentAmount += extractCostOfGoodsSoldFromSnapshot(snapshot);
  }
}

async function loadApplicationDocs(appId: string, productType?: ProductDiscriminator): Promise<ApplicationOverviewDoc[]> {
  const filter: Record<string, unknown> = { appId };
  if (productType) {
    filter.productType = productType;
  }

  return (await ProductApplicationModel.find(filter)
    .select({
      productId: 1,
      userId: 1,
      productType: 1,
      amount: 1,
      status: 1,
      loanWorkflowStatus: 1,
      contractSnapshot: 1
    })
    .lean()) as unknown as ApplicationOverviewDoc[];
}

export async function getProductOverviewForApp(
  appId: string,
  options?: { bearerToken?: string }
): Promise<ProductOverview> {
  const generatedAt = new Date().toISOString();

  const [productTypeCounts, applicationByType, applicationDocs, canonicalTransactionTotal] = await Promise.all([
    ProductModel.aggregate<{ _id: string; count: number }>([
      { $match: { appId } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]),
    ProductApplicationModel.aggregate<{
      _id: string;
      customerCount: number;
      applicationCount: number;
    }>([
      { $match: { appId } },
      {
        $group: {
          _id: '$productType',
          userIds: { $addToSet: '$userId' },
          applicationCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 1,
          customerCount: { $size: '$userIds' },
          applicationCount: 1
        }
      }
    ]),
    loadApplicationDocs(appId),
    getCanonicalTransactionTotalForApp(appId, options?.bearerToken).catch(() => 0)
  ]);

  const productCountByType = new Map<ProductDiscriminator, number>();
  for (const row of productTypeCounts) {
    const type = discriminatorFromStoredType(row._id != null ? String(row._id) : null);
    if (type) {
      productCountByType.set(type, (productCountByType.get(type) ?? 0) + row.count);
    }
  }

  const applicationStatsByType = new Map<ProductDiscriminator, { customerCount: number; applicationCount: number }>();
  for (const row of applicationByType) {
    const type = discriminatorFromStoredType(row._id != null ? String(row._id) : null);
    if (type) {
      applicationStatsByType.set(type, {
        customerCount: row.customerCount,
        applicationCount: row.applicationCount
      });
    }
  }

  const headline = emptyHeadline();
  headline.totalTransactions = canonicalTransactionTotal;

  const moneyByType = new Map<ProductDiscriminator, ProductAgg>();
  for (const type of PRODUCT_DISCRIMINATORS) {
    moneyByType.set(type, emptyProductAgg());
  }

  for (const doc of applicationDocs) {
    const type = discriminatorFromStoredType(String(doc.productType ?? ''));
    if (!type) {
      continue;
    }
    const money = moneyByType.get(type);
    if (!money) {
      continue;
    }
    applyApplicationMoney(type, doc, money, headline);
  }

  const byCategory: ProductOverviewCategoryRow[] = PRODUCT_DISCRIMINATORS.map((type) => {
    const row = emptyCategoryRow(type);
    row.configuredProductCount = productCountByType.get(type) ?? 0;

    const applicationStats = applicationStatsByType.get(type);
    if (applicationStats) {
      row.applicationCount = applicationStats.applicationCount;
      row.customerCount = applicationStats.customerCount;
    }

    const money = moneyByType.get(type);
    if (money) {
      row.capitalAmount = money.capitalAmount;
      row.issuedAmount = money.issuedAmount;
      row.repaymentAmount = money.repaymentAmount;
      row.inventoryAmount = money.inventoryAmount;
      row.salesAmount = money.salesAmount;
    }

    return row;
  });

  return {
    schemaVersion: PRODUCT_OVERVIEW_SCHEMA_VERSION,
    generatedAt,
    appId,
    headline,
    byCategory
  };
}

export async function getProductOverviewByTypeForApp(
  appId: string,
  productType: ProductDiscriminator
): Promise<ProductOverviewByType> {
  const generatedAt = new Date().toISOString();

  const [productDocs, applicationDocs] = await Promise.all([
    ProductModel.find({ appId, type: productType })
      .select({ _id: 1, referenceNumber: 1, name: 1 })
      .lean(),
    loadApplicationDocs(appId, productType)
  ]);

  const aggByProductId = new Map<string, ProductAgg>();
  const allUserIds = new Set<string>();

  const getAgg = (productId: string): ProductAgg => {
    let agg = aggByProductId.get(productId);
    if (!agg) {
      agg = emptyProductAgg();
      aggByProductId.set(productId, agg);
    }
    return agg;
  };

  for (const doc of applicationDocs) {
    const productId = String(doc.productId ?? '').trim();
    if (!productId) {
      continue;
    }

    const userId = String(doc.userId ?? '').trim();
    if (userId) {
      allUserIds.add(userId);
    }

    const agg = getAgg(productId);
    if (userId) {
      agg.userIds.add(userId);
    }
    agg.applicationCount += 1;
    applyApplicationMoney(productType, doc, agg);
  }

  const products: ProductOverviewByTypeRow[] = productDocs
    .map((product) => {
      const productId = String(product._id);
      const agg = aggByProductId.get(productId) ?? emptyProductAgg();
      return {
        productId,
        referenceNumber: String(product.referenceNumber ?? ''),
        name: String(product.name ?? ''),
        customerCount: agg.userIds.size,
        applicationCount: agg.applicationCount,
        capitalAmount: agg.capitalAmount,
        issuedAmount: agg.issuedAmount,
        repaymentAmount: agg.repaymentAmount,
        inventoryAmount: agg.inventoryAmount,
        salesAmount: agg.salesAmount
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  const totals = emptyByTypeTotals();
  totals.distinctCustomerCount = allUserIds.size;
  for (const row of products) {
    totals.applicationCount += row.applicationCount;
    totals.capitalAmount += row.capitalAmount;
    totals.issuedAmount += row.issuedAmount;
    totals.repaymentAmount += row.repaymentAmount;
    totals.inventoryAmount += row.inventoryAmount;
    totals.salesAmount += row.salesAmount;
  }

  return {
    schemaVersion: PRODUCT_OVERVIEW_BY_TYPE_SCHEMA_VERSION,
    generatedAt,
    appId,
    type: normalizeProductType(productType),
    products,
    totals
  };
}
