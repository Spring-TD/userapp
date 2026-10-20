import type { Product } from '../types/product';

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseFiniteAmount(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function commodityUnitPrice(product: Product): number | undefined {
  const unitAmount = product.structure?.unitAmount as
    | number
    | string
    | { amount?: number | string }
    | undefined;
  let unitPrice: number | undefined;
  if (unitAmount !== null && typeof unitAmount === 'object') {
    unitPrice = parseFiniteAmount(unitAmount.amount);
  } else {
    unitPrice = parseFiniteAmount(unitAmount);
  }
  if (unitPrice === undefined) {
    unitPrice = parseFiniteAmount(product.price);
  }
  return unitPrice !== undefined && unitPrice > 0 ? unitPrice : undefined;
}

export function commodityMinQuantity(product: Product): number {
  const min =
    parseFiniteAmount(product.structure?.minQuantityPurchase) ??
    parseFiniteAmount(product.minimumQuantity) ??
    1;
  return min >= 1 ? Math.floor(min) : 1;
}

export function resolveCommodityPurchaseAmount(
  product: Product,
  quantityInput?: number
): { amount: number; selection: Record<string, unknown> } {
  const unitPrice = commodityUnitPrice(product);
  if (unitPrice === undefined) {
    throw new Error('This commodity does not have a unit price configured');
  }

  const minQuantity = commodityMinQuantity(product);
  const quantity = quantityInput ?? minQuantity;
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error('quantity must be a positive integer');
  }
  if (quantity < minQuantity) {
    throw new Error(`Quantity must be at least ${minQuantity} for this commodity`);
  }

  const total = roundMoney(unitPrice * quantity);
  return {
    amount: total,
    selection: {
      unitPrice,
      quantity,
      total,
      ...(product.unitOfMeasure ? { unitOfMeasure: product.unitOfMeasure } : {})
    }
  };
}

type MoratoriumShape = { value?: number; unit?: string };

function parseMoratorium(structure: Product['structure']): MoratoriumShape | null {
  const raw = structure?.moratorium;
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return { value: raw, unit: 'month' };
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const record = raw as MoratoriumShape;
    const value = parseFiniteAmount(record.value);
    if (value !== undefined && value > 0) {
      return { value, unit: String(record.unit || 'month').toLowerCase() };
    }
  }
  return null;
}

export function computeMaturityDate(fundedAt: Date, product: Product): Date {
  const moratorium = parseMoratorium(product.structure);
  if (!moratorium?.value) {
    return new Date(fundedAt);
  }

  const maturity = new Date(fundedAt);
  const unit = moratorium.unit || 'month';
  const value = Math.floor(moratorium.value);

  switch (unit) {
    case 'day':
    case 'days':
      maturity.setUTCDate(maturity.getUTCDate() + value);
      break;
    case 'week':
    case 'weeks':
      maturity.setUTCDate(maturity.getUTCDate() + value * 7);
      break;
    case 'year':
    case 'years':
      maturity.setUTCFullYear(maturity.getUTCFullYear() + value);
      break;
    case 'month':
    case 'months':
    default:
      maturity.setUTCMonth(maturity.getUTCMonth() + value);
      break;
  }
  return maturity;
}

export function resolveOfferYieldPercent(product: Product): { enabled: boolean; ratePercent: number } {
  const structure = product.structure;
  const enabled = structure?.offerYieldEnabled === true;
  const raw = structure?.offerYield;
  const ratePercent = parseFiniteAmount(raw) ?? 0;
  return {
    enabled,
    ratePercent: ratePercent >= 0 ? ratePercent : 0
  };
}

/**
 * Annual percent rate for savings/investment maturity or accrued interest.
 * Prefer returnsOnInvestment / interestRate; fall back to offerYield when enabled.
 */
export function resolveDepositInterestRatePercent(product: Product): number {
  const structure = product.structure;
  const candidates = [
    structure?.returnsOnInvestment,
    structure?.interestRate,
    (product as { returnsOnInvestment?: unknown }).returnsOnInvestment,
    (product as { interestRate?: unknown }).interestRate
  ];
  for (const raw of candidates) {
    const rate = parseFiniteAmount(raw);
    if (rate !== undefined && rate > 0) {
      return rate;
    }
  }
  const offer = resolveOfferYieldPercent(product);
  return offer.enabled && offer.ratePercent > 0 ? offer.ratePercent : 0;
}

