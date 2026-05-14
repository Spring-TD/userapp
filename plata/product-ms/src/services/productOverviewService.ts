import { ProductModel } from '../models/ProductModel';
import { UserProductApplicationModel } from '../models/UserProductApplicationModel';
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
import {
  extractCostOfGoodsSoldFromContractSnapshot,
  extractInventoryFromContractSnapshot,
  extractSalesFromContractSnapshot
} from '../utils/commoditySnapshotAmounts';
import {
  extractPrincipalFromContractSnapshot,
  extractRepaymentFromContractSnapshot,
  isLendingRequestedPipelineStatus
} from '../utils/lendingSnapshotAmounts';
import {
  extractDepositBalanceFromContractSnapshot,
  extractInterestPaidFromContractSnapshot,
  extractWithdrawalsFromContractSnapshot
} from '../utils/savingsInvestmentSnapshotAmounts';
import { getCanonicalTransactionTotalForApp } from './appTransactionStatsService';
import { discriminatorFromStoredType, normalizeProductType, PRODUCT_DISCRIMINATORS } from '../utils/productType';

const LENDING_TYPES = ['LOAN', 'MORTGAGE'] as const;

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

/**
 * Aggregates product and application metrics for a single app (`Product.appId` / `UserProductApplication.appId`).
 */
