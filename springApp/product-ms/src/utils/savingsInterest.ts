import type { Product } from '../types/product';
import { resolveOfferYieldPercent } from './commodityPricing';

const LAGOS_OFFSET_MS = 60 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_ACCRUAL_DAYS = 120;

export type SavingsActivityType = 'INTEREST' | 'TOP_UP' | 'DEPOSIT' | 'WITHDRAWAL';

export type SavingsActivityLedgerEntry = {
  id: string;
  type: SavingsActivityType;
  title: string;
  subtitle: string;
  amount: number;
  balanceAfter: number;
  grossInterest?: number;
  managementFee?: number;
  netInterest?: number;
  referenceId: string;
  at: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function isFlexibleSavingsProduct(product: Product): boolean {
  const flexibility = String(product.structure?.withdrawalFlexibility || '')
    .trim()
    .toLowerCase();
  return flexibility === 'anytime' || flexibility === 'flexible';
}

/** Anytime / flexible withdrawal for SAVINGS or INVESTMENT (Plata withdrawalFlexibility). */
export function isAnytimeDepositProduct(product: Product): boolean {
  return isFlexibleSavingsProduct(product);
}

export function resolveSavingsInterestRatePercent(product: Product): number {
  return resolveOfferYieldPercent(product).ratePercent;
}

/** Management fee on interest: Prefer Percent Management Fee from feesAndCharges; default 10% for flex daily UI. */
export function resolveInterestManagementFeePercent(product: Product): number {
  const fees = product.feesAndCharges?.fees;
  if (Array.isArray(fees)) {
    for (const fee of fees) {
      const name = String(fee?.name || '').trim().toLowerCase();
      if (!name.includes('management')) continue;
      const feeType = String(fee?.feeType || '').trim().toLowerCase();
      const value = Number(fee?.value);
      if (!Number.isFinite(value) || value < 0) continue;
      if (feeType === 'percent' || feeType === 'percentage' || feeType === '%') {
        return value;
      }
    }
  }
  return isFlexibleSavingsProduct(product) ? 10 : 0;
}

export function shouldAccrueDailyInterest(product: Product): boolean {
  const method = String(product.structure?.interestMethod || '')
    .trim()
    .toLowerCase();
  if (method === 'daily') return true;
  // Flex / anytime plans in the storefront mock accrue daily even when method is omitted.
  return isFlexibleSavingsProduct(product);
}

function startOfDayLagos(date: Date): Date {
  const lagos = new Date(date.getTime() + LAGOS_OFFSET_MS);
  const startLagosUtc = Date.UTC(
    lagos.getUTCFullYear(),
    lagos.getUTCMonth(),
    lagos.getUTCDate(),
    0,
    0,
    0,
    0
  );
  return new Date(startLagosUtc - LAGOS_OFFSET_MS);
}

export { startOfDayLagos };

export function currentWeekBoundsLagos(now = new Date()): { weekStart: Date; weekEnd: Date } {
  const lagos = new Date(now.getTime() + LAGOS_OFFSET_MS);
  const day = lagos.getUTCDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const mondayUtcMidnightLagos = Date.UTC(
    lagos.getUTCFullYear(),
    lagos.getUTCMonth(),
    lagos.getUTCDate() - daysFromMonday,
    0,
    0,
    0,
    0
  );
  const weekStart = new Date(mondayUtcMidnightLagos - LAGOS_OFFSET_MS);
  const weekEnd = new Date(weekStart.getTime() + 7 * MS_PER_DAY - 1);
  return { weekStart, weekEnd };
}

export function startOfMonthLagos(now = new Date()): Date {
  const lagos = new Date(now.getTime() + LAGOS_OFFSET_MS);
  const startLagosUtc = Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth(), 1, 0, 0, 0, 0);
  return new Date(startLagosUtc - LAGOS_OFFSET_MS);
}

export function readActivityLedger(snapshot: Record<string, unknown> | undefined): SavingsActivityLedgerEntry[] {
  const raw = snapshot?.activityLedger;
  if (!Array.isArray(raw)) return [];
  const rows: SavingsActivityLedgerEntry[] = [];
  for (const item of raw) {
    const row = asRecord(item);
    if (!row) continue;
    const type = String(row.type || '').trim().toUpperCase();
    if (type !== 'INTEREST' && type !== 'TOP_UP' && type !== 'DEPOSIT' && type !== 'WITHDRAWAL') {
      continue;
    }
    const amount = Number(row.amount);
    const balanceAfter = Number(row.balanceAfter);
    const at = typeof row.at === 'string' ? row.at : '';
    const referenceId = typeof row.referenceId === 'string' ? row.referenceId : '';
    if (!at || !referenceId || !Number.isFinite(amount)) continue;
    rows.push({
      id: typeof row.id === 'string' && row.id.trim() ? row.id.trim() : referenceId,
      type: type as SavingsActivityType,
      title: typeof row.title === 'string' && row.title.trim() ? row.title.trim() : type,
      subtitle: typeof row.subtitle === 'string' ? row.subtitle : '',
      amount,
      balanceAfter: Number.isFinite(balanceAfter) ? balanceAfter : amount,
      grossInterest: Number.isFinite(Number(row.grossInterest)) ? Number(row.grossInterest) : undefined,
      managementFee: Number.isFinite(Number(row.managementFee)) ? Number(row.managementFee) : undefined,
      netInterest: Number.isFinite(Number(row.netInterest)) ? Number(row.netInterest) : undefined,
      referenceId,
      at
    });
  }
  return rows;
}

