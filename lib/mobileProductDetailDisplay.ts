import type { MobileProduct } from '@/lib/storefrontProducts';
import {
  classifyEquityRequirementMode,
  resolveMortgageEquityRequired,
} from '@/lib/mortgageWorkflow';

const MONEY_FORMAT: Intl.NumberFormatOptions = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: true,
};

export function formatNgn(amount?: number | null): string {
  if (amount == null || Number.isNaN(amount)) return 'NGN—';
  return `NGN${amount.toLocaleString('en-NG', MONEY_FORMAT)}`;
}

export function formatNaira(amount?: number | null): string {
  if (amount == null || Number.isNaN(amount)) return 'N0.00';
  return `N${amount.toLocaleString('en-NG', MONEY_FORMAT)}`;
}

export function amountRange(product: MobileProduct): string {
  // Mortgage with a fixed facility: single Mortgage Amount (not Min–Max).
  if (product.type === 'Mortgage' || product.mortgageAmount != null) {
    const facility =
      product.mortgageAmount ??
      (product.amountMin != null &&
      product.amountMax != null &&
      product.amountMin === product.amountMax
        ? product.amountMin
        : null)
    if (facility != null) return formatNgn(facility)
  }
  if (product.amountMin != null && product.amountMax != null) {
    if (product.amountMin === product.amountMax) return formatNgn(product.amountMin)
    return `${formatNgn(product.amountMin)} - ${formatNgn(product.amountMax)}`
  }
  if (product.amountMax != null) return formatNgn(product.amountMax)
  if (product.amountMin != null) return `From ${formatNgn(product.amountMin)}`
  if (product.price != null) return formatNgn(product.price)
  // Property value is optional display only — never preferred for mortgage facility.
  if (product.type !== 'Mortgage' && product.propertyValue != null) return formatNgn(product.propertyValue)
  return 'Flexible amount'
}

export function primaryAmount(product: MobileProduct): string {
  if (product.type === 'Mortgage' || product.mortgageAmount != null) {
    return formatNgn(
      product.mortgageAmount ??
        (product.amountMin === product.amountMax ? product.amountMin : null) ??
        product.amountMax ??
        product.amountMin ??
        null,
    )
  }
  return formatNgn(product.amountMax ?? product.price ?? product.amountMin ?? product.propertyValue ?? null)
}

/** Equity line for mortgage cards/detail — never from Property Value. */
export function mortgageEquityDisplay(product: MobileProduct): string {
  const mode = classifyEquityRequirementMode(product.equityRequirement)
  const equity = resolveMortgageEquityRequired(product)
  if (mode === 'zero') return 'Zero down'
  if (equity == null) {
    if (product.equityContribution == null) return 'Not specified'
    if (mode === 'percentage') return `${product.equityContribution}% of Mortgage Amount`
    return formatNaira(product.equityContribution)
  }
  if (mode === 'percentage' && product.equityContribution != null) {
    return `Equity (${product.equityContribution}%): ${formatNaira(equity)}`
  }
  return formatNaira(equity)
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

/** Turn API tokens like `account_statement` / `reducing_balance` into display labels. */
export function humanizeLabel(value?: string | null): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (!/[_-]/.test(raw) && !/^[a-z0-9]+$/i.test(raw)) return raw;
  return raw
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Known property title-doc type → storefront label (types only; not downloads). */
const PROPERTY_DOCUMENT_TYPE_LABELS: Record<string, string> = {
  certificate_of_occupancy: 'Certificate of Occupancy (C of O)',
  c_of_o: 'Certificate of Occupancy (C of O)',
  cofo: 'Certificate of Occupancy (C of O)',
  deed_of_assignment: 'Deed of Assignment',
  deed_of_conveyance: 'Deed of Conveyance',
  deed_of_gift: 'Deed of Gift',
  deed_of_lease: 'Deed of Lease',
  governor_consent: "Governor's Consent",
  governors_consent: "Governor's Consent",
  survey_plan: 'Survey Plan',
  building_plan_approval: 'Building Plan Approval',
  land_certificate: 'Land Certificate',
  power_of_attorney: 'Power of Attorney',
  gazette: 'Gazette',
  allocation_letter: 'Allocation Letter',
  receipt_of_purchase: 'Receipt of Purchase',
  receipt_of_payment: 'Receipt of Payment',
  tax_clearance: 'Tax Clearance',
  probate: 'Probate',
  letter_of_administration: 'Letter of Administration',
};

/** Label for a declared `properties[].propertyDocumentation[].documentType`. */
export function formatPropertyDocumentType(documentType?: string | null): string {
  const raw = String(documentType || '').trim();
  if (!raw) return '';
  const key = raw.toLowerCase().replace(/[\s-]+/g, '_');
  return PROPERTY_DOCUMENT_TYPE_LABELS[key] || humanizeLabel(raw);
}

/** Unique display labels for available title documents on a property listing. */
export function propertyDocumentationLabels(
  docs?: Array<{ documentType?: string | null }> | null,
): string[] {
  if (!Array.isArray(docs) || docs.length === 0) return [];
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const doc of docs) {
    const label = formatPropertyDocumentType(doc?.documentType);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
  }
  return labels;
}

export function requirementSummary(product: MobileProduct): string {
  const requirements = product.requirements ?? [];
  if (requirements.length === 0) return 'None specified';
  return requirements
    .slice(0, 2)
    .map((item) => humanizeLabel(item.requirementType || item.description))
    .filter(Boolean)
    .join(', ') || 'Required where applicable';
}

/** Storefront products are powered by Plata (not the tenant merchant subdomain). */
export function poweredBy(_providerName?: string): string {
  return 'Plata';
}
