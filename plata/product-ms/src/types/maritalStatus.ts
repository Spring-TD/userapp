export type MaritalStatus =
  | 'single'
  | 'married'
  | 'divorced'
  | 'widowed'
  | 'separated'
  | 'other';

export interface MaritalStatusOption {
  value: MaritalStatus;
  label: string;
}

export const MARITAL_STATUS_OPTIONS: MaritalStatusOption[] = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
  { value: 'separated', label: 'Separated' },
  { value: 'other', label: 'Other' }
];

export const MARITAL_STATUS_VALUES: MaritalStatus[] = MARITAL_STATUS_OPTIONS.map(
  (option) => option.value
);
