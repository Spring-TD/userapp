import { ApiError } from '../middleware/errorHandler';
import type { ProductDiscriminator } from '../types/product';
import type { UserProductApplicationStatus } from '../types/userProductApplication';
import { LOAN_REASON_VALUES, type LoanReason } from '../types/loanReason';
import { MARITAL_STATUS_VALUES, type MaritalStatus } from '../types/maritalStatus';
import { REPAYMENT_SOURCE_VALUES, type RepaymentSource } from '../types/repaymentSource';
import { isLendingProductType } from './loanApplicationRequirements';

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
  status?: UserProductApplicationStatus;
  productType?: ProductDiscriminator;
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

function isDraftStatus(status: UserProductApplicationStatus | undefined): boolean {
  return (status ?? 'submitted') === 'draft';
}

function requiresLendingFields(productType: ProductDiscriminator | string | undefined): boolean {
  return productType != null && isLendingProductType(productType as ProductDiscriminator);
}

function requiresApplicantProfileFields(
  productType: ProductDiscriminator | string | undefined
): boolean {
  const normalized = String(productType ?? '').toUpperCase();
  return normalized !== 'COMMODITY' && normalized !== 'SAVINGS';
}

function requiresPepField(productType: ProductDiscriminator | string | undefined): boolean {
  return String(productType ?? '').toUpperCase() !== 'SAVINGS';
}

function validateSelectField<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fieldName: string,
  label: string,
  draft: boolean,
  required: boolean
): T | undefined {
  if (value !== undefined && value !== null && String(value).trim() !== '') {
    const normalized = String(value).trim() as T;
    if (!allowed.includes(normalized)) {
      throw new ApiError(400, `${fieldName} must be one of: ${allowed.join(', ')}`);
    }
    return normalized;
  }
  if (!draft && required) {
    throw new ApiError(400, `${fieldName} is required — ${label}`);
  }
  return undefined;
}

function validateOtherField(
  selected: string | undefined,
  otherValue: string | undefined,
  otherFieldName: string,
  whenValue: string
): string | undefined {
  if (selected === whenValue) {
    const other = otherValue?.trim();
    if (!other) {
      throw new ApiError(400, `${otherFieldName} is required when ${selected} is selected`);
    }
    return other;
  }
  return otherValue?.trim() || undefined;
}

function optionalTrimmedText(
  value: unknown,
  fieldName: string,
  max: number
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new ApiError(400, `${fieldName} must be a string`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.length > max) {
    throw new ApiError(400, `${fieldName} cannot exceed ${max} characters`);
  }
  return trimmed;
}

function optionalEmail(value: unknown, fieldName: string): string | undefined {
  const trimmed = optionalTrimmedText(value, fieldName, 320);
  if (!trimmed) {
    return undefined;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new ApiError(400, `${fieldName} must be a valid email`);
  }
  return trimmed;
}

export function validatePoliticallyExposedPerson(
  value: boolean | undefined,
  status: UserProductApplicationStatus | undefined,
  required = true
): boolean | undefined {
  if (isDraftStatus(status) || !required) {
    return typeof value === 'boolean' ? value : undefined;
  }
  if (typeof value !== 'boolean') {
    throw new ApiError(
      400,
      'isPoliticallyExposedPerson is required — set true or false for "Are you a Politically Exposed Person?"'
    );
  }
  return value;
}

