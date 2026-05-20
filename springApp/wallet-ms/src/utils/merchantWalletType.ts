import { MerchantWalletType } from '../models/Wallet';

/** Legacy enum values stored before Billing / Settlement rename */
const LEGACY_TO_CURRENT: Record<string, MerchantWalletType> = {
  TREASURY: MerchantWalletType.SETTLEMENT,
  OPERATION: MerchantWalletType.BILLING
};

/**
 * Normalize API / webhook input (accepts legacy TREASURY / OPERATION).
 */
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
 */
export function merchantWalletTypesForLookup(type: MerchantWalletType): string[] {
  const legacy = Object.entries(LEGACY_TO_CURRENT)
    .filter(([, current]) => current === type)
    .map(([legacy]) => legacy);
  return [type, ...legacy];
}
