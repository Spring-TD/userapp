/** Product types aligned with product-ms PRODUCT_DISCRIMINATORS. */
export const PRODUCT_TYPES = [
  'MORTGAGE',
  'LOAN',
  'SAVINGS',
  'INVESTMENT',
  'COMMODITY'
] as const;

export type ProductTypeKey = (typeof PRODUCT_TYPES)[number];

const LEGACY_PRODUCT_TYPE_MAP: Record<string, ProductTypeKey> = {
  Loan: 'LOAN',
  Mortgage: 'MORTGAGE',
  Savings: 'SAVINGS',
  Commodity: 'COMMODITY',
  Investment: 'INVESTMENT',
  Invest: 'INVESTMENT'
};

export function normalizeProductTypeKey(type: string | undefined | null): ProductTypeKey | null {
  const value = type?.trim();
  if (!value) return null;
  const upper = value.toUpperCase();
  if ((PRODUCT_TYPES as readonly string[]).includes(upper)) {
    return upper as ProductTypeKey;
  }
  return LEGACY_PRODUCT_TYPE_MAP[value] ?? null;
}
