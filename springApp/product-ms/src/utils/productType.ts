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

export function normalizeProductType(type: string): ProductDiscriminator {
  const value = type?.trim();
  if (!value) {
    throw new Error('Product type is required');
  }
  if ((PRODUCT_DISCRIMINATORS as readonly string[]).includes(value)) {
    return value as ProductDiscriminator;
  }
  const legacy = LEGACY_TYPE_MAP[value];
  if (legacy) {
    return legacy;
  }
  throw new Error(`Invalid product type: ${type}`);
}

export function coerceStoredProductType(type: string): ProductDiscriminator {
  if ((PRODUCT_DISCRIMINATORS as readonly string[]).includes(type)) {
    return type as ProductDiscriminator;
  }
  return LEGACY_TYPE_MAP[type] ?? 'LOAN';
}

export function discriminatorFromStoredType(type: string | null | undefined): ProductDiscriminator | null {
  if (!type) {
    return null;
  }
  try {
    return normalizeProductType(type);
  } catch {
    return null;
  }
}
