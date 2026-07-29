export type LoanReason =
  | 'rent'
  | 'hospital'
  | 'emergency'
  | 'business'
  | 'family_expenses'
  | 'food_stuff'
  | 'investment'
  | 'other';

export interface LoanReasonOption {
  value: LoanReason;
  label: string;
}

export const LOAN_REASON_OPTIONS: LoanReasonOption[] = [
  { value: 'rent', label: 'Rent' },
  { value: 'hospital', label: 'Hospital' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'business', label: 'Business' },
  { value: 'family_expenses', label: 'Family expenses' },
  { value: 'food_stuff', label: 'Food stuff' },
  { value: 'investment', label: 'Investment' },
  { value: 'other', label: 'Other' }
];

export const LOAN_REASON_VALUES: LoanReason[] = LOAN_REASON_OPTIONS.map((option) => option.value);