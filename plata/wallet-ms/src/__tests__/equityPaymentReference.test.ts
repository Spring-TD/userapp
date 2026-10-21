import { parseEquityPaymentApplicationId } from '../utils/equityPaymentReference';

describe('equityPaymentReference', () => {
  it('parses equity-payment merchant reference', () => {
    expect(parseEquityPaymentApplicationId('equity-payment:64abc123def4567890123456')).toBe(
      '64abc123def4567890123456'
    );
  });

  it('returns undefined for unrelated references', () => {
    expect(parseEquityPaymentApplicationId('loan-repayment:abc')).toBeUndefined();
    expect(parseEquityPaymentApplicationId(undefined)).toBeUndefined();
  });
});
