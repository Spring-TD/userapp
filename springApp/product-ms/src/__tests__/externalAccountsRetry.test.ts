import { UpstreamApplicationService } from '../services/upstreamApplicationService';
import type { Product } from '../types/product';

const baseInput = {
  localApplicationId: 'local-app-1',
  localAppId: 'spring-app-1',
  integratorMerchantId: 'integrator-1',
  offeringMerchantId: 'merchant-1',
  product: {
    id: 'product-1',
    appId: 'spring-app-1',
    upstreamProductId: 'plata-product-1',
    upstreamAppId: 'plata-app-1',
    type: 'LOAN',
    name: 'Test Loan'
  } as Product,
  userId: 'user-1',
  applicantName: 'Test User',
  email: 'test@example.com',
  phone: '08012345678',
  bvn: '12345678901',
  amount: 50_000,
  currency: 'NGN',
  requirementSubmissions: []
};

describe('submitExternalApplication account-creation retries', () => {
  let service: UpstreamApplicationService;
  let postOnce: jest.SpyInstance;
  let sleep: jest.SpyInstance;

  beforeEach(() => {
    service = new UpstreamApplicationService();
    jest.spyOn(service, 'isConfigured').mockReturnValue(true);
    jest.spyOn(service as any, 'fetchUpstreamCatalogProduct').mockResolvedValue({
      appId: 'plata-app-1'
    });
    sleep = jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
    postOnce = jest.spyOn(service as any, 'postExternalAccountsOnce');
  });

  it('retries twice after transient failures then returns the successful account', async () => {
    postOnce
      .mockResolvedValueOnce({ skipped: true, skipReason: 'Upstream returned HTTP 503' })
      .mockResolvedValueOnce({
        upstreamAccount: { provisionStatus: 'failed', provisionError: 'temporary timeout' }
      })
      .mockResolvedValueOnce({
        upstreamApplicationId: 'upstream-1',
        upstreamAccount: { accountNumber: '7798264197', provisionStatus: 'active' }
      });

    const result = await service.submitExternalApplication(baseInput);

    expect(postOnce).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(result.upstreamAccount?.accountNumber).toBe('7798264197');
  });

  it('stops after the initial attempt plus two retries', async () => {
    postOnce.mockResolvedValue({
      skipped: true,
      skipReason: 'Upstream returned HTTP 502'
    });

    const result = await service.submitExternalApplication(baseInput);

    expect(postOnce).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      skipped: true,
      skipReason: 'Upstream returned HTTP 502'
    });
  });

  it('does not retry non-retryable client errors', async () => {
    const error = Object.assign(new Error('Invalid BVN'), { nonRetryable: true });
    postOnce.mockRejectedValueOnce(error);

    await expect(service.submitExternalApplication(baseInput)).rejects.toThrow('Invalid BVN');
    expect(postOnce).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('retries transient gateway authentication failures before succeeding', async () => {
    postOnce
      .mockRejectedValueOnce(new Error('Gateway authentication failed'))
      .mockResolvedValueOnce({
        upstreamApplicationId: 'upstream-2',
        upstreamAccount: { accountNumber: '7944884911', provisionStatus: 'active' }
      });

    const result = await service.submitExternalApplication(baseInput);

    expect(postOnce).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(result.upstreamAccount?.accountNumber).toBe('7944884911');
  });

  it('does not retry permanent existing-account provisioning errors', async () => {
    postOnce.mockResolvedValueOnce({
      upstreamAccount: {
        provisionStatus: 'failed',
        provisionError: 'Fixed virtual account already exists for customer'
      }
    });

    const result = await service.submitExternalApplication(baseInput);

    expect(postOnce).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
    expect(result.upstreamAccount?.provisionError).toMatch(/already exists/i);
  });
});
