export type AmortizationScheduleSource = 'indicative' | 'confirmed';
export type AmortizationPeriodStatus = 'pending' | 'collecting' | 'paid' | 'failed' | 'overdue';

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
  interestRate?: number;
  repaymentFrequency?: string;
  repaymentStructure?: string;
  scheduleType?: string;
  durationMonths?: number;
  moratoriumMonths?: number;
  moratoriumType?: string;
  balloonPercent?: number;
  extrasApplied?: string[];
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
