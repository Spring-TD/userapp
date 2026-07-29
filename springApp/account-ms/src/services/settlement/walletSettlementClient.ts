import axios from 'axios';

export type SettlementCollectRequest = {
  merchantId: string;
  appId?: string;
  userId?: string;
  amount: number;
  referenceId: string;
  source: string;
  category: string;
  description?: string;
  applicationId?: string;
  productId?: string;
  productType?: string;
  currency?: string;
  metadata?: Record<string, unknown>;
  debitUserWallet?: boolean;
  walletServiceUrl?: string;
  internalToken?: string;
};

export type CommodityPurchaseCollectRequest = {
  userId: string;
  offeringMerchantId: string;
  offeringAppId: string;
  creatorMerchantId: string;
  creatorAppId: string;
  baseAmount: number;
  commissionAmount: number;
  referenceId: string;
  productId: string;
  currency?: string;
  applicationId?: string;
  allowExternalPrincipalSettlement?: boolean;
  metadata?: Record<string, unknown>;
};

export type SettlementCollectResult = {
  success: boolean;
  duplicate?: boolean;
  skipped?: boolean;
  insufficientFunds?: boolean;
  error?: string;
  transactionId?: string;
  totalAmount?: number;
  principalSettledOnCreator?: boolean;
  principalPendingExternalSettlement?: boolean;
};

function normalizeWalletBase(raw: string): string {
  let value = raw.trim().replace(/\/+$/g, '');
  const suffixes = ['/api/v1/internal/wallets', '/api/v1/wallets', '/api/v1/internal', '/api/v1', '/api'];
  for (;;) {
    let changed = false;
    for (const suffix of suffixes) {
      if (value.toLowerCase().endsWith(suffix.toLowerCase())) {
        value = value.slice(0, -suffix.length).replace(/\/+$/g, '');
        changed = true;
      }
    }
    if (!changed) break;
  }
  return value;
}

export function settlementInternalToken(): string {
  return (process.env.JWT_SECRET || process.env.WALLET_INTERNAL_TOKEN || '').trim();
}

function resolveWalletBase(override?: string): string {
  return normalizeWalletBase(override || process.env.WALLET_SERVICE_URL || 'http://localhost:4004');
}

function settlementCollectUrl(walletBase: string): string {
  // Primary route (formerly "/settlement/collect", still available as a legacy alias on wallet-ms)
  return `${walletBase}/api/v1/internal/wallets/repayment/collect`;
}

function resolveInternalToken(override?: string): string {
  return (override || settlementInternalToken()).trim();
}

export async function collectToSettlementWallet(
  request: SettlementCollectRequest
): Promise<SettlementCollectResult> {
  const walletBase = resolveWalletBase(request.walletServiceUrl);
  const token = resolveInternalToken(request.internalToken);
  if (!token) {
    return { success: false, skipped: true, error: 'Settlement wallet not configured (JWT_SECRET)' };
  }
  if (!request.amount || request.amount <= 0) {
    return { success: true, skipped: true };
  }

  const url = settlementCollectUrl(walletBase);
  const response = await axios.post(url, request, {
    headers: { 'Content-Type': 'application/json', 'X-Internal-Token': token },
    timeout: parseInt(process.env.WALLET_SERVICE_HTTP_TIMEOUT_MS || '30000', 10),
    validateStatus: () => true
  });

  const body = response.data as {
    success?: boolean;
    duplicate?: boolean;
    error?: string;
    code?: string;
    data?: {
      transaction?: { id?: string };
      repaymentTransaction?: { id?: string };
      settlementTransaction?: { id?: string };
    };
  };

  if (response.status === 402 || body.code === 'INSUFFICIENT_USER_WALLET_BALANCE') {
    return { success: false, insufficientFunds: true, error: body.error || 'Insufficient user wallet balance' };
  }

  if (response.status >= 200 && response.status < 300 && body.success) {
    return {
      success: true,
      duplicate: body.duplicate === true,
      transactionId: body.data?.repaymentTransaction?.id ?? body.data?.settlementTransaction?.id ?? body.data?.transaction?.id
    };
  }

  return {
    success: false,
    error: body.error || `Repayment collect failed (${response.status})`
  };
}

export async function collectCommodityPurchaseOnSpringWallet(
  request: CommodityPurchaseCollectRequest
): Promise<SettlementCollectResult> {
  const walletBase = resolveWalletBase();
  const token = resolveInternalToken();
  if (!token) {
    return { success: false, error: 'Settlement wallet not configured (JWT_SECRET)' };
  }

  const url = `${walletBase}/api/v1/internal/wallets/commodity/purchase`;
  const response = await axios.post(url, request, {
    headers: { 'Content-Type': 'application/json', 'X-Internal-Token': token },
    timeout: parseInt(process.env.WALLET_SERVICE_HTTP_TIMEOUT_MS || '30000', 10),
    validateStatus: () => true
  });

  const body = response.data as {
    success?: boolean;
    duplicate?: boolean;
    error?: string;
    code?: string;
    data?: {
      totalAmount?: number;
      principalSettledOnCreator?: boolean;
      principalPendingExternalSettlement?: boolean;
    };
  };

  if (response.status === 402 || body.code === 'INSUFFICIENT_USER_WALLET_BALANCE') {
    return { success: false, insufficientFunds: true, error: body.error || 'Insufficient user wallet balance' };
  }

  if (response.status >= 200 && response.status < 300 && body.success) {
    return {
      success: true,
      duplicate: body.duplicate === true,
      totalAmount: body.data?.totalAmount,
      principalSettledOnCreator: body.data?.principalSettledOnCreator,
      principalPendingExternalSettlement: body.data?.principalPendingExternalSettlement
    };
  }

  return {
    success: false,
    error: body.error || `Commodity purchase collect failed (${response.status})`
  };
}

export async function reverseCommodityPurchaseOnSpringWallet(
  request: CommodityPurchaseCollectRequest
): Promise<SettlementCollectResult> {
  const walletBase = resolveWalletBase();
  const token = resolveInternalToken();
  if (!token) {
    return { success: false, error: 'Settlement wallet not configured (JWT_SECRET)' };
  }

  const url = `${walletBase}/api/v1/internal/wallets/commodity/purchase/reverse`;
  const response = await axios.post(url, request, {
    headers: { 'Content-Type': 'application/json', 'X-Internal-Token': token },
    timeout: parseInt(process.env.WALLET_SERVICE_HTTP_TIMEOUT_MS || '30000', 10),
    validateStatus: () => true
  });

  const body = response.data as { success?: boolean; error?: string };
  if (response.status >= 200 && response.status < 300 && body.success) {
    return { success: true };
  }

  return {
    success: false,
    error: body.error || `Commodity purchase reversal failed (${response.status})`
  };
}
