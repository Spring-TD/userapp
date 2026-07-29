import {
  calculateTransactionCharge,
  defaultTransactionFixedFee
} from '../services/settlement/commissionCalculators';

describe('payment-ms commissionCalculators', () => {
  const originalFixed = process.env.DEFAULT_TRANSACTION_CHARGE_FIXED_NGN;

  afterEach(() => {
    if (originalFixed === undefined) {
      delete process.env.DEFAULT_TRANSACTION_CHARGE_FIXED_NGN;
    } else {
      process.env.DEFAULT_TRANSACTION_CHARGE_FIXED_NGN = originalFixed;
    }
  });

  it('defaults transaction fixed fee to 50 NGN', () => {
    delete process.env.DEFAULT_TRANSACTION_CHARGE_FIXED_NGN;
    expect(defaultTransactionFixedFee()).toBe(50);
  });

  it('uses explicit merchant_commission when provided', () => {
    expect(calculateTransactionCharge({ amount: 10_000, merchantCommission: 25 })).toBe(25);
  });

  it('falls back to default fixed fee when merchant_commission is zero', () => {
    delete process.env.DEFAULT_TRANSACTION_CHARGE_FIXED_NGN;
    expect(
      calculateTransactionCharge({
        amount: 10_000,
        merchantCommission: 0,
        fixedFee: defaultTransactionFixedFee()
      })
    ).toBe(50);
  });
});
