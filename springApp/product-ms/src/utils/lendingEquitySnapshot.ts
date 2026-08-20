import type { Product } from '../types/product';

type LendingProductSnapshotSource = Product & {
  baseEquityContribution?: number;
  merchantEquityAddition?: number;
  calculatedConfig?: { mortgage?: Record<string, unknown> };
};

/** Product-derived equity / property fields copied onto a lending application contract snapshot. */
export function lendingEquitySnapshotFields(product: Product): Record<string, unknown> {
  const productType = String(product.type).toUpperCase();
  if (productType !== 'LOAN' && productType !== 'MORTGAGE') {
    return {};
  }

  const productRecord = product as LendingProductSnapshotSource;
  const baseEquity = Number(productRecord.baseEquityContribution);
  const merchantEquity = Number(productRecord.merchantEquityAddition);
  const layeredEquity =
    Number.isFinite(baseEquity) || Number.isFinite(merchantEquity)
      ? (Number.isFinite(baseEquity) ? baseEquity : 0) +
        (Number.isFinite(merchantEquity) ? merchantEquity : 0)
      : undefined;
  const equityContribution = product.equityContribution ?? layeredEquity;
  return {
    ...(equityContribution != null ? { equityContribution } : {}),
    ...(productType === 'MORTGAGE' && product.propertyValue != null
      ? { propertyValue: product.propertyValue }
      : {}),
    ...(productType === 'MORTGAGE' && Array.isArray(product.properties) && product.properties.length > 0
      ? { properties: product.properties }
      : {}),
    ...(productType === 'MORTGAGE' && productRecord.calculatedConfig?.mortgage
      ? { calculatedConfig: { mortgage: productRecord.calculatedConfig.mortgage } }
      : {})
  };
}

/** Catalog fields the storefront apply UI reads from the application snapshot. */
export function productDerivedContractSnapshotFields(product: Product): Record<string, unknown> {
  return {
    productName: product.name,
    productType: product.type,
    structure: product.structure,
    about: product.about,
    requirements: product.requirements,
    feesAndCharges: product.feesAndCharges,
    ...lendingEquitySnapshotFields(product)
  };
}
