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
};

export type SettlementCollectResult = {
  success: boolean;
  duplicate?: boolean;
  skipped?: boolean;
  insufficientFunds?: boolean;
  error?: string;
  transactionId?: string;
  userTransactionId?: string;
  userWallet?: {
    id?: string;
    mainBalance?: number;
    ledgerBalance?: number;
    currency?: string;
  };
  principalAmount?: number;
};

export type InvestmentPurchaseCollectRequest = {
  userId: string;
  offeringMerchantId: string;
  offeringAppId: string;
  /** Full investment principal (credited to Plata creator via gateway). */
  principalAmount: number;
  /** Spring merchant fee on top of principal. */
  commissionAmount: number;
  /** @deprecated Legacy field; equals principalAmount. */
  creatorPrincipalAmount?: number;
  referenceId: string;
  productId: string;
  applicationId?: string;
  currency?: string;
  creatorMerchantId?: string;
  creatorAppId?: string;
  metadata?: Record<string, unknown>;
};

export type SavingsPurchaseCollectRequest = {
  userId: string;
  offeringMerchantId: string;
  offeringAppId: string;
  principalAmount: number;
  referenceId: string;
  productId: string;
  applicationId?: string;
  currency?: string;
  creatorMerchantId?: string;
  creatorAppId?: string;
  metadata?: Record<string, unknown>;
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
  applicationId?: string;
  currency?: string;
  allowExternalPrincipalSettlement?: boolean;
  metadata?: Record<string, unknown>;
};

export type CommodityMaturityPayoutRequest = {
  userId: string;
  offeringMerchantId: string;
  creatorMerchantId: string;
  creatorAppId: string;
  principalAmount: number;
  interestAmount: number;
  referenceId: string;
  applicationId: string;
  currency?: string;
  metadata?: Record<string, unknown>;
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

export function isSettlementWalletConfigured(): boolean {
  const base = (process.env.WALLET_SERVICE_URL || '').trim();
  return Boolean(base && settlementInternalToken());
}

export async function collectToSettlementWallet(
  request: SettlementCollectRequest
): Promise<SettlementCollectResult> {
  const walletBase = normalizeWalletBase(process.env.WALLET_SERVICE_URL || 'http://localhost:4004');
  const token = settlementInternalToken();
  if (!token) {
    return { success: false, skipped: true, error: 'Settlement wallet not configured (JWT_SECRET)' };
  }
  if (!request.amount || request.amount <= 0) {
    return { success: true, skipped: true };
  }

  // Primary route (formerly "/settlement/collect", still available as a legacy alias on wallet-ms)
  const url = `${walletBase}/api/v1/internal/wallets/repayment/collect`;
  const response = await axios.post(
    url,
    request,
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': token
      },
      timeout: parseInt(process.env.WALLET_SERVICE_HTTP_TIMEOUT_MS || '30000', 10),
      validateStatus: () => true
    }
  );

  const body = response.data as {
    success?: boolean;
    duplicate?: boolean;
    error?: string;
    data?: {
      transaction?: { id?: string };
      repaymentTransaction?: { id?: string };
      settlementTransaction?: { id?: string };
      userTransaction?: { id?: string };
      userWallet?: {
        id?: string;
        mainBalance?: number;
        ledgerBalance?: number;
        currency?: string;
      };
    };
  };

  if (response.status >= 200 && response.status < 300 && body.success) {
    return {
      success: true,
      duplicate: body.duplicate === true,
      transactionId: body.data?.repaymentTransaction?.id ?? body.data?.settlementTransaction?.id ?? body.data?.transaction?.id,
      userTransactionId: body.data?.userTransaction?.id,
      userWallet: body.data?.userWallet
    };
  }

  if (response.status === 402) {
    return {
      success: false,
      insufficientFunds: true,
      error: body.error || 'Insufficient user wallet balance for repayment collection',
      userWallet: body.data?.userWallet
    };
  }

  return {
    success: false,
    error: body.error || `Settlement collect failed (${response.status})`
  };
}

export async function collectInvestmentPurchaseOnSpringWallet(
  request: InvestmentPurchaseCollectRequest
): Promise<SettlementCollectResult> {
  const walletBase = normalizeWalletBase(process.env.WALLET_SERVICE_URL || 'http://localhost:4004');
  const token = settlementInternalToken();
  if (!token) {
    return { success: false, error: 'Settlement wallet not configured (JWT_SECRET)' };
  }

  const url = `${walletBase}/api/v1/internal/wallets/investment/purchase`;
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
    data?: { principalAmount?: number };
  };

  if (response.status === 402 || body.code === 'INSUFFICIENT_USER_WALLET_BALANCE') {
    return { success: false, insufficientFunds: true, error: body.error || 'Insufficient user wallet balance' };
  }

  if (response.status >= 200 && response.status < 300 && body.success) {
    return {
      success: true,
      duplicate: body.duplicate === true,
      principalAmount: body.data?.principalAmount
    };
  }

  return {
    success: false,
    error: body.error || `Investment purchase collect failed (${response.status})`
  };
}

