import type { LoanReason } from './loanReason';
import type { MaritalStatus } from './maritalStatus';
import type { RepaymentSource } from './repaymentSource';

/** Platform-mandated applicant fields — always collected; merchants do not configure these. */
export type PlatformApplicationFieldType = 'boolean' | 'number' | 'select' | 'text';

export interface PlatformApplicationFieldDefinition {
  key: string;
  label: string;
  type: PlatformApplicationFieldType;
  required: boolean;
  productTypes?: Array<'LOAN' | 'MORTGAGE' | 'SAVINGS' | 'INVESTMENT' | 'COMMODITY'>;
  optionsPath?: string;
  otherFieldKey?: string;
  otherFieldLabel?: string;
  triggersSpouseKyc?: boolean;
}

export const PLATFORM_APPLICATION_FIELD_DEFINITIONS: PlatformApplicationFieldDefinition[] = [
  {
    key: 'isPoliticallyExposedPerson',
    label: 'Are you a Politically Exposed Person?',
    type: 'boolean',
    required: true,
    productTypes: ['LOAN', 'MORTGAGE', 'INVESTMENT', 'COMMODITY']
  },
  {
    key: 'monthlyIncome',
    label: 'How much do you earn monthly?',
    type: 'number',
    required: true,
    productTypes: ['LOAN', 'MORTGAGE', 'INVESTMENT']
  },
  {
    key: 'repaymentSource',
    label: 'Source of repayment',
    type: 'select',
    required: true,
    productTypes: ['LOAN', 'MORTGAGE', 'INVESTMENT'],
    optionsPath: '/repayment-source',
    otherFieldKey: 'repaymentSourceOther',
    otherFieldLabel: 'Please specify your source of repayment'
  },
  {
    key: 'maritalStatus',
    label: 'Marital status',
    type: 'select',
    required: true,
    productTypes: ['LOAN', 'MORTGAGE', 'INVESTMENT'],
    optionsPath: '/marital-status',
    otherFieldKey: 'maritalStatusOther',
    otherFieldLabel: 'Please specify your marital status'
  },
  {
    key: 'loanReason',
    label: 'Reason for the loan',
    type: 'select',
    required: true,
    productTypes: ['LOAN', 'MORTGAGE'],
    optionsPath: '/loan-reason',
    otherFieldKey: 'loanReasonOther',
    otherFieldLabel: 'Please specify your reason for the loan'
  },
  {
    key: 'repayingWithSpouse',
    label: 'Are you repaying this loan with a spouse?',
    type: 'boolean',
    required: true,
    productTypes: ['LOAN', 'MORTGAGE'],
    triggersSpouseKyc: true
  },
  {
    key: 'spouseFullName',
    label: 'Spouse full name',
    type: 'text',
    required: true,
    productTypes: ['LOAN', 'MORTGAGE']
  },
  {
    key: 'spouseEmail',
    label: 'Spouse email',
    type: 'text',
    required: true,
    productTypes: ['LOAN', 'MORTGAGE']
  },
  {
    key: 'spousePhone',
    label: 'Spouse phone',
    type: 'text',
    required: true,
    productTypes: ['LOAN', 'MORTGAGE']
  },
  {
    key: 'occupation',
    label: 'Occupation',
    type: 'text',
    required: false,
    productTypes: ['LOAN', 'MORTGAGE']
  },
  {
    key: 'placeOfWork',
    label: 'Place of Work',
    type: 'text',
    required: false,
    productTypes: ['LOAN', 'MORTGAGE']
  },
  {
    key: 'hrName',
    label: 'Name of HR',
    type: 'text',
    required: false,
    productTypes: ['LOAN', 'MORTGAGE']
  },
  {
    key: 'hrEmail',
    label: "HR's Email",
    type: 'text',
    required: false,
    productTypes: ['LOAN', 'MORTGAGE']
  }
];

export type PlatformApplicationSubmitStatus = 'draft' | 'submitted';

export interface PlatformApplicationFieldInput {
  isPoliticallyExposedPerson?: boolean;
  monthlyIncome?: number;
  repaymentSource?: string;
  repaymentSourceOther?: string;
  maritalStatus?: string;
  maritalStatusOther?: string;
  loanReason?: string;
  loanReasonOther?: string;
  repayingWithSpouse?: boolean;
  spouseFullName?: string;
  spouseEmail?: string;
  spousePhone?: string;
  spouseOccupation?: string;
  spouseCountry?: string;
  occupation?: string;
  placeOfWork?: string;
  hrName?: string;
  hrEmail?: string;
}

export interface ValidatedPlatformApplicationFields {
  isPoliticallyExposedPerson?: boolean;
  monthlyIncome?: number;
  repaymentSource?: RepaymentSource;
  repaymentSourceOther?: string;
  maritalStatus?: MaritalStatus;
  maritalStatusOther?: string;
  loanReason?: LoanReason;
  loanReasonOther?: string;
  repayingWithSpouse?: boolean;
  spouseFullName?: string;
  spouseEmail?: string;
  spousePhone?: string;
  spouseOccupation?: string;
  spouseCountry?: string;
  occupation?: string;
  placeOfWork?: string;
  hrName?: string;
  hrEmail?: string;
}

export const PLATFORM_APPLICATION_FIELD_KEYS = [
  'isPoliticallyExposedPerson',
  'monthlyIncome',
  'repaymentSource',
  'repaymentSourceOther',
  'maritalStatus',
  'maritalStatusOther',
  'loanReason',
  'loanReasonOther',
  'repayingWithSpouse',
  'spouseFullName',
  'spouseEmail',
  'spousePhone',
  'spouseOccupation',
  'spouseCountry',
  'occupation',
  'placeOfWork',
  'hrName',
  'hrEmail'
] as const;

export type PlatformApplicationFieldKey = (typeof PLATFORM_APPLICATION_FIELD_KEYS)[number];
