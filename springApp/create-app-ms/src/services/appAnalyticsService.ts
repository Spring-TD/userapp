import { ApiError } from '../middleware/errorHandler';
import { TransactionMongoModel } from '../models/transaction.mongo';
import type { App } from '../types/app';
import {
  APP_ANALYTICS_SCHEMA_VERSION,
  type AppAnalytics,
  type AppAnalyticsPendingByProductRow,
  type AppAnalyticsProductBreakdownRow,
  type AppAnalyticsProductType,
  type AppAnalyticsRange,
  type AppAnalyticsTopAccountRow,
  type AppAnalyticsWeeklyVolumePoint
} from '../types/appAnalytics';
import { fetchAppCustomerContacts, fetchAppCustomerStats } from './clientAuthCustomerClient';

const PRODUCT_TYPES: AppAnalyticsProductType[] = [
  'MORTGAGE',
  'LOAN',
  'SAVINGS',
  'INVESTMENT',
  'COMMODITY'
];

const PRODUCT_LABELS: Record<AppAnalyticsProductType, string> = {
  MORTGAGE: 'Mortgage',
  LOAN: 'Loan',
  SAVINGS: 'Savings',
  INVESTMENT: 'Investment',
  COMMODITY: 'Commodity'
};

const RANGE_DAYS: Record<AppAnalyticsRange, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90
};

const TOP_ACCOUNTS_LIMIT = 10;

