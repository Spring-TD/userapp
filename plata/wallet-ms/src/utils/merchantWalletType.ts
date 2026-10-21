import { MerchantWalletType } from '../models/Wallet';

/** Legacy enum values stored before Billing / Repayment rename */
const LEGACY_TO_CURRENT: Record<string, MerchantWalletType> = {
  OPERATION: MerchantWalletType.BILLING,
  SETTLEMENT: MerchantWalletType.REPAYMENT
};

/**
 * Normalize API / webhook input (accepts legacy TREASURY / OPERATION / SETTLEMENT).
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
 *
 * Spring apps created before the SETTLEMENT rename often store repayment as either
 * `SETTLEMENT` or (older still) `KYC` in Mongo. Unlike Backend-platter/Plata, Spring
 * keeps a distinct **KYC** merchant wallet (link fee pool) alongside BILLING + REPAYMENT,
 * so `KYC` is included here only for legacy lookup purposes — it is intentionally NOT
 * lazily rewritten to REPAYMENT (see `database.ts#getMerchantWalletByType`), to avoid
 * clobbering a real KYC fee wallet when both coexist on an app.
 */
export function merchantWalletTypesForLookup(type: MerchantWalletType): string[] {
  const legacy = Object.entries(LEGACY_TO_CURRENT)
    .filter(([, current]) => current === type)
    .map(([legacyType]) => legacyType);
  const springLegacyRepayment = type === MerchantWalletType.REPAYMENT ? ['KYC'] : [];
  return [...new Set([type, ...legacy, ...springLegacyRepayment])];
}
