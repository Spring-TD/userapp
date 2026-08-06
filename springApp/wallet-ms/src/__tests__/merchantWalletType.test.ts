import { MerchantWalletType } from '../models/Wallet';
import {
  merchantWalletTypesForLookup,
  normalizeMerchantWalletType
} from '../utils/merchantWalletType';

describe('merchant wallet type compatibility', () => {
  it('never treats the distinct KYC wallet as repayment', () => {
    expect(merchantWalletTypesForLookup(MerchantWalletType.REPAYMENT)).toEqual([
      MerchantWalletType.REPAYMENT,
      'SETTLEMENT'
    ]);
    expect(merchantWalletTypesForLookup(MerchantWalletType.REPAYMENT)).not.toContain('KYC');
  });

  it('keeps only unambiguous stored-name migrations', () => {
    expect(normalizeMerchantWalletType('SETTLEMENT')).toBe(MerchantWalletType.REPAYMENT);
    expect(normalizeMerchantWalletType('OPERATION')).toBe(MerchantWalletType.BILLING);
    expect(normalizeMerchantWalletType('TREASURY')).toBeUndefined();
  });
});
