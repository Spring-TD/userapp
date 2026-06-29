import type { MobileProduct } from '@/lib/storefrontProducts';

export function formatNgn(amount?: number | null): string {
  if (amount == null || Number.isNaN(amount)) return 'NGN—';
  return `NGN${amount.toLocaleString('en-NG')}`;
}

export function formatNaira(amount?: number | null): string {
  if (amount == null || Number.isNaN(amount)) return 'N0.00';
  return `N${amount.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function amountRange(product: MobileProduct): string {
  if (product.amountMin != null && product.amountMax != null) {
    return `${formatNgn(product.amountMin)} - ${formatNgn(product.amountMax)}`;
  }
  if (product.amountMax != null) return formatNgn(product.amountMax);
  if (product.amountMin != null) return `From ${formatNgn(product.amountMin)}`;
  if (product.propertyValue != null) return formatNgn(product.propertyValue);
  if (product.price != null) return formatNgn(product.price);
  return 'Flexible amount';
}

export function primaryAmount(product: MobileProduct): string {
  return formatNgn(product.amountMax ?? product.propertyValue ?? product.price ?? product.amountMin ?? null);
}

export function rateLabel(product: MobileProduct): string {
  if (!product.interestRate) return product.roi || 'Rate available';
  return product.interestRate.includes('%') ? product.interestRate : `${product.interestRate}%`;
}

export function feeSummary(product: MobileProduct): string {
  const fees = product.fees ?? [];
  if (fees.length === 0) return 'Nil';
  return fees
    .slice(0, 2)
    .map((fee) => [fee.name, fee.value].filter(Boolean).join(' '))
    .join(', ');
}

export function requirementSummary(product: MobileProduct): string {
  const requirements = product.requirements ?? [];
  if (requirements.length === 0) return 'None specified';
  return requirements
    .slice(0, 2)
    .map((item) => item.requirementType || item.description)
    .filter(Boolean)
    .join(', ') || 'Required where applicable';
}

/** Storefront products are powered by Plata (not the tenant merchant subdomain). */
export function poweredBy(_providerName?: string): string {
  return 'Plata';
}
