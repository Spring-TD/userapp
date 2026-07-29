import {
  buildSavingsDepositMerchantReference,
  parseSavingsDepositUpstreamApplicationId
} from '../utils/savingsDepositReference';

describe('savingsDepositReference', () => {
  it('builds and parses savings deposit merchant reference', () => {
    const ref = buildSavingsDepositMerchantReference('plata-app-123');
    expect(ref).toBe('savings-deposit:plata-app-123');
    expect(parseSavingsDepositUpstreamApplicationId(ref)).toBe('plata-app-123');
  });

  it('returns undefined for unrelated references', () => {
    expect(parseSavingsDepositUpstreamApplicationId('equity-payment:abc')).toBeUndefined();
  });
});
