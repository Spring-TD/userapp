import { ApiError } from '../middleware/errorHandler';
import {
  MANAGEMENT_FEE_NAME,
  sanitizeSpringMerchantFeeAdditions
} from '../utils/managementFee';

describe('sanitizeSpringMerchantFeeAdditions', () => {
  it('allows Management Fee mark-up only', () => {
    expect(
      sanitizeSpringMerchantFeeAdditions({
        fees: [{ name: 'management fee', feeType: 'Percent', value: '1.5' }]
      })
    ).toEqual({
      fees: [{ name: MANAGEMENT_FEE_NAME, feeType: 'Percent', value: '1.5' }]
    });
  });

  it('rejects other fee names', () => {
    expect(() =>
      sanitizeSpringMerchantFeeAdditions({
        fees: [{ name: 'Processing Fee', feeType: 'Flat', value: '1000' }]
      })
    ).toThrow(ApiError);
  });

  it('rejects late repayment and forceful withdrawal additions', () => {
    expect(() =>
      sanitizeSpringMerchantFeeAdditions({
        fees: [{ name: MANAGEMENT_FEE_NAME, feeType: 'Flat', value: '0' }],
        lateRepayment: { enabled: true, penalties: [] }
      })
    ).toThrow(/late repayment/i);

    expect(() =>
      sanitizeSpringMerchantFeeAdditions({
        forcefulWithdrawalPenalties: [{ name: 'Early exit', penaltyType: 'Flat', value: '1' }]
      })
    ).toThrow(/forceful withdrawal/i);
  });
});