export function validatePlatformApplicationFields(
  input: PlatformApplicationFieldInput
): ValidatedPlatformApplicationFields {
  const draft = isDraftStatus(input.status);
  const lending = requiresLendingFields(input.productType);
  const applicantProfile = requiresApplicantProfileFields(input.productType);
  const pepRequired = requiresPepField(input.productType);

  const isPoliticallyExposedPerson = validatePoliticallyExposedPerson(
    input.isPoliticallyExposedPerson,
    input.status,
    pepRequired
  );

  let monthlyIncome: number | undefined;
  if (input.monthlyIncome !== undefined && input.monthlyIncome !== null) {
    const parsed = Number(input.monthlyIncome);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new ApiError(400, 'monthlyIncome must be a non-negative number');
    }
    monthlyIncome = parsed;
  } else if (!draft && applicantProfile) {
    throw new ApiError(400, 'monthlyIncome is required — enter how much the applicant earns monthly');
  }

  const repaymentSource = validateSelectField(
    input.repaymentSource,
    REPAYMENT_SOURCE_VALUES,
    'repaymentSource',
    'select the applicant source of repayment',
    draft,
    applicantProfile
  );
  const repaymentSourceOther = validateOtherField(
    repaymentSource,
    input.repaymentSourceOther,
    'repaymentSourceOther',
    'other'
  );

  const maritalStatus = validateSelectField(
    input.maritalStatus,
    MARITAL_STATUS_VALUES,
    'maritalStatus',
    'select marital status',
    draft,
    applicantProfile
  );
  const maritalStatusOther = validateOtherField(
    maritalStatus,
    input.maritalStatusOther,
    'maritalStatusOther',
    'other'
  );

  let loanReason: LoanReason | undefined;
  let loanReasonOther: string | undefined;
  if (lending) {
    loanReason = validateSelectField(
      input.loanReason,
      LOAN_REASON_VALUES,
      'loanReason',
      'select the reason for the loan',
      draft,
      true
    );
    loanReasonOther = validateOtherField(loanReason, input.loanReasonOther, 'loanReasonOther', 'other');
  }

  let repayingWithSpouse: boolean | undefined;
  if (lending) {
    if (input.repayingWithSpouse !== undefined && input.repayingWithSpouse !== null) {
      if (typeof input.repayingWithSpouse !== 'boolean') {
        throw new ApiError(
          400,
          'repayingWithSpouse is required — set true or false for "Are you repaying this loan with a spouse?"'
        );
      }
      repayingWithSpouse = input.repayingWithSpouse;
    } else if (!draft) {
      throw new ApiError(
        400,
        'repayingWithSpouse is required — set true or false for "Are you repaying this loan with a spouse?"'
      );
    }
  }

  let spouseFullName: string | undefined;
  let spouseEmail: string | undefined;
  let spousePhone: string | undefined;
  let spouseOccupation: string | undefined;
  let spouseCountry: string | undefined;
  if (lending && repayingWithSpouse === true) {
    spouseFullName = input.spouseFullName?.trim();
    spouseEmail = input.spouseEmail?.trim();
    spousePhone = input.spousePhone?.trim();
    spouseOccupation = input.spouseOccupation?.trim() || undefined;
    spouseCountry = input.spouseCountry?.trim().toUpperCase() || undefined;

    if (!draft) {
      if (!spouseFullName) {
        throw new ApiError(400, 'spouseFullName is required when repayingWithSpouse is true');
      }
      if (!spouseEmail) {
        throw new ApiError(400, 'spouseEmail is required when repayingWithSpouse is true');
      }
      if (!spousePhone) {
        throw new ApiError(400, 'spousePhone is required when repayingWithSpouse is true');
      }
    }
  }

  const result: ValidatedPlatformApplicationFields = {};
  if (isPoliticallyExposedPerson !== undefined) {
    result.isPoliticallyExposedPerson = isPoliticallyExposedPerson;
  }
  if (monthlyIncome !== undefined) {
    result.monthlyIncome = monthlyIncome;
  }
  if (repaymentSource !== undefined) {
    result.repaymentSource = repaymentSource;
  }
  if (repaymentSourceOther !== undefined) {
    result.repaymentSourceOther = repaymentSourceOther;
  }
  if (maritalStatus !== undefined) {
    result.maritalStatus = maritalStatus;
  }
  if (maritalStatusOther !== undefined) {
    result.maritalStatusOther = maritalStatusOther;
  }
  if (loanReason !== undefined) {
    result.loanReason = loanReason;
  }
  if (loanReasonOther !== undefined) {
    result.loanReasonOther = loanReasonOther;
  }
  if (repayingWithSpouse !== undefined) {
    result.repayingWithSpouse = repayingWithSpouse;
  }
  if (spouseFullName !== undefined) {
    result.spouseFullName = spouseFullName;
  }
  if (spouseEmail !== undefined) {
    result.spouseEmail = spouseEmail;
  }
  if (spousePhone !== undefined) {
    result.spousePhone = spousePhone;
  }
  if (spouseOccupation !== undefined) {
    result.spouseOccupation = spouseOccupation;
  }
  if (spouseCountry !== undefined) {
    result.spouseCountry = spouseCountry;
  }

  if (lending) {
    const occupation = optionalTrimmedText(input.occupation, 'occupation', 120);
    const placeOfWork = optionalTrimmedText(input.placeOfWork, 'placeOfWork', 200);
    const hrName = optionalTrimmedText(input.hrName, 'hrName', 200);
    const hrEmail = optionalEmail(input.hrEmail, 'hrEmail');
    if (occupation !== undefined) {
      result.occupation = occupation;
    }
    if (placeOfWork !== undefined) {
      result.placeOfWork = placeOfWork;
    }
    if (hrName !== undefined) {
      result.hrName = hrName;
    }
    if (hrEmail !== undefined) {
      result.hrEmail = hrEmail;
    }
  }

  return result;
}