export async function getProductOverviewForApp(
  appId: string,
  options?: { bearerToken?: string }
): Promise<ProductOverview> {
  const generatedAt = new Date().toISOString();

  const [
    productTypeCounts,
    applicationByType,
    lendingRequestedCount,
    lendingApprovedCount,
    applicationSnapshotDocs,
    canonicalTransactionTotal
  ] = await Promise.all([
    ProductModel.aggregate<{ _id: string; count: number }>([
      { $match: { appId } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]),
    UserProductApplicationModel.aggregate<{
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
    UserProductApplicationModel.countDocuments({
      appId,
      productType: { $in: [...LENDING_TYPES] },
      $or: [
        { loanWorkflowStatus: 'requested' },
        { loanWorkflowStatus: { $exists: false } },
        { loanWorkflowStatus: null }
      ]
    }),
    UserProductApplicationModel.countDocuments({
      appId,
      productType: { $in: [...LENDING_TYPES] },
      loanWorkflowStatus: 'approved'
    }),
    UserProductApplicationModel.find({ appId })
      .select({ contractSnapshot: 1, loanWorkflowStatus: 1, productType: 1 })
      .lean(),
    getCanonicalTransactionTotalForApp(appId, options?.bearerToken).catch(() => 0)
  ]);

  const productCountByType = new Map<ProductDiscriminator, number>();
  for (const row of productTypeCounts) {
    const disc = discriminatorFromStoredType(row._id != null ? String(row._id) : null);
    if (disc != null) {
      productCountByType.set(disc, (productCountByType.get(disc) ?? 0) + row.count);
    }
  }

  const applicationStatsByType = new Map<
    string,
    { customerCount: number; applicationCount: number }
  >();
  for (const row of applicationByType) {
    if (row._id != null) {
      applicationStatsByType.set(String(row._id), {
        customerCount: row.customerCount,
        applicationCount: row.applicationCount
      });
    }
  }

  const lendingMoney: Record<
    'LOAN' | 'MORTGAGE',
    { capitalAmount: number; issuedAmount: number; repaymentAmount: number }
  > = {
    LOAN: { capitalAmount: 0, issuedAmount: 0, repaymentAmount: 0 },
    MORTGAGE: { capitalAmount: 0, issuedAmount: 0, repaymentAmount: 0 }
  };

  let headlineRequestedPrincipal = 0;
  let headlineApprovedPrincipal = 0;
  let headlineTotalSavingsDeposits = 0;
  let headlineTotalInterestPaidSavers = 0;

  const savingsMoney: Record<
    'SAVINGS' | 'INVESTMENT',
    { capitalAmount: number; issuedAmount: number; repaymentAmount: number }
  > = {
    SAVINGS: { capitalAmount: 0, issuedAmount: 0, repaymentAmount: 0 },
    INVESTMENT: { capitalAmount: 0, issuedAmount: 0, repaymentAmount: 0 }
  };
  const commodityMoney = { inventoryAmount: 0, salesAmount: 0, costOfGoodsSoldAmount: 0 };

  for (const doc of applicationSnapshotDocs) {
    let pType: ProductDiscriminator;
    try {
      pType = normalizeProductType(String(doc.productType ?? ''));
    } catch {
      continue;
    }
    const snap = doc.contractSnapshot as Record<string, unknown> | undefined;
    if (pType === 'LOAN' || pType === 'MORTGAGE') {
      const principal = extractPrincipalFromContractSnapshot(snap);
      const repayment = extractRepaymentFromContractSnapshot(snap);
      const wf = doc.loanWorkflowStatus as string | undefined | null;

      if (wf === 'approved') {
        lendingMoney[pType].issuedAmount += principal;
        lendingMoney[pType].repaymentAmount += repayment;
        headlineApprovedPrincipal += principal;
      } else if (isLendingRequestedPipelineStatus(wf)) {
        lendingMoney[pType].capitalAmount += principal;
        headlineRequestedPrincipal += principal;
      }
      continue;
    }

    if (pType === 'SAVINGS' || pType === 'INVESTMENT') {
      const deposits = extractDepositBalanceFromContractSnapshot(snap);
      const interestPaid = extractInterestPaidFromContractSnapshot(snap);
      const withdrawals = extractWithdrawalsFromContractSnapshot(snap);
      savingsMoney[pType].capitalAmount += deposits;
      savingsMoney[pType].issuedAmount += interestPaid;
      savingsMoney[pType].repaymentAmount += withdrawals;
      headlineTotalSavingsDeposits += deposits;
      headlineTotalInterestPaidSavers += interestPaid;
      continue;
    }

    if (pType === 'COMMODITY') {
      const inventory = extractInventoryFromContractSnapshot(snap);
      const sales = extractSalesFromContractSnapshot(snap);
      const cogs = extractCostOfGoodsSoldFromContractSnapshot(snap);
      commodityMoney.inventoryAmount += inventory;
      commodityMoney.salesAmount += sales;
      commodityMoney.costOfGoodsSoldAmount += cogs;
    }
  }

  const byCategory: ProductOverviewCategoryRow[] = PRODUCT_DISCRIMINATORS.map((type) => {
    const row = emptyCategoryRow(type);
    row.configuredProductCount = productCountByType.get(type) ?? 0;
    const appStats = applicationStatsByType.get(type);
    if (appStats) {
      row.applicationCount = appStats.applicationCount;
      row.customerCount = appStats.customerCount;
    }
    if (type === 'LOAN' || type === 'MORTGAGE') {
      const m = lendingMoney[type];
      row.capitalAmount = m.capitalAmount;
      row.issuedAmount = m.issuedAmount;
      row.repaymentAmount = m.repaymentAmount;
    }
    if (type === 'SAVINGS' || type === 'INVESTMENT') {
      const m = savingsMoney[type];
      row.capitalAmount = m.capitalAmount;
      row.issuedAmount = m.issuedAmount;
      row.repaymentAmount = m.repaymentAmount;
    }
    if (type === 'COMMODITY') {
      row.inventoryAmount = commodityMoney.inventoryAmount;
      row.salesAmount = commodityMoney.salesAmount;
      // Backward-compatible field: UI can label this as "COGS" for commodity cards.
      row.repaymentAmount = commodityMoney.costOfGoodsSoldAmount;
    }
    return row;
  });

  const headline = emptyHeadline();
  headline.lendingApplicationsRequestedCount = lendingRequestedCount;
  headline.lendingApplicationsApprovedCount = lendingApprovedCount;
  headline.requestedAmount = headlineRequestedPrincipal;
  headline.approvedAmount = headlineApprovedPrincipal;
  headline.totalTransactions = canonicalTransactionTotal;
  headline.totalSavings = headlineTotalSavingsDeposits;
  headline.totalInterest = headlineTotalInterestPaidSavers;

  return {
    schemaVersion: PRODUCT_OVERVIEW_SCHEMA_VERSION,
    generatedAt,
    appId,
    headline,
    byCategory
  };
}

type ProductAgg = {
  userIds: Set<string>;
  applicationCount: number;
  capitalAmount: number;
  issuedAmount: number;
  repaymentAmount: number;
  inventoryAmount: number;
  salesAmount: number;
};

function emptyProductAgg(): ProductAgg {
  return {
    userIds: new Set(),
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

/**
 * Per-product breakdown for one overview category (dashboard drill-down table).
 * Rows follow configured `Product` documents for the app and `type`; amounts mirror `getProductOverviewForApp` rules.
 */
export async function getProductOverviewByTypeForApp(
  appId: string,
  productType: ProductDiscriminator
): Promise<ProductOverviewByType> {
  const generatedAt = new Date().toISOString();

  const [productDocs, applicationDocs] = await Promise.all([
    ProductModel.find({ appId, type: productType })
      .select({ _id: 1, referenceNumber: 1, name: 1 })
      .lean(),
    UserProductApplicationModel.find({ appId, productType })
      .select({
        globalProductId: 1,
        userId: 1,
        contractSnapshot: 1,
        loanWorkflowStatus: 1
      })
      .lean()
  ]);

  const aggByProductId = new Map<string, ProductAgg>();
  const allUserIds = new Set<string>();

  const getAgg = (productId: string): ProductAgg => {
    let a = aggByProductId.get(productId);
    if (!a) {
      a = emptyProductAgg();
      aggByProductId.set(productId, a);
    }
    return a;
  };

  for (const doc of applicationDocs) {
    const pid = String(doc.globalProductId ?? '');
    if (!pid) {
      continue;
    }
    const snap = doc.contractSnapshot as Record<string, unknown> | undefined;
    const uid = String(doc.userId ?? '');
    if (uid) {
      allUserIds.add(uid);
    }

    const a = getAgg(pid);
    a.userIds.add(uid);
    a.applicationCount += 1;

    if (productType === 'LOAN' || productType === 'MORTGAGE') {
      const principal = extractPrincipalFromContractSnapshot(snap);
      const repayment = extractRepaymentFromContractSnapshot(snap);
      const wf = doc.loanWorkflowStatus as string | undefined | null;
      if (wf === 'approved') {
        a.issuedAmount += principal;
        a.repaymentAmount += repayment;
      } else if (isLendingRequestedPipelineStatus(wf)) {
        a.capitalAmount += principal;
      }
      continue;
    }

    if (productType === 'SAVINGS' || productType === 'INVESTMENT') {
      a.capitalAmount += extractDepositBalanceFromContractSnapshot(snap);
      a.issuedAmount += extractInterestPaidFromContractSnapshot(snap);
      a.repaymentAmount += extractWithdrawalsFromContractSnapshot(snap);
      continue;
    }

    if (productType === 'COMMODITY') {
      a.inventoryAmount += extractInventoryFromContractSnapshot(snap);
      a.salesAmount += extractSalesFromContractSnapshot(snap);
      a.repaymentAmount += extractCostOfGoodsSoldFromContractSnapshot(snap);
    }
  }

  const rows: ProductOverviewByTypeRow[] = productDocs
    .map((p) => {
      const productId = String(p._id);
      const agg = aggByProductId.get(productId) ?? emptyProductAgg();
      return {
        productId,
        referenceNumber: String(p.referenceNumber ?? ''),
        name: String(p.name ?? ''),
        customerCount: agg.userIds.size,
        applicationCount: agg.applicationCount,
        capitalAmount: agg.capitalAmount,
        issuedAmount: agg.issuedAmount,
        repaymentAmount: agg.repaymentAmount,
        inventoryAmount: agg.inventoryAmount,
        salesAmount: agg.salesAmount
      };
    })
    .sort((x, y) => x.name.localeCompare(y.name, undefined, { sensitivity: 'base' }));

  const totals = emptyByTypeTotals();
  totals.distinctCustomerCount = allUserIds.size;
  for (const r of rows) {
    totals.applicationCount += r.applicationCount;
    totals.capitalAmount += r.capitalAmount;
    totals.issuedAmount += r.issuedAmount;
    totals.repaymentAmount += r.repaymentAmount;
    totals.inventoryAmount += r.inventoryAmount;
    totals.salesAmount += r.salesAmount;
  }

  return {
    schemaVersion: PRODUCT_OVERVIEW_BY_TYPE_SCHEMA_VERSION,
    generatedAt,
    appId,
    type: productType,
    products: rows,
    totals
  };
}
