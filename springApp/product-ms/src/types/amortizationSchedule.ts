export type AmortizationScheduleSource = 'indicative' | 'confirmed';

export type AmortizationPeriodStatus =
  | 'pending'
  | 'collecting'
  | 'paid'
  | 'failed'
  | 'overdue';

export interface AmortizationSchedulePeriod {
  period: number;
  label: string;
  dueDate?: string;
  payment: number;
  principal: number;
  interest: number;
  fees: number;
  balance: number;
  status: AmortizationPeriodStatus;
  isNext: boolean;
  paidAt?: string;
}

export interface AmortizationScheduleView {
  source: AmortizationScheduleSource;
  interestMethod?: string;
  /** Annual interest rate percent (e.g. 18 for 18% p.a.). */
  interestRate?: number;
  loanAmount: number;
  instalment?: number;
  totalInterest: number;
  totalRepayment: number;
  periodCount: number;
  currency: string;
  planStatus?: string;
  paidInstallmentCount: number;
  outstandingAmount: number;
  nextInstallmentNumber?: number;
  periods: AmortizationSchedulePeriod[];
}

export function parseAmortizationSchedule(value: unknown): AmortizationScheduleView | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.periods)) {
    return undefined;
  }
  const source = raw.source === 'confirmed' ? 'confirmed' : 'indicative';
  const mapped: AmortizationSchedulePeriod[] = [];
  for (const [index, item] of raw.periods.entries()) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const period = Number(row.period ?? row.installmentNumber ?? index + 1);
    const payment = Number(row.payment ?? row.amount ?? 0);
    if (!Number.isFinite(period) || !Number.isFinite(payment)) continue;
    const statusRaw = String(row.status || 'pending').toLowerCase();
    const status: AmortizationPeriodStatus =
      statusRaw === 'paid' ||
      statusRaw === 'overdue' ||
      statusRaw === 'failed' ||
      statusRaw === 'collecting'
        ? statusRaw
        : 'pending';
    mapped.push({
      period,
      label: typeof row.label === 'string' && row.label.trim() ? row.label : `Payment ${period}`,
      ...(typeof row.dueDate === 'string' ? { dueDate: row.dueDate } : {}),
      payment,
      principal: Number(row.principal) || 0,
      interest: Number(row.interest) || 0,
      fees: Number(row.fees) || 0,
      balance: Number(row.balance) || 0,
      status,
      isNext: row.isNext === true,
      ...(typeof row.paidAt === 'string' ? { paidAt: row.paidAt } : {})
    });
  }

  if (!mapped.length) {
    return undefined;
  }

  return {
    source,
    interestMethod: typeof raw.interestMethod === 'string' ? raw.interestMethod : undefined,
    interestRate: Number.isFinite(Number(raw.interestRate)) ? Number(raw.interestRate) : undefined,
    loanAmount: Number(raw.loanAmount) || 0,
    instalment: Number.isFinite(Number(raw.instalment)) ? Number(raw.instalment) : undefined,
    totalInterest: Number(raw.totalInterest) || 0,
    totalRepayment: Number(raw.totalRepayment) || 0,
    periodCount: Number(raw.periodCount) || mapped.length,
    currency: typeof raw.currency === 'string' && raw.currency.trim() ? raw.currency : 'NGN',
    planStatus: typeof raw.planStatus === 'string' ? raw.planStatus : undefined,
    paidInstallmentCount: Number(raw.paidInstallmentCount) || 0,
    outstandingAmount: Number(raw.outstandingAmount) || 0,
    nextInstallmentNumber: Number.isFinite(Number(raw.nextInstallmentNumber))
      ? Number(raw.nextInstallmentNumber)
      : mapped.find((row) => row.isNext)?.period,
    periods: mapped
  };
}
