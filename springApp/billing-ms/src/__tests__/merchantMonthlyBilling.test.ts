import axios from 'axios';
import {
  buildMonthlyBillingReference,
  currentBillingPeriod,
  monthlyBillingDay,
  pricePerCustomer,
  runMerchantMonthlyCustomerBilling,
  shouldRunMonthlyBillingToday
} from '../services/merchantMonthlyBillingService';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

function mockAxiosPost(urlPart: string, response: { status: number; data: unknown }) {
  mockedAxios.post.mockImplementation(async (requestUrl: string) => {
    if (requestUrl.includes(urlPart)) {
      return response as never;
    }
    throw new Error(`Unexpected POST ${requestUrl}`);
  });
}

describe('merchantMonthlyBillingService helpers', () => {
  it('builds stable monthly billing reference ids', () => {
    expect(buildMonthlyBillingReference('app_1', '2026-06')).toBe('BILLING_MONTHLY:2026-06:app_1');
  });

  it('formats billing period as YYYY-MM', () => {
    expect(currentBillingPeriod(new Date('2026-06-15T12:00:00Z'))).toBe('2026-06');
  });

  it('defaults price per customer to 100', () => {
    delete process.env.BILLING_PRICE_PER_CUSTOMER;
    expect(pricePerCustomer()).toBe(100);
  });

  it('runs on configured UTC billing day', () => {
    process.env.MERCHANT_MONTHLY_BILLING_DAY = '5';
    expect(shouldRunMonthlyBillingToday(new Date('2026-06-05T10:00:00Z'))).toBe(true);
    expect(shouldRunMonthlyBillingToday(new Date('2026-06-06T10:00:00Z'))).toBe(false);
  });

  it('clamps billing day between 1 and 28', () => {
    process.env.MERCHANT_MONTHLY_BILLING_DAY = '31';
    expect(monthlyBillingDay()).toBe(28);
  });
});

