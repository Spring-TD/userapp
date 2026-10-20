import { TransactionType, TransactionStatus } from '../models/Wallet';
import { TransactionModel } from '../models/TransactionModel';
import { koboToNaira, nairaToKobo } from '../utils/money';
import { normalizeTransactionDoc } from './transactionRepository';

const SAVINGS_WITHDRAWAL_CATEGORIES = [
  'SAVINGS_WITHDRAWAL',
  'SAVINGS_PAYOUT',
  'SAVINGS_EARLY_WITHDRAWAL'
] as const;

const INVESTMENT_LIQUIDATION_CATEGORIES = [
  'INVESTMENT_WITHDRAWAL',
  'INVESTMENT_LIQUIDATION',
  'INVESTMENT_PAYOUT',
  'INVESTMENT_LIQUIDATION_PAYOUT'
] as const;

const COMMODITY_LIQUIDATION_CATEGORIES = [
  'COMMODITY_WITHDRAWAL',
  'COMMODITY_LIQUIDATION',
  'COMMODITY_PAYOUT',
  'COMMODITY_LIQUIDATION_PAYOUT'
] as const;

export type TreasuryConsoleSettlementKind = 'withdrawals' | 'investments' | 'commodities' | 'savings';

/** Decision filter for history lists (maps to COMPLETED / FAILED tx status). */
export type TreasuryConsoleHistoryDecision = 'approved' | 'rejected' | 'all';

export interface TreasuryConsolePendingRow {
  id: string;
  reference: string;
  applicationId: string;
  userId?: string;
  productId?: string;
  productName?: string;
  customerName?: string;
  principal?: number;
  returnAmount?: number;
  amount: number;
  requestedOn: string;
  maturity?: string;
  requestingFrom?: string;
  status: 'pending';
  metadata?: Record<string, unknown>;
}