/** Simple flat interest for the full holding period (percent of principal). */
export function calculateCommodityFlatInterest(principal: number, product: Product): number {
  const { enabled, ratePercent } = resolveOfferYieldPercent(product);
  if (!enabled || !Number.isFinite(principal) || principal <= 0 || ratePercent <= 0) {
    return 0;
  }
  return roundMoney(principal * (ratePercent / 100));
}

/** Flat maturity interest for locked SAVINGS / INVESTMENT (full-period ROI %). */
export function calculateFlatMaturityInterest(principal: number, product: Product): number {
  if (!Number.isFinite(principal) || principal <= 0) return 0;
  const ratePercent = resolveDepositInterestRatePercent(product);
  if (ratePercent <= 0) return 0;
  return roundMoney(principal * (ratePercent / 100));
}

/**
 * Accrued interest for open-ended / anytime plans: principal × annualRate% × daysHeld/365.
 * `fundedAt` should be first fund / last accrual anchor when available.
 */
export function calculateAccruedInterestToDate(
  principal: number,
  product: Product,
  fundedAt: Date | string | undefined,
  now = new Date()
): number {
  if (!Number.isFinite(principal) || principal <= 0) return 0;
  const ratePercent = resolveDepositInterestRatePercent(product);
  if (ratePercent <= 0) return 0;

  const start = fundedAt instanceof Date ? fundedAt : fundedAt ? new Date(fundedAt) : undefined;
  if (!start || Number.isNaN(start.getTime())) return 0;

  const ms = Math.max(0, now.getTime() - start.getTime());
  const daysHeld = Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
  if (daysHeld <= 0) return 0;

  return roundMoney(principal * (ratePercent / 100) * (daysHeld / 365));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** True when catalog tenure/duration is open-ended (no fixed holding period). */
export function isOpenEndedProduct(product: Product): boolean {
  const about = asRecord(product.about as unknown);
  const structure = asRecord(product.structure as unknown);
  const candidates = [
    about?.duration,
    about?.investmentTenure,
    about?.savingsTenure,
    about?.tenure,
    structure?.duration,
    structure?.investmentTenure,
    structure?.savingsTenure,
    structure?.tenure
  ];
  for (const raw of candidates) {
    if (raw === 'open_ended' || raw === 'open') return true;
    const rec = asRecord(raw);
    if (!rec) continue;
    const unit = String(rec.unit || '').trim().toLowerCase();
    const value = rec.value;
    if (unit === 'open' || value === 'open_ended' || value === 'open') return true;
  }
  return !parseMoratorium(product.structure);
}

/**
 * Resolve account maturity timestamp for withdrawal gating.
 * Open-ended / anytime products return undefined (no lock).
 */
export function resolveAccountMaturityAt(input: {
  product: Product;
  snapshot: Record<string, unknown>;
  createdAt?: Date | string;
}): string | undefined {
  const snapMaturity = input.snapshot.maturityAt;
  if (typeof snapMaturity === 'string' && snapMaturity.trim()) {
    return snapMaturity.trim();
  }
  if (snapMaturity instanceof Date && !Number.isNaN(snapMaturity.getTime())) {
    return snapMaturity.toISOString();
  }

  if (isOpenEndedProduct(input.product)) {
    return undefined;
  }

  const fundedRaw =
    input.snapshot.fundedAt ||
    input.snapshot.firstDepositAt ||
    input.snapshot.enrolledAt ||
    input.createdAt;
  const fundedAt =
    fundedRaw instanceof Date
      ? fundedRaw
      : typeof fundedRaw === 'string' && fundedRaw.trim()
        ? new Date(fundedRaw)
        : undefined;
  if (!fundedAt || Number.isNaN(fundedAt.getTime())) {
    return undefined;
  }

  const maturity = computeMaturityDate(fundedAt, input.product);
  return maturity.toISOString();
}

export function isMoratoriumEnded(maturityAt: string | Date | undefined, now = new Date()): boolean {
  if (!maturityAt) return true;
  const maturity = maturityAt instanceof Date ? maturityAt : new Date(maturityAt);
  if (Number.isNaN(maturity.getTime())) return true;
  return now.getTime() >= maturity.getTime();
}
