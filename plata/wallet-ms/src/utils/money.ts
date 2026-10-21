/**
 * Wallet ledger unit: integer kobo (100 kobo = ₦1).
 * HTTP / storefront still speak Naira; convert at controller boundaries.
 */

export const KOBO_PER_NAIRA = 100;

export type BalanceUnit = 'kobo' | 'naira';
export type AmountUnit = 'kobo' | 'naira';

/** Branded integer kobo (JS number; safe for balances well below 2^53). */
export type Kobo = number & { readonly __brand: 'Kobo' };

export function asKobo(value: number): Kobo {
  return Math.trunc(value) as Kobo;
}

/** Banker's (half-even) round of a Naira major amount to integer kobo. */
export function nairaToKobo(naira: number): Kobo {
  if (!Number.isFinite(naira)) return asKobo(0);
  const sign = naira < 0 ? -1 : 1;
  const scaled = Math.abs(naira) * KOBO_PER_NAIRA;
  const floor = Math.floor(scaled);
  const fraction = scaled - floor;
  if (Math.abs(fraction - 0.5) < 1e-9) {
    const even = floor % 2 === 0 ? floor : floor + 1;
    return asKobo(sign * even);
  }
  return asKobo(sign * Math.round(scaled));
}

export function koboToNaira(kobo: number): number {
  if (!Number.isFinite(kobo)) return 0;
  return Math.trunc(kobo) / KOBO_PER_NAIRA;
}

/** Resolve request amount to integer kobo. Default unit is Naira (legacy callers). */
export function requestAmountToKobo(
  amount: unknown,
  amountUnit?: unknown
): { ok: true; kobo: Kobo } | { ok: false; error: string } {
  const n = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(n)) {
    return { ok: false, error: 'amount must be a finite number' };
  }
  const unit = amountUnit === 'kobo' ? 'kobo' : 'naira';
  if (unit === 'kobo') {
    if (!Number.isInteger(n)) {
      return { ok: false, error: 'amount must be an integer when amountUnit is kobo' };
    }
    return { ok: true, kobo: asKobo(n) };
  }
  return { ok: true, kobo: nairaToKobo(n) };
}

export function assertIntegerKobo(amount: number, label = 'amount'): void {
  if (!Number.isFinite(amount) || !Number.isInteger(amount)) {
    throw new Error(`${label} must be an integer kobo value`);
  }
}