export interface TreasuryConsoleHistoryRow {
  id: string;
  reference: string;
  applicationId: string;
  userId?: string;
  productId?: string;
  productName?: string;
  customerName?: string;
  principal?: number;
  returnAmount?: number;
  amount: number;
  requestedOn: string;
  decidedAt: string;
  maturity?: string;
  requestingFrom?: string;
  /** Merchant decision: approved = COMPLETED, rejected = FAILED */
  status: 'approved' | 'rejected';
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface TreasuryConsoleHistoryPage {
  items: TreasuryConsoleHistoryRow[];
  pagination: {
    total: number;
    limit: number;
    skip: number;
    hasMore: boolean;
  };
}

function consoleListCap(limit: number): number {
  return Math.min(Math.max(limit, 1), 100);
}

function consoleSkip(skip: number): number {
  return Math.max(0, Math.floor(skip) || 0);
}

function metaString(meta: Record<string, unknown>, key: string): string | undefined {
  const v = meta[key];
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function metaNumber(meta: Record<string, unknown>, key: string): number | undefined {
  const v = meta[key];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return undefined;
}

function kindOrClause(kind: TreasuryConsoleSettlementKind): Record<string, unknown>[] {
  if (kind === 'withdrawals') {
    return [
      {
        category: {
          $in: [...SAVINGS_WITHDRAWAL_CATEGORIES, 'SAVINGS_WITHDRAWAL_REQUEST', 'SAVINGS_MATURITY_PAYOUT']
        }
      },
      { 'metadata.productType': 'SAVINGS', 'metadata.withdrawalRequest': true },
      { 'metadata.productType': 'SAVINGS', 'metadata.maturityPayout': true }
    ];
  }
  if (kind === 'savings') {
    return [
      { category: { $in: [...SAVINGS_WITHDRAWAL_CATEGORIES, 'SAVINGS_MATURITY_PAYOUT'] } },
      { 'metadata.productType': 'SAVINGS', 'metadata.maturityPayout': true }
    ];
  }
  if (kind === 'investments') {
    return [
      {
        category: {
          $in: [...INVESTMENT_LIQUIDATION_CATEGORIES, 'INVESTMENT_LIQUIDATION_REQUEST']
        }
      },
      { 'metadata.productType': 'INVESTMENT', 'metadata.liquidationRequest': true },
      { 'metadata.productType': 'INVESTMENT', 'metadata.maturityPayout': true }
    ];
  }
  return [
    {
      category: {
        $in: [...COMMODITY_LIQUIDATION_CATEGORIES, 'COMMODITY_LIQUIDATION_REQUEST']
      }
    },
    { 'metadata.productType': 'COMMODITY', 'metadata.liquidationRequest': true },
    { 'metadata.productType': 'COMMODITY', 'metadata.maturityPayout': true }
  ];
}

function pendingFilterForKind(appId: string, kind: TreasuryConsoleSettlementKind): Record<string, unknown> {
  return {
    type: TransactionType.DEBIT,
    status: TransactionStatus.PENDING,
    amount: { $gt: 0 },
    'metadata.appId': appId.trim(),
    $or: kindOrClause(kind)
  };
}

function historyStatusFilter(
  decision: TreasuryConsoleHistoryDecision
): TransactionStatus | { $in: TransactionStatus[] } {
  if (decision === 'approved') return TransactionStatus.COMPLETED;
  if (decision === 'rejected') return TransactionStatus.FAILED;
  return { $in: [TransactionStatus.COMPLETED, TransactionStatus.FAILED] };
}

function historyFilterForKind(
  appId: string,
  kind: TreasuryConsoleSettlementKind,
  decision: TreasuryConsoleHistoryDecision
): Record<string, unknown> {
  return {
    type: TransactionType.DEBIT,
    status: historyStatusFilter(decision),
    amount: { $gt: 0 },
    'metadata.appId': appId.trim(),
    $or: kindOrClause(kind)
  };
}

async function mapPendingDocsToRows(docs: unknown[]): Promise<TreasuryConsolePendingRow[]> {
  const results: TreasuryConsolePendingRow[] = [];
  for (const doc of docs) {
    const tx = await normalizeTransactionDoc(doc);
    if (!tx) continue;
    const meta =
      tx.metadata && typeof tx.metadata === 'object' && !Array.isArray(tx.metadata)
        ? (tx.metadata as Record<string, unknown>)
        : {};
    const applicationId = metaString(meta, 'applicationId') || '';
    const principal = metaNumber(meta, 'principal');
    const returnAmount =
      metaNumber(meta, 'returnAmount') ??
      metaNumber(meta, 'return') ??
      metaNumber(meta, 'interest');
    const amountNaira = koboToNaira(tx.amount);
    const requestedOn =
      tx.createdAt instanceof Date
        ? tx.createdAt.toISOString()
        : new Date(String(tx.createdAt || Date.now())).toISOString();
    results.push({
      id: tx.id,
      reference: String(tx.referenceId || '').trim() || `TX-${tx.id}`,
      applicationId,
      userId: metaString(meta, 'userId'),
      productId: metaString(meta, 'productId'),
      productName: metaString(meta, 'productName'),
      customerName: metaString(meta, 'customerName') ?? metaString(meta, 'customer'),
      principal: principal ?? amountNaira,
      returnAmount: returnAmount ?? 0,
      amount: amountNaira,
      requestedOn,
      maturity: metaString(meta, 'maturity') ?? metaString(meta, 'maturityDate'),
      requestingFrom: metaString(meta, 'requestingFrom') ?? metaString(meta, 'plan'),
      status: 'pending',
      metadata: meta
    });
  }
  return results;
}

async function mapHistoryDocsToRows(docs: unknown[]): Promise<TreasuryConsoleHistoryRow[]> {
  const results: TreasuryConsoleHistoryRow[] = [];
  for (const doc of docs) {
    const tx = await normalizeTransactionDoc(doc);
    if (!tx) continue;
    const rawStatus = String(tx.status || '').toUpperCase();
    if (rawStatus !== TransactionStatus.COMPLETED && rawStatus !== TransactionStatus.FAILED) {
      continue;
    }
    const meta =
      tx.metadata && typeof tx.metadata === 'object' && !Array.isArray(tx.metadata)
        ? (tx.metadata as Record<string, unknown>)
        : {};
    const applicationId = metaString(meta, 'applicationId') || '';
    const principal = metaNumber(meta, 'principal');
    const returnAmount =
      metaNumber(meta, 'returnAmount') ??
      metaNumber(meta, 'return') ??
      metaNumber(meta, 'interest');
    const amountNaira = koboToNaira(tx.amount);
    const requestedOn =
      tx.createdAt instanceof Date
        ? tx.createdAt.toISOString()
        : new Date(String(tx.createdAt || Date.now())).toISOString();
    const decidedAt =
      tx.updatedAt instanceof Date
        ? tx.updatedAt.toISOString()
        : new Date(String(tx.updatedAt || tx.createdAt || Date.now())).toISOString();
    const reason =
      metaString(meta, 'treasuryConsoleRejectReason') ??
      metaString(meta, 'rejectionReason') ??
      metaString(meta, 'reason') ??
      (typeof meta.rejectReason === 'string' ? meta.rejectReason : undefined);
    results.push({
      id: tx.id,
      reference: String(tx.referenceId || '').trim() || `TX-${tx.id}`,
      applicationId,
      userId: metaString(meta, 'userId'),
      productId: metaString(meta, 'productId'),
      productName: metaString(meta, 'productName'),
      customerName: metaString(meta, 'customerName') ?? metaString(meta, 'customer'),
      principal: principal ?? amountNaira,
      returnAmount: returnAmount ?? 0,
      amount: amountNaira,
      requestedOn,
      decidedAt,
      maturity: metaString(meta, 'maturity') ?? metaString(meta, 'maturityDate'),
      requestingFrom: metaString(meta, 'requestingFrom') ?? metaString(meta, 'plan'),
      status: rawStatus === TransactionStatus.COMPLETED ? 'approved' : 'rejected',
      ...(reason ? { reason } : {}),
      metadata: meta
    });
  }
  return results;
}

export async function listTreasuryConsolePending(
  appId: string,
  kind: TreasuryConsoleSettlementKind,
  limit = 50
): Promise<TreasuryConsolePendingRow[]> {
  const id = appId.trim();
  if (!id) return [];
  const cap = consoleListCap(limit);
  const docs = await TransactionModel.find(pendingFilterForKind(id, kind))
    .sort({ createdAt: -1 })
    .limit(cap)
    .lean();
  return mapPendingDocsToRows(docs);
}

/**
 * Decided treasury-console payouts (approve → COMPLETED, reject → FAILED).
 * Same product-kind matching as the pending queues.
 */
export async function listTreasuryConsoleHistory(
  appId: string,
  kind: TreasuryConsoleSettlementKind,
  options: {
    decision?: TreasuryConsoleHistoryDecision;
    limit?: number;
    skip?: number;
  } = {}
): Promise<TreasuryConsoleHistoryPage> {
  const id = appId.trim();
  const decision = options.decision ?? 'all';
  const limit = consoleListCap(options.limit ?? 50);
  const skip = consoleSkip(options.skip ?? 0);
  if (!id) {
    return { items: [], pagination: { total: 0, limit, skip, hasMore: false } };
  }

  const filter = historyFilterForKind(id, kind, decision);
  const [total, docs] = await Promise.all([
    TransactionModel.countDocuments(filter),
    TransactionModel.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean()
  ]);
  const items = await mapHistoryDocsToRows(docs);
  return {
    items,
    pagination: {
      total,
      limit,
      skip,
      hasMore: skip + items.length < total
    }
  };
}

export async function findTreasuryConsolePendingByReference(
  appId: string,
  kind: TreasuryConsoleSettlementKind,
  reference: string
): Promise<TreasuryConsolePendingRow | null> {
  const ref = reference.trim();
  if (!ref || !appId.trim()) return null;
  const filter = pendingFilterForKind(appId.trim(), kind);
  const doc = await TransactionModel.findOne({
    ...filter,
    $or: [{ referenceId: ref }, { externalReference: ref }]
  }).lean();
  const rows = await mapPendingDocsToRows(doc ? [doc] : []);
  return rows[0] ?? null;
}

export async function markTreasuryConsoleTransactionStatus(
  transactionId: string,
  status: TransactionStatus.COMPLETED | TransactionStatus.FAILED,
  patch: Record<string, unknown> = {}
): Promise<void> {
  await TransactionModel.updateOne(
    { _id: transactionId },
    {
      $set: {
        status,
        updatedAt: new Date(),
        ...patch
      }
    }
  );
}

export async function sumTreasuryConsolePendingAmount(appId: string): Promise<number> {
  const kinds: TreasuryConsoleSettlementKind[] = [
    'withdrawals',
    'investments',
    'commodities',
    'savings'
  ];
  let totalKobo = 0;
  for (const kind of kinds) {
    const rows = await listTreasuryConsolePending(appId, kind, 100);
    for (const row of rows) {
      totalKobo += nairaToKobo(row.amount);
    }
  }
  return koboToNaira(totalKobo);
}
