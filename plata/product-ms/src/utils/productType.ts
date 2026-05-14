import type { ProductDiscriminator } from '../types/product';

export const PRODUCT_DISCRIMINATORS: ProductDiscriminator[] = [
  'LOAN',
  'MORTGAGE',
  'SAVINGS',
  'INVESTMENT',
  'COMMODITY'
];

const LEGACY_TYPE_MAP: Record<string, ProductDiscriminator> = {
  Loan: 'LOAN',
  Mortgage: 'MORTGAGE',
  Savings: 'SAVINGS',
  Commodity: 'COMMODITY',
  Investment: 'INVESTMENT',
  Invest: 'INVESTMENT'
};

/** Canonical labels for API list endpoints (value = discriminator, label = human-readable). */
export const PRODUCT_TYPE_LABELS: Record<ProductDiscriminator, string> = {
  LOAN: 'Loan',
  MORTGAGE: 'Mortgage',
  SAVINGS: 'Savings',
  INVESTMENT: 'Investment',
  COMMODITY: 'Commodity'
};

export function normalizeProductType(type: string): ProductDiscriminator {
  const u = type?.trim();
  if (!u) {
    throw new Error('Product type is required');
  }
  if ((PRODUCT_DISCRIMINATORS as readonly string[]).includes(u)) {
    return u as ProductDiscriminator;
  }
  const legacy = LEGACY_TYPE_MAP[u];
  if (legacy) {
    return legacy;
  }
  throw new Error(`Invalid product type: ${type}`);
}

/**
 * Map a stored `Product.type` (or aggregate `_id`) to a discriminator.
 * Returns null for unrecognized values (unlike `coerceStoredProductType`, which falls back to LOAN).
 */
export function discriminatorFromStoredType(
  raw: string | null | undefined
): ProductDiscriminator | null {
  if (raw == null || String(raw).trim() === '') {
    return null;
  }
  const u = String(raw).trim();
  if ((PRODUCT_DISCRIMINATORS as readonly string[]).includes(u)) {
    return u as ProductDiscriminator;
  }
  return LEGACY_TYPE_MAP[u] ?? null;
}

/** Used when reading documents that may still use legacy `type` strings. */
export function coerceStoredProductType(type: string): ProductDiscriminator {
  if ((PRODUCT_DISCRIMINATORS as readonly string[]).includes(type)) {
    return type as ProductDiscriminator;
  }
  const mapped = LEGACY_TYPE_MAP[type];
  if (mapped) {
    return mapped;
  }
  return 'LOAN';
}