export async function reverseInvestmentPurchaseOnSpringWallet(
  request: InvestmentPurchaseCollectRequest
): Promise<SettlementCollectResult> {
  const walletBase = normalizeWalletBase(process.env.WALLET_SERVICE_URL || 'http://localhost:4004');
  const token = settlementInternalToken();
  if (!token) {
    return { success: false, error: 'Settlement wallet not configured (JWT_SECRET)' };
  }

  const url = `${walletBase}/api/v1/internal/wallets/investment/purchase/reverse`;
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
    error: body.error || `Investment purchase reversal failed (${response.status})`
  };
}

export async function collectSavingsPurchaseOnSpringWallet(
  request: SavingsPurchaseCollectRequest
): Promise<SettlementCollectResult> {
  const walletBase = normalizeWalletBase(process.env.WALLET_SERVICE_URL || 'http://localhost:4004');
  const token = settlementInternalToken();
  if (!token) {
    return { success: false, error: 'Settlement wallet not configured (JWT_SECRET)' };
  }

  const url = `${walletBase}/api/v1/internal/wallets/savings/purchase`;
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
    data?: { principalAmount?: number };
  };

  if (response.status === 402 || body.code === 'INSUFFICIENT_USER_WALLET_BALANCE') {
    return { success: false, insufficientFunds: true, error: body.error || 'Insufficient user wallet balance' };
  }

  if (response.status >= 200 && response.status < 300 && body.success) {
    return {
      success: true,
      duplicate: body.duplicate === true,
      principalAmount: body.data?.principalAmount
    };
  }

  return {
    success: false,
    error: body.error || `Savings deposit collect failed (${response.status})`
  };
}

export async function reverseSavingsPurchaseOnSpringWallet(
  request: SavingsPurchaseCollectRequest
): Promise<SettlementCollectResult> {
  const walletBase = normalizeWalletBase(process.env.WALLET_SERVICE_URL || 'http://localhost:4004');
  const token = settlementInternalToken();
  if (!token) {
    return { success: false, error: 'Settlement wallet not configured (JWT_SECRET)' };
  }

  const url = `${walletBase}/api/v1/internal/wallets/savings/purchase/reverse`;
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
    error: body.error || `Savings deposit reversal failed (${response.status})`
  };
}

export async function collectCommodityPurchaseOnSpringWallet(
  request: CommodityPurchaseCollectRequest
): Promise<
  SettlementCollectResult & {
    totalAmount?: number;
    principalSettledOnCreator?: boolean;
    principalPendingExternalSettlement?: boolean;
  }
> {
  const walletBase = normalizeWalletBase(process.env.WALLET_SERVICE_URL || 'http://localhost:4004');
  const token = settlementInternalToken();
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
  const walletBase = normalizeWalletBase(process.env.WALLET_SERVICE_URL || 'http://localhost:4004');
  const token = settlementInternalToken();
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

export async function payoutCommodityMaturityOnSpringWallet(
  request: CommodityMaturityPayoutRequest
): Promise<SettlementCollectResult & { totalPayout?: number }> {
  const walletBase = normalizeWalletBase(process.env.WALLET_SERVICE_URL || 'http://localhost:4004');
  const token = settlementInternalToken();
  if (!token) {
    return { success: false, error: 'Settlement wallet not configured (JWT_SECRET)' };
  }

  const url = `${walletBase}/api/v1/internal/wallets/commodity/maturity-payout`;
  const response = await axios.post(url, request, {
    headers: { 'Content-Type': 'application/json', 'X-Internal-Token': token },
    timeout: parseInt(process.env.WALLET_SERVICE_HTTP_TIMEOUT_MS || '30000', 10),
    validateStatus: () => true
  });

  const body = response.data as {
    success?: boolean;
    duplicate?: boolean;
    error?: string;
    data?: { totalPayout?: number };
  };

  if (response.status >= 200 && response.status < 300 && body.success) {
    return {
      success: true,
      duplicate: body.duplicate === true,
      totalPayout: body.data?.totalPayout
    };
  }

  return {
    success: false,
    error: body.error || `Commodity maturity payout failed (${response.status})`
  };
}
