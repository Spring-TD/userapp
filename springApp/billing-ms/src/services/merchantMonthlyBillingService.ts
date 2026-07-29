import axios from 'axios';

function stripSurroundingQuotes(s: string): string {
  const t = s.trim();
  if (t.length >= 2) {
    const a = t[0];
    const b = t[t.length - 1];
    if ((a === '"' && b === '"') || (a === "'" && b === "'")) {
      return t.slice(1, -1).trim();
    }
  }
  return t;
}

export type BillingTargetApp = {
  appId: string;
  merchantId: string;
  appName: string;
  status: string;
};

export type MonthlyBillingAppResult = {
  appId: string;
  merchantId: string;
  appName?: string;
  customerCount: number;
  amount: number;
  status: 'charged' | 'duplicate' | 'skipped_zero' | 'insufficient_funds' | 'error';
  error?: string;
  transactionId?: string;
};

export type MonthlyBillingRunResult = {
  success: boolean;
  billingPeriod: string;
  processedApps: number;
  chargedApps: number;
  skippedApps: number;
  failedApps: number;
  results: MonthlyBillingAppResult[];
  error?: string;
};

function internalHeaders(jwtSecret: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Internal-Token': jwtSecret
  };
}

function normalizeBase(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export function currentBillingPeriod(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function buildMonthlyBillingReference(appId: string, billingPeriod: string): string {
  return `BILLING_MONTHLY:${billingPeriod}:${appId}`;
}

export function pricePerCustomer(): number {
  const raw = process.env.BILLING_PRICE_PER_CUSTOMER;
  const parsed = raw ? Number.parseFloat(raw) : 100;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 100;
}

export function monthlyBillingDay(): number {
  const raw = parseInt(process.env.MERCHANT_MONTHLY_BILLING_DAY || '1', 10);
  if (!Number.isFinite(raw)) return 1;
  return Math.min(28, Math.max(1, raw));
}

export function isMonthlyBillingEnabled(): boolean {
  if (process.env.MERCHANT_MONTHLY_BILLING_ENABLED === 'false') {
    return false;
  }
  const jwtSecret = stripSurroundingQuotes(process.env.JWT_SECRET || '');
  const walletUrl = normalizeBase(process.env.WALLET_SERVICE_URL || 'http://localhost:4004');
  const createAppUrl = normalizeBase(process.env.CREATE_APP_SERVICE_URL || 'http://localhost:3002');
  const clientAuthUrl = normalizeBase(
    process.env.CLIENT_AUTH_SERVICE_URL || process.env.ACCOUNT_SERVICE_URL || 'http://localhost:3001'
  );
  return Boolean(jwtSecret && walletUrl && createAppUrl && clientAuthUrl);
}

export function shouldRunMonthlyBillingToday(date = new Date()): boolean {
  const day = monthlyBillingDay();
  return date.getUTCDate() === day;
}

async function fetchBillingTargets(
  createAppBase: string,
  jwtSecret: string
): Promise<BillingTargetApp[]> {
  const url = `${createAppBase}/api/v1/special/apps/billing-targets`;
  const response = await axios.get<{ success?: boolean; data?: { apps?: BillingTargetApp[] } }>(url, {
    headers: internalHeaders(jwtSecret),
    timeout: 30000,
    validateStatus: () => true
  });

  if (response.status >= 200 && response.status < 300 && response.data?.data?.apps) {
    return response.data.data.apps;
  }

  throw new Error(
    (response.data as { error?: string })?.error ||
      `Failed to fetch billing targets (${response.status})`
  );
}

async function fetchCustomerCount(
  clientAuthBase: string,
  jwtSecret: string,
  appId: string
): Promise<number> {
  const url = `${clientAuthBase}/api/v1/user/internal/apps/${encodeURIComponent(appId)}/customer-count`;
  const response = await axios.get<{ success?: boolean; data?: { customerCount?: number } }>(url, {
    headers: internalHeaders(jwtSecret),
    timeout: 20000,
    validateStatus: () => true
  });

  if (response.status >= 200 && response.status < 300) {
    const count = response.data?.data?.customerCount;
    return typeof count === 'number' && Number.isFinite(count) ? Math.max(0, count) : 0;
  }

  throw new Error(
    (response.data as { error?: string })?.error ||
      `Failed to fetch customer count for app ${appId} (${response.status})`
  );
}

async function chargeBillingWallet(input: {
  walletBase: string;
  jwtSecret: string;
  merchantId: string;
  appId: string;
  appName?: string;
  billingPeriod: string;
  customerCount: number;
  amount: number;
  pricePerCustomer: number;
}): Promise<{
  status: MonthlyBillingAppResult['status'];
  error?: string;
  transactionId?: string;
}> {
  const referenceId = buildMonthlyBillingReference(input.appId, input.billingPeriod);
  const url = `${input.walletBase}/api/v1/internal/wallets/billing/monthly-charge`;

  const response = await axios.post(
    url,
    {
      merchantId: input.merchantId,
      appId: input.appId,
      appName: input.appName,
      amount: input.amount,
      billingPeriod: input.billingPeriod,
      customerCount: input.customerCount,
      pricePerCustomer: input.pricePerCustomer,
      referenceId,
      description: `Monthly platform billing — ${input.customerCount} customer(s) @ ${input.pricePerCustomer} (${input.billingPeriod})`
    },
    {
      headers: internalHeaders(input.jwtSecret),
      timeout: 30000,
      validateStatus: () => true
    }
  );

  const body = response.data as {
    success?: boolean;
    duplicate?: boolean;
    skipped?: boolean;
    error?: string;
    data?: { transaction?: { id?: string } };
  };

  if (response.status >= 200 && response.status < 300 && body.success) {
    if (body.skipped) {
      return { status: 'skipped_zero' };
    }
    if (body.duplicate) {
      return {
        status: 'duplicate',
        transactionId: body.data?.transaction?.id
      };
    }
    return {
      status: 'charged',
      transactionId: body.data?.transaction?.id
    };
  }

  if (response.status === 402 || body.error?.includes('Insufficient')) {
    return { status: 'insufficient_funds', error: body.error || 'Insufficient Billing wallet balance' };
  }

  return {
    status: 'error',
    error: body.error || `Wallet charge failed (${response.status})`
  };
}

export async function runMerchantMonthlyCustomerBilling(options?: {
  billingPeriod?: string;
  force?: boolean;
}): Promise<MonthlyBillingRunResult> {
  const billingPeriod = options?.billingPeriod?.trim() || currentBillingPeriod();
  const jwtSecret = stripSurroundingQuotes(process.env.JWT_SECRET || '');
  const walletBase = normalizeBase(process.env.WALLET_SERVICE_URL || 'http://localhost:4004');
  const createAppBase = normalizeBase(process.env.CREATE_APP_SERVICE_URL || 'http://localhost:3002');
  const clientAuthBase = normalizeBase(
    process.env.CLIENT_AUTH_SERVICE_URL || process.env.ACCOUNT_SERVICE_URL || 'http://localhost:3001'
  );

  if (!isMonthlyBillingEnabled()) {
    return {
      success: false,
      billingPeriod,
      processedApps: 0,
      chargedApps: 0,
      skippedApps: 0,
      failedApps: 0,
      results: [],
      error:
        'Monthly billing is not configured (JWT_SECRET, WALLET_SERVICE_URL, CREATE_APP_SERVICE_URL, CLIENT_AUTH_SERVICE_URL)'
    };
  }

  if (!options?.force && !shouldRunMonthlyBillingToday()) {
    return {
      success: true,
      billingPeriod,
      processedApps: 0,
      chargedApps: 0,
      skippedApps: 0,
      failedApps: 0,
      results: [],
      error: `Not billing day (runs on day ${monthlyBillingDay()} UTC)`
    };
  }

  const perCustomer = pricePerCustomer();
  const results: MonthlyBillingAppResult[] = [];

  try {
    const targets = await fetchBillingTargets(createAppBase, jwtSecret);

    for (const target of targets) {
      const row: MonthlyBillingAppResult = {
        appId: target.appId,
        merchantId: target.merchantId,
        appName: target.appName,
        customerCount: 0,
        amount: 0,
        status: 'error'
      };

      try {
        const customerCount = await fetchCustomerCount(clientAuthBase, jwtSecret, target.appId);
        const amount = Math.round(customerCount * perCustomer * 100) / 100;

        row.customerCount = customerCount;
        row.amount = amount;

        if (amount <= 0) {
          row.status = 'skipped_zero';
          results.push(row);
          continue;
        }

        const charge = await chargeBillingWallet({
          walletBase,
          jwtSecret,
          merchantId: target.merchantId,
          appId: target.appId,
          appName: target.appName,
          billingPeriod,
          customerCount,
          amount,
          pricePerCustomer: perCustomer
        });

        row.status = charge.status;
        row.error = charge.error;
        row.transactionId = charge.transactionId;
      } catch (appError) {
        row.status = 'error';
        row.error = appError instanceof Error ? appError.message : 'Unknown billing error';
      }

      results.push(row);
    }

    const chargedApps = results.filter((r) => r.status === 'charged').length;
    const skippedApps = results.filter((r) => r.status === 'skipped_zero' || r.status === 'duplicate').length;
    const failedApps = results.filter(
      (r) => r.status === 'error' || r.status === 'insufficient_funds'
    ).length;

    return {
      success: failedApps === 0,
      billingPeriod,
      processedApps: results.length,
      chargedApps,
      skippedApps,
      failedApps,
      results
    };
  } catch (error) {
    return {
      success: false,
      billingPeriod,
      processedApps: results.length,
      chargedApps: 0,
      skippedApps: 0,
      failedApps: results.length,
      results,
      error: error instanceof Error ? error.message : 'Monthly billing run failed'
    };
  }
}