type RawTx = {
  amount: number;
  status: string;
  type?: string;
  category?: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
  productType?: AppAnalyticsProductType | 'UNKNOWN';
  userId?: string;
  customerName?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function parseRange(raw: unknown): AppAnalyticsRange {
  const v = String(raw || '30d')
    .trim()
    .toLowerCase();
  if (v === '7d' || v === '7') return '7d';
  if (v === '90d' || v === '90') return '90d';
  if (v === '30d' || v === '30' || v === '') return '30d';
  throw new ApiError(400, 'range must be one of: 7d, 30d, 90d');
}

function parseProductTypeFilter(raw: unknown): AppAnalyticsProductType | 'ALL' {
  const v = String(raw || 'ALL')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  if (!v || v === 'ALL' || v === 'ALL_PRODUCTS' || v === 'ALLPRODUCTS') return 'ALL';
  if ((PRODUCT_TYPES as string[]).includes(v)) return v as AppAnalyticsProductType;
  throw new ApiError(
    400,
    'productType must be one of: ALL, LOAN, MORTGAGE, SAVINGS, INVESTMENT, COMMODITY'
  );
}

function resolveProductType(tx: Record<string, unknown>): AppAnalyticsProductType | 'UNKNOWN' {
  const meta = asRecord(tx.metadata);
  const fromMeta = String(meta?.productType || tx.productType || '')
    .trim()
    .toUpperCase();
  if ((PRODUCT_TYPES as string[]).includes(fromMeta)) {
    return fromMeta as AppAnalyticsProductType;
  }

  const category = String(meta?.category || tx.category || '')
    .trim()
    .toUpperCase();
  if (category.includes('MORTGAGE')) return 'MORTGAGE';
  if (category.includes('COMMODITY')) return 'COMMODITY';
  if (category.includes('INVESTMENT')) return 'INVESTMENT';
  if (category.includes('SAVINGS')) return 'SAVINGS';
  if (category.includes('LOAN') || category === 'INTEREST_PAYMENT') return 'LOAN';

  const description = String(tx.description || '')
    .trim()
    .toUpperCase();
  if (description.includes('MORTGAGE')) return 'MORTGAGE';
  if (description.includes('COMMODITY')) return 'COMMODITY';
  if (description.includes('INVESTMENT')) return 'INVESTMENT';
  if (description.includes('SAVINGS')) return 'SAVINGS';
  if (description.includes('LOAN')) return 'LOAN';

  return 'UNKNOWN';
}

function normalizeStatus(status: unknown): 'pending' | 'completed' | 'failed' | 'cancelled' | 'other' {
  const s = String(status || '')
    .trim()
    .toLowerCase();
  if (s === 'pending') return 'pending';
  if (s === 'failed') return 'failed';
  if (s === 'cancelled' || s === 'canceled' || s === 'reversed') return 'cancelled';
  if (s === 'completed' || s === 'success' || s === 'successful') return 'completed';
  return 'other';
}

function absAmount(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.abs(n);
}

function formatOldest(ageMs: number): string {
  if (!Number.isFinite(ageMs) || ageMs < 0) return '';
  const minutes = Math.floor(ageMs / 60_000);
  if (minutes < 60) return `${Math.max(minutes, 1)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function roundPercent(n: number): number {
  return Math.round(n * 10) / 10;
}

function inRange(at: Date, start: Date, end: Date): boolean {
  const t = at.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function pickCustomerName(tx: Record<string, unknown>, meta?: Record<string, unknown>): string {
  const parties = asRecord(meta?.parties);
  const sender = asRecord(parties?.sender);
  const senderDetails = asRecord(tx.senderDetails);
  const candidates = [
    tx.contactName,
    tx.customerName,
    tx.userName,
    meta?.customerName,
    meta?.userName,
    meta?.contactName,
    sender?.name,
    senderDetails?.name
  ];
  for (const candidate of candidates) {
    const name = String(candidate || '').trim();
    if (name && name.toLowerCase() !== 'customer') return name;
  }
  return '';
}

function mapRawTx(tx: Record<string, unknown>): RawTx | null {
  const createdRaw = tx.createdAt;
  const createdAt =
    createdRaw instanceof Date
      ? createdRaw
      : new Date(String(createdRaw || ''));
  if (Number.isNaN(createdAt.getTime())) return null;
  const amount = absAmount(tx.amount);
  if (amount <= 0) return null;
  const meta = asRecord(tx.metadata) || undefined;
  const userId = String(tx.userId || meta?.userId || meta?.customerId || '').trim();
  const customerName = pickCustomerName(tx, meta);
  return {
    amount,
    status: String(tx.status || ''),
    type: typeof tx.type === 'string' ? tx.type : undefined,
    category: typeof meta?.category === 'string' ? meta.category : undefined,
    createdAt,
    metadata: meta,
    productType: resolveProductType(tx),
    ...(userId ? { userId } : {}),
    ...(customerName ? { customerName } : {})
  };
}

export class AppAnalyticsService {
  static async buildForApp(input: {
    app: App;
    range?: unknown;
    productType?: unknown;
  }): Promise<AppAnalytics> {
    const range = parseRange(input.range);
    const productTypeFilter = parseProductTypeFilter(input.productType);
    const days = RANGE_DAYS[range];
    const now = new Date();
    const periodEnd = now;
    const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const priorEnd = new Date(periodStart.getTime() - 1);
    const priorStart = new Date(priorEnd.getTime() - days * 24 * 60 * 60 * 1000);

    // ISO string dates sort lexicographically; createdAt is stored as ISO string on Spring.
    const fetchStartIso = priorStart.toISOString();
    const fetchEndIso = periodEnd.toISOString();

    const appId = String(input.app?.id ?? '').trim();
    const emptyCustomers = { registered: 0, active: 0, registeredDeltaThisMonth: 0 };

    const [docs, customerStats] = await Promise.all([
      TransactionMongoModel.find({
        appId,
        createdAt: { $gte: fetchStartIso, $lte: fetchEndIso }
      })
        .select({
          amount: 1,
          status: 1,
          type: 1,
          description: 1,
          metadata: 1,
          userId: 1,
          createdAt: 1
        })
        .lean(),
      fetchAppCustomerStats(appId).catch((error) => {
        console.warn('app analytics customer stats failed', {
          error: error instanceof Error ? error.message : String(error)
        });
        return emptyCustomers;
      })
    ]);

    const allTxs = docs
      .map((doc) => mapRawTx(doc as unknown as Record<string, unknown>))
      .filter((tx): tx is RawTx => tx !== null);

    // Also include open pending older than prior window so pending cards stay accurate
    const olderPendingDocs = await TransactionMongoModel.find({
      appId,
      status: 'pending',
      createdAt: { $lt: fetchStartIso }
    })
      .select({
        amount: 1,
        status: 1,
        type: 1,
        description: 1,
        metadata: 1,
        userId: 1,
        createdAt: 1
      })
      .lean();

    for (const doc of olderPendingDocs) {
      const mapped = mapRawTx(doc as unknown as Record<string, unknown>);
      if (mapped) allTxs.push(mapped);
    }

    const matchesFilter = (tx: RawTx): boolean => {
      if (productTypeFilter === 'ALL') return true;
      return tx.productType === productTypeFilter;
    };

    const currentTxs = allTxs.filter(
      (tx) => matchesFilter(tx) && inRange(tx.createdAt, periodStart, periodEnd)
    );
    const priorTxs = allTxs.filter(
      (tx) => matchesFilter(tx) && inRange(tx.createdAt, priorStart, priorEnd)
    );

    const volumeCurrent = currentTxs.reduce((sum, tx) => sum + tx.amount, 0);
    const volumePrior = priorTxs.reduce((sum, tx) => sum + tx.amount, 0);
    let changePercentVsPrior = 0;
    if (volumePrior > 0) {
      changePercentVsPrior = roundPercent(((volumeCurrent - volumePrior) / volumePrior) * 100);
    } else if (volumeCurrent > 0) {
      changePercentVsPrior = 100;
    }

    const pendingTxs = currentTxs.filter((tx) => normalizeStatus(tx.status) === 'pending');
    const pendingOpen = allTxs.filter(
      (tx) => matchesFilter(tx) && normalizeStatus(tx.status) === 'pending' && tx.createdAt <= periodEnd
    );
    const pendingForCards = pendingOpen.length ? pendingOpen : pendingTxs;

    let completed = 0;
    let failedOrReversed = 0;
    for (const tx of currentTxs) {
      const st = normalizeStatus(tx.status);
      if (st === 'completed') completed += 1;
      if (st === 'failed' || st === 'cancelled') failedOrReversed += 1;
    }
    const decided = completed + failedOrReversed;
    const successRatePercent = decided > 0 ? roundPercent((completed / decided) * 100) : 100;
    const failedOrReversedPercent =
      decided > 0 ? roundPercent((failedOrReversed / decided) * 100) : 0;

    const byProductType = buildByProductType(currentTxs);
    const weeklyVolume = buildWeeklyVolume(currentTxs, periodStart, periodEnd);
    const pendingByProductType = buildPendingByProduct(pendingForCards, now);
    const topAccountsByVolume = await buildTopAccountsByVolume(currentTxs, TOP_ACCOUNTS_LIMIT);

    const currency = 'NGN';
    return {
      schemaVersion: APP_ANALYTICS_SCHEMA_VERSION,
      generatedAt: now.toISOString(),
      appId,
      merchantId: input.app.merchantId,
      currency,
      range,
      productType: productTypeFilter,
      period: { start: periodStart.toISOString(), end: periodEnd.toISOString() },
      priorPeriod: { start: priorStart.toISOString(), end: priorEnd.toISOString() },
      customers: {
        registered: customerStats.registered,
        active: customerStats.active,
        registeredDeltaThisMonth: customerStats.registeredDeltaThisMonth
      },
      transactionVolume: {
        amount: roundMoney(volumeCurrent),
        currency,
        changePercentVsPrior,
        comparisonLabel: `prior ${range}`
      },
      pendingTransactions: {
        count: pendingForCards.length,
        amount: roundMoney(pendingForCards.reduce((s, tx) => s + tx.amount, 0)),
        currency
      },
      successRate: {
        successRatePercent,
        failedOrReversedPercent
      },
      byProductType,
      weeklyVolume,
      pendingByProductType,
      topAccountsByVolume
    };
  }
}

function buildByProductType(txs: RawTx[]): AppAnalyticsProductBreakdownRow[] {
  const buckets = new Map<AppAnalyticsProductType, { amount: number; count: number }>();
  for (const type of PRODUCT_TYPES) {
    buckets.set(type, { amount: 0, count: 0 });
  }
  for (const tx of txs) {
    const pt = tx.productType;
    if (!pt || pt === 'UNKNOWN') continue;
    const b = buckets.get(pt);
    if (!b) continue;
    b.amount += tx.amount;
    b.count += 1;
  }
  const totalAmount = [...buckets.values()].reduce((s, b) => s + b.amount, 0);
  return PRODUCT_TYPES.map((productType) => {
    const b = buckets.get(productType) ?? { amount: 0, count: 0 };
    const percentage = totalAmount > 0 ? roundPercent((b.amount / totalAmount) * 100) : 0;
    return {
      productType,
      label: PRODUCT_LABELS[productType],
      amount: roundMoney(b.amount),
      transactionCount: b.count,
      percentage
    };
  });
}

function buildWeeklyVolume(
  txs: RawTx[],
  periodStart: Date,
  periodEnd: Date
): AppAnalyticsWeeklyVolumePoint[] {
  const span = Math.max(periodEnd.getTime() - periodStart.getTime(), 1);
  const bucketMs = span / 4;
  const points: AppAnalyticsWeeklyVolumePoint[] = [];
  for (let i = 0; i < 4; i++) {
    const start = new Date(periodStart.getTime() + i * bucketMs);
    const end = i === 3 ? periodEnd : new Date(periodStart.getTime() + (i + 1) * bucketMs - 1);
    const amount = txs
      .filter((tx) => inRange(tx.createdAt, start, end))
      .reduce((s, tx) => s + tx.amount, 0);
    points.push({
      week: i + 1,
      label: `Week ${i + 1}`,
      start: start.toISOString(),
      end: end.toISOString(),
      amount: roundMoney(amount)
    });
  }
  return points;
}

function buildPendingByProduct(pendingTxs: RawTx[], now: Date): AppAnalyticsPendingByProductRow[] {
  const buckets = new Map<
    AppAnalyticsProductType,
    { count: number; value: number; oldestAt?: Date }
  >();
  for (const type of PRODUCT_TYPES) {
    buckets.set(type, { count: 0, value: 0 });
  }
  for (const tx of pendingTxs) {
    const pt = tx.productType;
    if (!pt || pt === 'UNKNOWN') continue;
    const b = buckets.get(pt);
    if (!b) continue;
    b.count += 1;
    b.value += tx.amount;
    if (!b.oldestAt || tx.createdAt < b.oldestAt) {
      b.oldestAt = tx.createdAt;
    }
  }
  return PRODUCT_TYPES.map((productType) => {
    const b = buckets.get(productType) ?? { count: 0, value: 0 };
    const oldestAt = b.oldestAt;
    return {
      productType,
      label: PRODUCT_LABELS[productType],
      pendingCount: b.count,
      value: roundMoney(b.value),
      oldest: oldestAt ? formatOldest(now.getTime() - oldestAt.getTime()) : '',
      ...(oldestAt ? { oldestAt: oldestAt.toISOString() } : {})
    };
  });
}

function formatAccountStatus(raw: string | undefined): string {
  const s = String(raw || 'active')
    .trim()
    .toLowerCase();
  if (s === 'active') return 'Active';
  if (s === 'pending') return 'Pending';
  if (s === 'suspended') return 'Suspended';
  if (s === 'deactivated') return 'Inactive';
  if (!s) return 'Active';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function buildTopAccountsByVolume(
  txs: RawTx[],
  limit: number
): Promise<AppAnalyticsTopAccountRow[]> {
  type Bucket = {
    userId: string;
    productType: AppAnalyticsProductType;
    volume: number;
    count: number;
    customerName?: string;
  };
  const buckets = new Map<string, Bucket>();

  for (const tx of txs) {
    const userId = tx.userId?.trim();
    const productType = tx.productType;
    if (!userId || !productType || productType === 'UNKNOWN') continue;
    const key = `${userId}::${productType}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.volume += tx.amount;
      existing.count += 1;
      if (!existing.customerName && tx.customerName) existing.customerName = tx.customerName;
    } else {
      buckets.set(key, {
        userId,
        productType,
        volume: tx.amount,
        count: 1,
        ...(tx.customerName ? { customerName: tx.customerName } : {})
      });
    }
  }

  const ranked = [...buckets.values()].sort((a, b) => b.volume - a.volume).slice(0, limit);
  if (!ranked.length) return [];

  const contacts = await fetchAppCustomerContacts(ranked.map((r) => r.userId));

  return ranked.map((row) => {
    const contact = contacts.get(row.userId);
    const volume = roundMoney(row.volume);
    const transactionCount = row.count;
    const contactName = String(contact?.userName || '').trim();
    const customerName =
      (contactName && contactName.toLowerCase() !== 'customer' ? contactName : '') ||
      row.customerName ||
      contactName ||
      'Customer';
    return {
      userId: row.userId,
      customerName,
      productType: row.productType,
      product: PRODUCT_LABELS[row.productType],
      volume,
      transactionCount,
      averageTicket: transactionCount > 0 ? roundMoney(volume / transactionCount) : 0,
      status: formatAccountStatus(contact?.status)
    };
  });
}
