import axios from 'axios';
import { calculateAccountMaintenanceCharge } from './settlement/commissionCalculators';
import { collectToSettlementWallet } from './settlement/walletSettlementClient';

export type BillingTargetApp = {
  appId: string;
  merchantId: string;
  appName: string;
  status: string;
};

export type RetailCustomer = {
  userId: string;
  merchantId: string;
};

export type AccountMaintenanceResult = {
  appId: string;
  userId: string;
  amount: number;
  status: 'charged' | 'duplicate' | 'skipped_zero' | 'insufficient_funds' | 'error';
  error?: string;
};

export type AccountMaintenanceRunResult = {
  success: boolean;
  billingPeriod: string;
  processedCustomers: number;
  chargedCustomers: number;
  failedCustomers: number;
  results: AccountMaintenanceResult[];
  error?: string;
};

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

function internalHeaders(jwtSecret: string): Record<string, string> {
  return { 'Content-Type': 'application/json', 'X-Internal-Token': jwtSecret };
}

function normalizeBase(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export function currentMaintenancePeriod(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function buildAccountMaintenanceReference(userId: string, period: string): string {
  return `ACCOUNT_MAINTENANCE:${period}:${userId}`;
}

export function accountMaintenanceDay(): number {
  const raw = parseInt(process.env.ACCOUNT_MAINTENANCE_BILLING_DAY || process.env.MERCHANT_MONTHLY_BILLING_DAY || '1', 10);
  if (!Number.isFinite(raw)) return 1;
  return Math.min(28, Math.max(1, raw));
}

export function isAccountMaintenanceEnabled(): boolean {
  if (process.env.ACCOUNT_MAINTENANCE_SETTLEMENT_ENABLED === 'false') {
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

export function shouldRunAccountMaintenanceToday(date = new Date()): boolean {
  return date.getUTCDate() === accountMaintenanceDay();
}

async function fetchBillingTargets(createAppBase: string, jwtSecret: string): Promise<BillingTargetApp[]> {
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
    (response.data as { error?: string })?.error || `Failed to fetch billing targets (${response.status})`
  );
}

async function fetchRetailCustomers(
  clientAuthBase: string,
  jwtSecret: string,
  appId: string
): Promise<RetailCustomer[]> {
  const url = `${clientAuthBase}/api/v1/user/internal/apps/${encodeURIComponent(appId)}/customers`;
  const response = await axios.get<{
    success?: boolean;
    data?: { customers?: Array<{ userId?: string; merchantId?: string }> };
  }>(url, {
    headers: internalHeaders(jwtSecret),
    timeout: 30000,
    validateStatus: () => true
  });

  if (response.status >= 200 && response.status < 300 && response.data?.data?.customers) {
    return response.data.data.customers
      .map((c) => ({
        userId: String(c.userId || '').trim(),
        merchantId: String(c.merchantId || '').trim()
      }))
      .filter((c) => c.userId && c.merchantId);
  }

  throw new Error(
    (response.data as { error?: string })?.error ||
      `Failed to fetch retail customers for app ${appId} (${response.status})`
  );
}

export async function runAccountMaintenanceSettlement(options?: {
  force?: boolean;
  billingPeriod?: string;
}): Promise<AccountMaintenanceRunResult> {
  const billingPeriod = options?.billingPeriod || currentMaintenancePeriod();
  const jwtSecret = stripSurroundingQuotes(process.env.JWT_SECRET || '');
  const createAppBase = normalizeBase(process.env.CREATE_APP_SERVICE_URL || 'http://localhost:3002');
  const clientAuthBase = normalizeBase(
    process.env.CLIENT_AUTH_SERVICE_URL || process.env.ACCOUNT_SERVICE_URL || 'http://localhost:3001'
  );

  if (!isAccountMaintenanceEnabled()) {
    return {
      success: false,
      billingPeriod,
      processedCustomers: 0,
      chargedCustomers: 0,
      failedCustomers: 0,
      results: [],
      error: 'Account maintenance settlement is not configured'
    };
  }

  if (!options?.force && !shouldRunAccountMaintenanceToday()) {
    return {
      success: true,
      billingPeriod,
      processedCustomers: 0,
      chargedCustomers: 0,
      failedCustomers: 0,
      results: []
    };
  }

  const fee = calculateAccountMaintenanceCharge();
  const results: AccountMaintenanceResult[] = [];
  let chargedCustomers = 0;
  let failedCustomers = 0;

  try {
    const apps = await fetchBillingTargets(createAppBase, jwtSecret);
    for (const app of apps) {
      let customers: RetailCustomer[] = [];
      try {
        customers = await fetchRetailCustomers(clientAuthBase, jwtSecret, app.appId);
      } catch (error) {
        console.error('[ACCOUNT MAINTENANCE] Failed to list customers', { appId: app.appId, error });
        continue;
      }

      for (const customer of customers) {
        const referenceId = buildAccountMaintenanceReference(customer.userId, billingPeriod);
        const collect = await collectToSettlementWallet({
          merchantId: customer.merchantId,
          appId: app.appId,
          userId: customer.userId,
          amount: fee,
          referenceId,
          source: 'billing-ms-account-maintenance',
          category: 'ACCOUNT_MAINTENANCE',
          currency: 'NGN',
          description: `Account maintenance — ${billingPeriod}`,
          debitUserWallet: true,
          metadata: { billingPeriod, feePerCustomer: fee, appName: app.appName }
        });

        if (collect.skipped || fee <= 0) {
          results.push({ appId: app.appId, userId: customer.userId, amount: fee, status: 'skipped_zero' });
          continue;
        }

        if (!collect.success) {
          failedCustomers += 1;
          const insufficient = collect.error?.toLowerCase().includes('insufficient');
          results.push({
            appId: app.appId,
            userId: customer.userId,
            amount: fee,
            status: insufficient ? 'insufficient_funds' : 'error',
            error: collect.error
          });
          continue;
        }

        chargedCustomers += 1;
        results.push({
          appId: app.appId,
          userId: customer.userId,
          amount: fee,
          status: collect.duplicate ? 'duplicate' : 'charged'
        });
      }
    }

    return {
      success: true,
      billingPeriod,
      processedCustomers: results.length,
      chargedCustomers,
      failedCustomers,
      results
    };
  } catch (error) {
    return {
      success: false,
      billingPeriod,
      processedCustomers: results.length,
      chargedCustomers,
      failedCustomers,
      results,
      error: error instanceof Error ? error.message : 'Account maintenance settlement failed'
    };
  }
}
