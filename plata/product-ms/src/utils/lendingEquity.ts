export interface ResolvedEquityRequirement {
  requiredAmount: number;
  equityContributionPercent?: number;
  basis?: 'explicit' | 'mortgage_percent' | 'loan_percent' | 'loan_fixed';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function toNonNegativeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseFloat(value.replace(/,/g, ''));
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return null;
}

function firstPositive(...values: unknown[]): number {
  for (const value of values) {
    const n = toNonNegativeNumber(value);
    if (n != null && n > 0) {
      return n;
    }
  }
  return 0;
}

/** Minimal equity resolver sufficient for external servicing status views. */
export function resolveRequiredEquityContribution(
  contractSnapshot: Record<string, unknown> | undefined,
  _productType: string,
  principalAmount?: number
): ResolvedEquityRequirement {
  if (!contractSnapshot) {
    return { requiredAmount: 0 };
  }
  const snapshot = contractSnapshot;
  const structure = asRecord(snapshot.structure) ?? asRecord(asRecord(snapshot.effective)?.structure);
  const explicitAmount = firstPositive(
    snapshot.equityAmount,
    snapshot.equityPaymentAmount,
    snapshot.requiredEquityAmount,
    snapshot.downPayment,
    snapshot.downPaymentAmount,
    snapshot.estimatedDownPayment,
    asRecord(snapshot.equity)?.amount,
    asRecord(snapshot.equityPayment)?.requiredAmount,
    structure?.equityContribution
  );
  if (explicitAmount > 0) {
    return { requiredAmount: explicitAmount, basis: 'explicit' };
  }
  const percent = firstPositive(
    structure?.equityContributionPercent,
    snapshot.equityContributionPercent,
    snapshot.downPaymentPercentage
  );
  const principal = principalAmount != null && principalAmount > 0 ? principalAmount : 0;
  if (percent > 0 && principal > 0) {
    return {
      requiredAmount: (principal * percent) / 100,
      equityContributionPercent: percent,
      basis: 'loan_percent'
    };
  }
  return { requiredAmount: 0 };
}

export function isEquityPaymentSatisfied(
  requiredAmount: number,
  equityPayment?: { status?: string; paidAmount?: number } | null
): boolean {
  if (!(requiredAmount > 0)) {
    return true;
  }
  if (!equityPayment) {
    return false;
  }
  if (equityPayment.status === 'paid') {
    return true;
  }
  return (equityPayment.paidAmount ?? 0) >= requiredAmount;
}
