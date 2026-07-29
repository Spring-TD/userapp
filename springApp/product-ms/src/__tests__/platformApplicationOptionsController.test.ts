import { describe, expect, it } from '@jest/globals';
import platformApplicationOptionsController from '../controllers/platformApplicationOptionsController';
import { PLATFORM_APPLICATION_FIELD_DEFINITIONS } from '../types/platformApplicationFields';
import { LOAN_REASON_OPTIONS } from '../types/loanReason';
import { MARITAL_STATUS_OPTIONS } from '../types/maritalStatus';
import { REPAYMENT_SOURCE_OPTIONS } from '../types/repaymentSource';

function mockResponse() {
  const res: {
    statusCode?: number;
    body?: unknown;
    status: (code: number) => typeof res;
    json: (payload: unknown) => typeof res;
  } = {
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.body = payload;
      return res;
    }
  };
  return res;
}

describe('platformApplicationOptionsController', () => {
  it('returns platform application field definitions', async () => {
    const res = mockResponse();
    await platformApplicationOptionsController.getPlatformApplicationFieldOptions({} as never, res as never);
    expect(res.body).toEqual({
      success: true,
      data: PLATFORM_APPLICATION_FIELD_DEFINITIONS
    });
  });

  it('returns repayment source options', async () => {
    const res = mockResponse();
    await platformApplicationOptionsController.getRepaymentSourceOptions({} as never, res as never);
    expect(res.body).toEqual({
      success: true,
      data: REPAYMENT_SOURCE_OPTIONS
    });
  });

  it('returns marital status options', async () => {
    const res = mockResponse();
    await platformApplicationOptionsController.getMaritalStatusOptions({} as never, res as never);
    expect(res.body).toEqual({
      success: true,
      data: MARITAL_STATUS_OPTIONS
    });
  });

  it('returns loan reason options', async () => {
    const res = mockResponse();
    await platformApplicationOptionsController.getLoanReasonOptions({} as never, res as never);
    expect(res.body).toEqual({
      success: true,
      data: LOAN_REASON_OPTIONS
    });
  });
});