describe('runMerchantMonthlyCustomerBilling', () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...envBackup,
      JWT_SECRET: 'test-jwt-secret',
      WALLET_SERVICE_URL: 'http://wallet-ms.test',
      CREATE_APP_SERVICE_URL: 'http://create-app-ms.test',
      CLIENT_AUTH_SERVICE_URL: 'http://client-auth-ms.test',
      BILLING_PRICE_PER_CUSTOMER: '100',
      MERCHANT_MONTHLY_BILLING_DAY: '1',
      MERCHANT_MONTHLY_BILLING_ENABLED: 'true'
    };
  });

  afterAll(() => {
    process.env = envBackup;
  });

  it('charges Billing wallet when customers exist and balance is sufficient', async () => {
    mockedAxios.get.mockImplementation(async (url: string) => {
      if (url.includes('/special/apps/billing-targets')) {
        return {
          status: 200,
          data: {
            success: true,
            data: {
              apps: [
                {
                  appId: 'app_alpha',
                  merchantId: 'merchant_1',
                  appName: 'Alpha Shop',
                  status: 'active'
                }
              ]
            }
          }
        } as never;
      }
      if (url.includes('/customer-count')) {
        return {
          status: 200,
          data: { success: true, data: { appId: 'app_alpha', customerCount: 12 } }
        } as never;
      }
      throw new Error(`Unexpected GET ${url}`);
    });

    mockedAxios.post.mockImplementation(async (url: string, body?: unknown) => {
      const payload = body as Record<string, unknown>;
      expect(url).toContain('/billing/monthly-charge');
      expect(payload).toMatchObject({
        merchantId: 'merchant_1',
        appId: 'app_alpha',
        customerCount: 12,
        amount: 1200,
        pricePerCustomer: 100,
        billingPeriod: '2026-06',
        referenceId: 'BILLING_MONTHLY:2026-06:app_alpha'
      });
      expect(payload.description).toContain('12 customer');

      return {
        status: 201,
        data: {
          success: true,
          duplicate: false,
          data: { transaction: { id: 'txn_monthly_1' } }
        }
      } as never;
    });

    const result = await runMerchantMonthlyCustomerBilling({
      billingPeriod: '2026-06',
      force: true
    });

    expect(result.success).toBe(true);
    expect(result.processedApps).toBe(1);
    expect(result.chargedApps).toBe(1);
    expect(result.failedApps).toBe(0);
    expect(result.results[0]).toMatchObject({
      appId: 'app_alpha',
      merchantId: 'merchant_1',
      customerCount: 12,
      amount: 1200,
      status: 'charged',
      transactionId: 'txn_monthly_1'
    });
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });

  it('skips apps with zero customers without calling wallet-ms', async () => {
    mockedAxios.get.mockImplementation(async (url: string) => {
      if (url.includes('billing-targets')) {
        return {
          status: 200,
          data: {
            success: true,
            data: {
              apps: [{ appId: 'app_empty', merchantId: 'merchant_2', appName: 'Empty', status: 'active' }]
            }
          }
        } as never;
      }
      if (url.includes('customer-count')) {
        return {
          status: 200,
          data: { success: true, data: { customerCount: 0 } }
        } as never;
      }
      throw new Error(`Unexpected GET ${url}`);
    });

    const result = await runMerchantMonthlyCustomerBilling({
      billingPeriod: '2026-06',
      force: true
    });

    expect(result.success).toBe(true);
    expect(result.chargedApps).toBe(0);
    expect(result.skippedApps).toBe(1);
    expect(result.results[0].status).toBe('skipped_zero');
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('treats duplicate wallet charge as skipped (idempotent)', async () => {
    mockedAxios.get.mockImplementation(async (url: string) => {
      if (url.includes('billing-targets')) {
        return {
          status: 200,
          data: {
            success: true,
            data: {
              apps: [{ appId: 'app_dup', merchantId: 'merchant_3', appName: 'Dup', status: 'active' }]
            }
          }
        } as never;
      }
      if (url.includes('customer-count')) {
        return {
          status: 200,
          data: { success: true, data: { customerCount: 5 } }
        } as never;
      }
      throw new Error(`Unexpected GET ${url}`);
    });

    mockAxiosPost('billing/monthly-charge', {
      status: 200,
      data: {
        success: true,
        duplicate: true,
        data: { transaction: { id: 'txn_existing' } }
      }
    });

    const result = await runMerchantMonthlyCustomerBilling({
      billingPeriod: '2026-06',
      force: true
    });

    expect(result.success).toBe(true);
    expect(result.chargedApps).toBe(0);
    expect(result.skippedApps).toBe(1);
    expect(result.results[0]).toMatchObject({
      status: 'duplicate',
      amount: 500,
      customerCount: 5,
      transactionId: 'txn_existing'
    });
  });

  it('reports insufficient Billing wallet balance without failing the whole run', async () => {
    mockedAxios.get.mockImplementation(async (url: string) => {
      if (url.includes('billing-targets')) {
        return {
          status: 200,
          data: {
            success: true,
            data: {
              apps: [{ appId: 'app_poor', merchantId: 'merchant_4', appName: 'Poor', status: 'active' }]
            }
          }
        } as never;
      }
      if (url.includes('customer-count')) {
        return {
          status: 200,
          data: { success: true, data: { customerCount: 3 } }
        } as never;
      }
      throw new Error(`Unexpected GET ${url}`);
    });

    mockAxiosPost('billing/monthly-charge', {
      status: 402,
      data: {
        success: false,
        code: 'INSUFFICIENT_BILLING_WALLET_BALANCE',
        error: 'Insufficient balance in Billing wallet for monthly customer billing'
      }
    });

    const result = await runMerchantMonthlyCustomerBilling({
      billingPeriod: '2026-06',
      force: true
    });

    expect(result.success).toBe(false);
    expect(result.failedApps).toBe(1);
    expect(result.results[0]).toMatchObject({
      status: 'insufficient_funds',
      customerCount: 3,
      amount: 300
    });
  });

  it('does not run on non-billing days unless force is true', async () => {
    process.env.MERCHANT_MONTHLY_BILLING_DAY = '15';

    const result = await runMerchantMonthlyCustomerBilling({
      billingPeriod: '2026-06',
      force: false
    });

    expect(result.processedApps).toBe(0);
    expect(result.error).toContain('Not billing day');
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });
});
