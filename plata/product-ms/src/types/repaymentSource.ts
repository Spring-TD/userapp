export type RepaymentSource =
  | 'salary'
  | 'business'
  | 'contract_earning'
  | 'stocks'
  | 'crowdfunding'
  | 'other';

export interface RepaymentSourceOption {
  value: RepaymentSource;
  label: string;
}

export const REPAYMENT_SOURCE_OPTIONS: RepaymentSourceOption[] = [
  { value: 'salary', label: 'Salary' },
  { value: 'business', label: 'Business' },
  { value: 'contract_earning', label: 'Contract earning' },
  { value: 'stocks', label: 'Stocks' },
  { value: 'crowdfunding', label: 'Crowdfunding' },
  { value: 'other', label: 'Other' }
];

export const REPAYMENT_SOURCE_VALUES: RepaymentSource[] = REPAYMENT_SOURCE_OPTIONS.map(
  (option) => option.value
);
