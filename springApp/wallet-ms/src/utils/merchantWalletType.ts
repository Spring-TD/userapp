import { MerchantWalletType } from '../models/Wallet';

/** Legacy enum values stored before Billing / Repayment rename */
const LEGACY_TO_CURRENT: Record<string, MerchantWalletType> = {
  OPERATION: MerchantWalletType.BILLING,
  SETTLEMENT: MerchantWalletType.REPAYMENT
};

/** Normalize current API values and unambiguous stored legacy names. */
export function normalizeMerchantWalletType(value?: string): MerchantWalletType | undefined {
  if (!value) return undefined;
  const v = value.trim().toUpperCase();
  if (LEGACY_TO_CURRENT[v]) return LEGACY_TO_CURRENT[v];
  if (Object.values(MerchantWalletType).includes(v as MerchantWalletType)) {
    return v as MerchantWalletType;
  }
  return undefined;
}

/**
 * DB lookup keys for a logical wallet type (current + legacy stored values).
 *
 * Spring has a distinct KYC fee wallet, so KYC must never satisfy a REPAYMENT lookup.
 * Only the unambiguous stored names OPERATION and SETTLEMENT are retained for migration.
 */
export function merchantWalletTypesForLookup(type: MerchantWalletType): string[] {
  const legacy = Object.entries(LEGACY_TO_CURRENT)
    .filter(([, current]) => current === type)
    .map(([legacyType]) => legacyType);
  return [...new Set([type, ...legacy])];
}
