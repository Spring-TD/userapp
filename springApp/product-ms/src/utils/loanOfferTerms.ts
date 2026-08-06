export interface LoanOfferTerms {
  approvedAmount: number;
  downPaymentDue: number;
  interestRate: number | null;
  totalRepayable: number | null;
  repaymentFrequency: string | null;
  tenorMonths: number | null;
  automaticRepayment: boolean | null;
  estimatedDisbursementDate: string | null;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function numberValue(...values: unknown[]): number | null {
  for (const value of values) {
    const parsed =
      typeof value === 'string' && value.trim()
        ? Number(value.replace(/,/g, ''))
        : typeof value === 'number'
          ? value
          : Number.NaN;
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return null;
}

function stringValue(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function booleanValue(...values: unknown[]): boolean | null {
  for (const value of values) {
    if (typeof value === 'boolean') return value;
  }
  return null;
}

function resolveTenorMonths(...values: unknown[]): number | null {
  for (const value of values) {
    const direct = numberValue(value);
    if (direct != null) return direct;

    const tenor = asRecord(value);
    if (!tenor) continue;
    const amount = numberValue(tenor.value, tenor.duration, tenor.length);
    if (amount == null) continue;
    const unit = stringValue(tenor.unit)?.toLowerCase() ?? 'month';
    if (unit.startsWith('year')) return amount * 12;
    if (unit.startsWith('week')) return Math.round((amount * 12) / 52 * 100) / 100;
    if (unit.startsWith('day')) return Math.round((amount * 12) / 365 * 100) / 100;
    return amount;
  }
  return null;
}

export function buildLoanOfferTerms(args: {
  approvedAmount: number;
  requiredDownPayment: number;
  downPaymentPaid: boolean;
  contractSnapshot?: Record<string, unknown>;
  disbursedAt?: string;
}): LoanOfferTerms {
  const snapshot = args.contractSnapshot ?? {};
  const effective = asRecord(snapshot.effective);
  const structure = asRecord(effective?.structure) ?? asRecord(snapshot.structure);
  const requirements = asRecord(effective?.requirements) ?? asRecord(snapshot.requirements);
  const calculations = asRecord(snapshot.calculations) ?? asRecord(effective?.calculations);
  const projections = asRecord(snapshot.projections) ?? asRecord(calculations?.projections);
  const repayment = asRecord(snapshot.repayment) ?? asRecord(effective?.repayment);

  const interestRate = numberValue(
    structure?.interestRate,
    requirements?.interestRate,
    calculations?.annualRatePercent,
    snapshot.interestRate
  );
  const tenorMonths = resolveTenorMonths(
    structure?.loanTenure,
    requirements?.loanTenure,
    structure?.tenorMonths,
    requirements?.tenorMonths,
    calculations?.tenureMonths,
    snapshot.loanTenure,
    snapshot.tenorMonths
  );
  const repaymentFrequency = stringValue(
    structure?.repaymentFrequency,
    structure?.repaymentCycle,
    requirements?.repaymentFrequency,
    requirements?.repaymentCycle,
    calculations?.repaymentFrequency,
    snapshot.repaymentFrequency
  );
  const explicitTotal = numberValue(
    snapshot.totalRepayable,
    snapshot.totalRepayment,
    effective?.totalRepayable,
    effective?.totalRepayment,
    calculations?.totalRepayable,
    calculations?.totalRepayment,
    projections?.totalRepayable,
    projections?.totalRepayment,
    repayment?.totalRepayable,
    repayment?.totalAmount
  );
  const installmentAmount = numberValue(
    repayment?.installmentAmount,
    projections?.installmentAmount,
    projections?.monthlyRepayment,
    calculations?.monthlyRepayment
  );
  const installmentCount = numberValue(
    repayment?.installmentCount,
    projections?.installmentCount,
    calculations?.installmentCount
  );

  return {
    approvedAmount: args.approvedAmount,
    downPaymentDue: args.downPaymentPaid ? 0 : Math.max(args.requiredDownPayment, 0),
    interestRate,
    totalRepayable:
      explicitTotal ??
      (installmentAmount != null && installmentCount != null
        ? Math.round(installmentAmount * installmentCount * 100) / 100
        : null),
    repaymentFrequency,
    tenorMonths,
    automaticRepayment: booleanValue(
      structure?.automaticRepayment,
      structure?.autoRepayment,
      structure?.directDebitEnabled,
      requirements?.automaticRepayment,
      snapshot.automaticRepayment
    ),
    estimatedDisbursementDate: args.disbursedAt ?? null
  };
}
