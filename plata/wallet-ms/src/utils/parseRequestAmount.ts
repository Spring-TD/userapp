import { requestAmountToKobo, type Kobo } from './money';

/** Parse HTTP body amount (default Naira) to integer kobo for WalletService. */
export function parseRequestAmountToKobo(
  amount: unknown,
  amountUnit?: unknown
): { ok: true; kobo: Kobo } | { ok: false; error: string } {
  return requestAmountToKobo(amount, amountUnit);
}
