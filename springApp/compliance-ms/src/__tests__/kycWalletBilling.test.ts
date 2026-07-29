import { hasActivePendingFuspayVerification } from '../utils/fuspayVerificationStatus';

describe('hasActivePendingFuspayVerification', () => {
  it('returns false when verification is missing', () => {
    expect(hasActivePendingFuspayVerification(undefined)).toBe(false);
    expect(hasActivePendingFuspayVerification(null)).toBe(false);
  });

  it('returns false when id or url is missing', () => {
    expect(
      hasActivePendingFuspayVerification({
        verificationId: 'abc',
        verificationUrl: '',
        status: 'pending'
      })
    ).toBe(false);
  });

  it('returns true for pending verification with id and url', () => {
    expect(
      hasActivePendingFuspayVerification({
        verificationId: 'ver_123',
        verificationUrl: 'https://example.com/kyc',
        status: 'pending'
      })
    ).toBe(true);
  });

  it('returns false for completed or failed verification', () => {
    expect(
      hasActivePendingFuspayVerification({
        verificationId: 'ver_123',
        verificationUrl: 'https://example.com/kyc',
        status: 'completed'
      })
    ).toBe(false);

    expect(
      hasActivePendingFuspayVerification({
        verificationId: 'ver_123',
        verificationUrl: 'https://example.com/kyc',
        overallStatus: 'failed'
      })
    ).toBe(false);
  });
});

describe('resolveTenantContext', () => {
  const { resolveTenantContext } = require('../utils/tenantContext');

  it('reads tenant headers from the request', () => {
    const req = {
      headers: {
        'x-tenant-app-id': 'app_1',
        'x-tenant-merchant-id': 'merchant_1',
        'x-tenant-subdomain': 'demo'
      },
      user: undefined
    };

    expect(resolveTenantContext(req)).toEqual({
      merchantId: 'merchant_1',
      appId: 'app_1',
      subdomain: 'demo'
    });
  });

  it('falls back to JWT merchant id when header is absent', () => {
    const req = {
      headers: {
        'x-tenant-app-id': 'app_1'
      },
      user: {
        userMerchantId: 'merchant_from_jwt'
      }
    };

    expect(resolveTenantContext(req)).toEqual({
      merchantId: 'merchant_from_jwt',
      appId: 'app_1',
      subdomain: undefined
    });
  });
});
