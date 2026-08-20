import { describe, expect, it } from '@jest/globals';
import {
  validatePlatformApplicationFields,
  validatePoliticallyExposedPerson
} from '../utils/platformApplicationFields';
import {
  applyPlatformFieldsToApplication,
  extractPlatformFieldInput,
  platformFieldsFromApplication
} from '../utils/platformApplicationFieldInput';
import type { IProductApplicationDocument } from '../models/ProductApplicationModel';

jest.mock('../middleware/errorHandler', () => ({
  ApiError: class ApiError extends Error {
    statusCode: number;

    constructor(statusCode: number, message: string) {
      super(message);
      this.statusCode = statusCode;
      this.name = 'ApiError';
    }
  }
}));

const baseSubmitFields = {
  isPoliticallyExposedPerson: false,
  monthlyIncome: 250000,
  repaymentSource: 'salary' as const,
  maritalStatus: 'married' as const,
  status: 'submitted' as const
};

describe('platformApplicationFields', () => {
  it('requires a boolean PEP answer on submitted applications', () => {
    expect(validatePoliticallyExposedPerson(true, 'submitted')).toBe(true);
    expect(validatePoliticallyExposedPerson(false, 'submitted')).toBe(false);
    expect(validatePoliticallyExposedPerson(false, undefined)).toBe(false);
  });

  it('rejects missing PEP answer on submitted applications', () => {
    expect(() => validatePoliticallyExposedPerson(undefined, 'submitted')).toThrow(
      /isPoliticallyExposedPerson is required/
    );
  });

  it('allows missing PEP on draft applications', () => {
    expect(validatePoliticallyExposedPerson(undefined, 'draft')).toBeUndefined();
  });

  it('requires lending fields for LOAN products on submit', () => {
    expect(() =>
      validatePlatformApplicationFields({
        ...baseSubmitFields,
        productType: 'LOAN'
      })
    ).toThrow(/loanReason is required/);

    const result = validatePlatformApplicationFields({
      ...baseSubmitFields,
      productType: 'LOAN',
      loanReason: 'business',
      repayingWithSpouse: false
    });

    expect(result.loanReason).toBe('business');
    expect(result.repayingWithSpouse).toBe(false);
  });

  it('requires spouse fields when repayingWithSpouse is true', () => {
    expect(() =>
      validatePlatformApplicationFields({
        ...baseSubmitFields,
        productType: 'LOAN',
        loanReason: 'rent',
        repayingWithSpouse: true
      })
    ).toThrow(/spouseFullName is required/);
  });

  it('does not require income, repayment source, or marital status for COMMODITY', () => {
    const result = validatePlatformApplicationFields({
      isPoliticallyExposedPerson: false,
      productType: 'COMMODITY',
      status: 'submitted'
    });

    expect(result).toEqual({ isPoliticallyExposedPerson: false });
  });

  it('still requires PEP for COMMODITY on submit', () => {
    expect(() =>
      validatePlatformApplicationFields({
        productType: 'COMMODITY',
        status: 'submitted'
      })
    ).toThrow(/isPoliticallyExposedPerson is required/);
  });

  it('does not require PEP, income, repayment source, or marital status for SAVINGS', () => {
    const result = validatePlatformApplicationFields({
      productType: 'SAVINGS',
      status: 'submitted'
    });

    expect(result).toEqual({});
  });
});

describe('platformApplicationFieldInput', () => {
  it('merges top-level and metadata.platformFields with top-level winning', () => {
    const input = extractPlatformFieldInput({
      metadata: {
        platformFields: {
          isPoliticallyExposedPerson: true,
          monthlyIncome: 100000
        }
      },
      isPoliticallyExposedPerson: false,
      loanReason: 'rent'
    });

    expect(input.isPoliticallyExposedPerson).toBe(false);
    expect(input.monthlyIncome).toBe(100000);
    expect(input.loanReason).toBe('rent');
  });

  it('merges nested platformFields alias with top-level winning', () => {
    const input = extractPlatformFieldInput({
      platformFields: {
        isPoliticallyExposedPerson: true,
        monthlyIncome: 250000,
        repaymentSource: 'salary',
        maritalStatus: 'single'
      },
      isPoliticallyExposedPerson: false
    });

    expect(input.isPoliticallyExposedPerson).toBe(false);
    expect(input.monthlyIncome).toBe(250000);
    expect(input.repaymentSource).toBe('salary');
    expect(input.maritalStatus).toBe('single');
  });

  it('reads and writes platform fields on application documents', () => {
    const application = {
      isPoliticallyExposedPerson: false,
      monthlyIncome: 500000,
      repaymentSource: 'salary',
      maritalStatus: 'single'
    } as IProductApplicationDocument;

    expect(platformFieldsFromApplication(application)).toEqual({
      isPoliticallyExposedPerson: false,
      monthlyIncome: 500000,
      repaymentSource: 'salary',
      maritalStatus: 'single'
    });

    applyPlatformFieldsToApplication(application, {
      loanReason: 'business',
      repayingWithSpouse: false
    });

    expect(application.loanReason).toBe('business');
    expect(application.repayingWithSpouse).toBe(false);
  });

  it('persists optional employment fields for mortgage applications', () => {
    const result = validatePlatformApplicationFields({
      ...baseSubmitFields,
      productType: 'MORTGAGE',
      loanReason: 'investment',
      repayingWithSpouse: false,
      occupation: 'Engineer',
      placeOfWork: 'Stanleys Enterprise',
      hrName: 'Ada HR',
      hrEmail: 'hr@example.com'
    });

    expect(result.occupation).toBe('Engineer');
    expect(result.placeOfWork).toBe('Stanleys Enterprise');
    expect(result.hrName).toBe('Ada HR');
    expect(result.hrEmail).toBe('hr@example.com');
  });

  it('rejects invalid hrEmail', () => {
    expect(() =>
      validatePlatformApplicationFields({
        ...baseSubmitFields,
        productType: 'MORTGAGE',
        loanReason: 'investment',
        repayingWithSpouse: false,
        hrEmail: 'not-an-email'
      })
    ).toThrow(/hrEmail must be a valid email/);
  });
});