export function sumInterestInRange(
  ledger: SavingsActivityLedgerEntry[],
  fromInclusive: Date,
  toInclusive: Date
): number {
  let total = 0;
  for (const row of ledger) {
    if (row.type !== 'INTEREST') continue;
    const at = new Date(row.at);
    if (Number.isNaN(at.getTime())) continue;
    if (at >= fromInclusive && at <= toInclusive) {
      total += row.netInterest != null ? row.netInterest : row.amount;
    }
  }
  return roundMoney(total);
}

/**
 * Accrue daily net interest into the snapshot for missed calendar days (Lagos).
 * Idempotent per day via reference `savings-interest:{applicationId}:{yyyy-mm-dd}`.
 */
export function accrueDailyInterestOnSnapshot(input: {
  snapshot: Record<string, unknown>;
  product: Product;
  productName: string;
  applicationId: string;
  balance: number;
  now?: Date;
}): {
  snapshot: Record<string, unknown>;
  balance: number;
  accruedNet: number;
  newEntries: SavingsActivityLedgerEntry[];
} {
  const now = input.now ?? new Date();
  const ratePercent = resolveSavingsInterestRatePercent(input.product);
  if (!shouldAccrueDailyInterest(input.product) || ratePercent <= 0 || input.balance <= 0) {
    return {
      snapshot: input.snapshot,
      balance: input.balance,
      accruedNet: 0,
      newEntries: []
    };
  }

  const feePercent = resolveInterestManagementFeePercent(input.product);
  const ledger = readActivityLedger(input.snapshot);
  const existingRefs = new Set(ledger.map((row) => row.referenceId));

  const lastAccruedRaw =
    (typeof input.snapshot.lastInterestAccruedAt === 'string' && input.snapshot.lastInterestAccruedAt) ||
    (typeof input.snapshot.firstDepositAt === 'string' && input.snapshot.firstDepositAt) ||
    (typeof input.snapshot.lastDepositAt === 'string' && input.snapshot.lastDepositAt) ||
    (typeof input.snapshot.fundedAt === 'string' && input.snapshot.fundedAt) ||
    undefined;

  let cursor = lastAccruedRaw ? startOfDayLagos(new Date(lastAccruedRaw)) : null;
  if (!cursor || Number.isNaN(cursor.getTime())) {
    return {
      snapshot: input.snapshot,
      balance: input.balance,
      accruedNet: 0,
      newEntries: []
    };
  }

  // Start the day after last accrual / funding day.
  cursor = new Date(cursor.getTime() + MS_PER_DAY);
  const todayStart = startOfDayLagos(now);
  const newEntries: SavingsActivityLedgerEntry[] = [];
  let balance = input.balance;
  let accruedNet = 0;
  let days = 0;

  while (cursor <= todayStart && days < MAX_ACCRUAL_DAYS) {
    const y = new Date(cursor.getTime() + LAGOS_OFFSET_MS);
    const dayKey = `${y.getUTCFullYear()}-${String(y.getUTCMonth() + 1).padStart(2, '0')}-${String(
      y.getUTCDate()
    ).padStart(2, '0')}`;
    const referenceId = `savings-interest:${input.applicationId}:${dayKey}`;
    if (!existingRefs.has(referenceId) && balance > 0) {
      const gross = roundMoney(balance * (ratePercent / 100) / 365);
      const managementFee = roundMoney(gross * (feePercent / 100));
      const net = roundMoney(Math.max(0, gross - managementFee));
      if (net > 0 || gross > 0) {
        balance = roundMoney(balance + net);
        accruedNet = roundMoney(accruedNet + net);
        const at = new Date(cursor.getTime() + 10 * 60 * 60 * 1000).toISOString(); // ~10:00 Lagos-ish
        const entry: SavingsActivityLedgerEntry = {
          id: referenceId,
          type: 'INTEREST',
          title: 'Interest earned',
          subtitle: `${input.productName} · Daily Interest Payment`,
          amount: net,
          balanceAfter: balance,
          grossInterest: gross,
          managementFee,
          netInterest: net,
          referenceId,
          at
        };
        newEntries.push(entry);
        ledger.push(entry);
        existingRefs.add(referenceId);
      }
    }
    cursor = new Date(cursor.getTime() + MS_PER_DAY);
    days += 1;
  }

  if (!newEntries.length) {
    return {
      snapshot: input.snapshot,
      balance: input.balance,
      accruedNet: 0,
      newEntries: []
    };
  }

  const previousPaid = Number(input.snapshot.interestPaid);
  const interestPaid =
    (Number.isFinite(previousPaid) && previousPaid > 0 ? previousPaid : 0) + accruedNet;

  return {
    snapshot: {
      ...input.snapshot,
      savingsBalance: balance,
      currentBalance: balance,
      interestPaid: roundMoney(interestPaid),
      totalInterestPaid: roundMoney(interestPaid),
      lastInterestAccruedAt: todayStart.toISOString(),
      activityLedger: ledger.slice(-200)
    },
    balance,
    accruedNet,
    newEntries
  };
}

export function appendDepositActivity(input: {
  snapshot: Record<string, unknown>;
  amount: number;
  balanceAfter: number;
  productName: string;
  referenceId: string;
  at?: string;
  isFirstDeposit?: boolean;
}): Record<string, unknown> {
  const ledger = readActivityLedger(input.snapshot);
  if (ledger.some((row) => row.referenceId === input.referenceId)) {
    return input.snapshot;
  }
  const entry: SavingsActivityLedgerEntry = {
    id: input.referenceId,
    type: input.isFirstDeposit ? 'DEPOSIT' : 'TOP_UP',
    title: input.isFirstDeposit ? 'Deposit' : 'Top-up',
    subtitle: 'Wallet transfer',
    amount: input.amount,
    balanceAfter: input.balanceAfter,
    referenceId: input.referenceId,
    at: input.at || new Date().toISOString()
  };
  return {
    ...input.snapshot,
    activityLedger: [...ledger, entry].slice(-200)
  };
}
