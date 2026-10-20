import axios from 'axios';
import { config } from '../../config/environment';
import type { SettlementCollectResult } from './walletSettlementClient';

export type PlataIntegratorContext = {
  merchantId: string;
  apiKeyId: string;
  environment: string;
};

export function isPlataGatewayConfigured(): boolean {
  return Boolean(config.plataPublicKey && config.plataSecretKey && config.plataAccountServiceUrl);
}

export function getPlataAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (config.plataPublicKey) headers.PLATA_PUBLIC_KEY = config.plataPublicKey;
  if (config.plataSecretKey) headers.PLATA_SECRET_KEY = config.plataSecretKey;
  return headers;
}

function httpTimeoutMs(): number {
  return parseInt(process.env.WALLET_SERVICE_HTTP_TIMEOUT_MS || '30000', 10);
}

export async function resolvePlataIntegratorContext(): Promise<{
  success: boolean;
  data?: PlataIntegratorContext;
  error?: string;
  skipped?: boolean;
}> {
  if (!isPlataGatewayConfigured()) {
    return {
      success: false,
      skipped: true,
      error: 'PLATA_PUBLIC_KEY, PLATA_SECRET_KEY, and PLATA_ACCOUNT_SERVICE_URL are required'
    };
  }

  const response = await axios.get<{
    success?: boolean;
    data?: PlataIntegratorContext;
    error?: string;
  }>(`${config.plataAccountServiceUrl}/api/v1/gateway/integrator-context`, {
    headers: getPlataAuthHeaders(),
    timeout: httpTimeoutMs(),
    validateStatus: () => true
  });

  if (response.status >= 200 && response.status < 300 && response.data?.success && response.data.data) {
    return { success: true, data: response.data.data };
  }

  // Fallback when Plata gateway no longer exposes /gateway/integrator-context (or keys cannot call it).
  const fallbackMerchantId = (config.plataIntegratorMerchantId || '').trim();
  if (fallbackMerchantId) {
    return {
      success: true,
      data: {
        merchantId: fallbackMerchantId,
        apiKeyId: 'env:PLATA_INTEGRATOR_MERCHANT_ID',
        environment: config.nodeEnv || 'production'
      }
    };
  }

  return {
    success: false,
    error: response.data?.error || `Integrator context failed (${response.status})`
  };
}

export type PlataCatalogProduct = {
  id?: string;
  appId?: string;
  merchant?: { id?: string; name?: string; companyName?: string | null };
};

export async function fetchPlataCatalogProductById(
  upstreamProductId: string
): Promise<PlataCatalogProduct | null> {
  if (!isPlataGatewayConfigured() || !upstreamProductId.trim()) {
    return null;
  }

  const response = await axios.get<{ success?: boolean; data?: PlataCatalogProduct[] }>(
    `${config.plataAccountServiceUrl}/api/v1/products`,
    {
      headers: getPlataAuthHeaders(),
      timeout: httpTimeoutMs(),
      validateStatus: () => true
    }
  );

  if (response.status < 200 || response.status >= 300 || !Array.isArray(response.data?.data)) {
    return null;
  }

  const needle = upstreamProductId.trim();
  return (
    response.data.data.find(
      (product) => product.id === needle || (product as { referenceNumber?: string }).referenceNumber === needle
    ) ?? null
  );
}

export type InvestmentPrincipalGatewayRequest = {
  creatorMerchantId: string;
  creatorAppId?: string;
  amount: number;
  referenceId: string;
  source?: string;
  category?: string;
  currency?: string;
  description?: string;
  productId?: string;
  productType?: string;
  applicationId?: string;
  metadata?: Record<string, unknown>;
};

export async function collectInvestmentPrincipalViaPlataGateway(
  request: InvestmentPrincipalGatewayRequest
): Promise<SettlementCollectResult> {
  if (!isPlataGatewayConfigured()) {
    return {
      success: false,
      skipped: true,
      error: 'PLATA gateway keys not configured'
    };
  }
  if (!request.amount || request.amount <= 0) {
    return { success: true, skipped: true };
  }
  if (!request.creatorAppId?.trim()) {
    return { success: false, error: 'creatorAppId is required for Plata investment principal settlement' };
  }

  const response = await axios.post<{
    success?: boolean;
    duplicate?: boolean;
    error?: string;
    data?: { settlementTransaction?: { id?: string }; transaction?: { id?: string } };
  }>(
    `${config.plataAccountServiceUrl}/api/v1/wallets/investment/principal-settlement`,
    {
      creatorMerchantId: request.creatorMerchantId,
      creatorAppId: request.creatorAppId,
      amount: request.amount,
      currency: request.currency || 'NGN',
      referenceId: request.referenceId,
      source: request.source || 'spring-investment-purchase',
      category: request.category || 'INVESTMENT_DEPOSIT',
      description: request.description,
      productId: request.productId,
      productType: request.productType || 'INVESTMENT',
      applicationId: request.applicationId,
      metadata: request.metadata
    },
    {
      headers: { ...getPlataAuthHeaders(), 'Content-Type': 'application/json' },
      timeout: httpTimeoutMs(),
      validateStatus: () => true
    }
  );

  if (response.status >= 200 && response.status < 300 && response.data?.success) {
    return {
      success: true,
      duplicate: response.data.duplicate === true,
      transactionId:
        response.data.data?.settlementTransaction?.id ?? response.data.data?.transaction?.id
    };
  }

  return {
    success: false,
    error: response.data?.error || `Plata investment principal settlement failed (${response.status})`
  };
}

export type SavingsPrincipalGatewayRequest = InvestmentPrincipalGatewayRequest;

export async function collectSavingsPrincipalViaPlataGateway(
  request: SavingsPrincipalGatewayRequest
): Promise<SettlementCollectResult> {
  if (!isPlataGatewayConfigured()) {
    return {
      success: false,
      skipped: true,
      error: 'PLATA gateway keys not configured'
    };
  }
  if (!request.amount || request.amount <= 0) {
    return { success: true, skipped: true };
  }
  if (!request.creatorAppId?.trim()) {
    return { success: false, error: 'creatorAppId is required for Plata savings principal settlement' };
  }

  const response = await axios.post<{
    success?: boolean;
    duplicate?: boolean;
    error?: string;
    data?: { settlementTransaction?: { id?: string }; transaction?: { id?: string } };
  }>(
    `${config.plataAccountServiceUrl}/api/v1/wallets/savings/principal-settlement`,
    {
      creatorMerchantId: request.creatorMerchantId,
      creatorAppId: request.creatorAppId,
      amount: request.amount,
      currency: request.currency || 'NGN',
      referenceId: request.referenceId,
      source: request.source || 'spring-savings-deposit',
      category: request.category || 'SAVINGS_DEPOSIT',
      description: request.description,
      productId: request.productId,
      productType: request.productType || 'SAVINGS',
      applicationId: request.applicationId,
      metadata: request.metadata
    },
    {
      headers: { ...getPlataAuthHeaders(), 'Content-Type': 'application/json' },
      timeout: httpTimeoutMs(),
      validateStatus: () => true
    }
  );

  if (response.status >= 200 && response.status < 300 && response.data?.success) {
    return {
      success: true,
      duplicate: response.data.duplicate === true,
      transactionId:
        response.data.data?.settlementTransaction?.id ?? response.data.data?.transaction?.id
    };
  }

  return {
    success: false,
    error: response.data?.error || `Plata savings principal settlement failed (${response.status})`
  };
}

export type MaturityWithdrawalGatewayRequest = {
  creatorMerchantId: string;
  creatorAppId: string;
  amount: number;
  principalAmount?: number;
  interestAmount?: number;
  referenceId: string;
  currency?: string;
  description?: string;
  productId?: string;
  productType?: 'SAVINGS' | 'INVESTMENT' | 'COMMODITY' | string;
  applicationId?: string;
  offeringMerchantId?: string;
  offeringAppId?: string;
  userId?: string;
  customerName?: string;
  customerEmail?: string;
  productName?: string;
  maturityAt?: string;
  springLocalApplicationId?: string;
  metadata?: Record<string, unknown>;
};

export async function enqueueMaturityWithdrawalRequestViaPlataGateway(
  request: MaturityWithdrawalGatewayRequest
): Promise<SettlementCollectResult> {
  if (!isPlataGatewayConfigured()) {
    return {
      success: false,
      skipped: true,
      error: 'PLATA gateway keys not configured'
    };
  }
  if (!request.amount || request.amount <= 0) {
    return { success: false, error: 'amount must be a positive number' };
  }
  if (!request.creatorMerchantId?.trim() || !request.creatorAppId?.trim() || !request.referenceId?.trim()) {
    return {
      success: false,
      error: 'creatorMerchantId, creatorAppId, and referenceId are required'
    };
  }

  const productType = String(request.productType || 'INVESTMENT').trim().toUpperCase() || 'INVESTMENT';
  const pathSegment =
    productType === 'SAVINGS'
      ? 'savings'
      : productType === 'COMMODITY'
        ? 'commodity'
        : 'investment';

  const response = await axios.post<{
    success?: boolean;
    duplicate?: boolean;
    error?: string;
    data?: { transaction?: { id?: string } };
  }>(
    `${config.plataAccountServiceUrl}/api/v1/wallets/${pathSegment}/maturity-withdrawal-request`,
    {
      creatorMerchantId: request.creatorMerchantId.trim(),
      creatorAppId: request.creatorAppId.trim(),
      amount: request.amount,
      principalAmount: request.principalAmount,
      interestAmount: request.interestAmount,
      currency: request.currency || 'NGN',
      referenceId: request.referenceId.trim(),
      description: request.description,
      productId: request.productId,
      productType,
      applicationId: request.applicationId,
      offeringMerchantId: request.offeringMerchantId,
      offeringAppId: request.offeringAppId,
      userId: request.userId,
      customerName: request.customerName,
      customerEmail: request.customerEmail,
      productName: request.productName,
      maturityAt: request.maturityAt,
      springLocalApplicationId: request.springLocalApplicationId,
      metadata: request.metadata
    },
    {
      headers: { ...getPlataAuthHeaders(), 'Content-Type': 'application/json' },
      timeout: httpTimeoutMs(),
      validateStatus: () => true
    }
  );

  if (response.status >= 200 && response.status < 300 && response.data?.success) {
    return {
      success: true,
      duplicate: response.data.duplicate === true,
      transactionId: response.data.data?.transaction?.id
    };
  }

  return {
    success: false,
    error: response.data?.error || `Plata maturity withdrawal request failed (${response.status})`
  };
}

export type CommodityPrincipalGatewayRequest = InvestmentPrincipalGatewayRequest;

export async function collectCommodityPrincipalViaPlataGateway(
  request: CommodityPrincipalGatewayRequest
): Promise<SettlementCollectResult> {
  if (!isPlataGatewayConfigured()) {
    return {
      success: false,
      skipped: true,
      error: 'PLATA gateway keys not configured'
    };
  }
  if (!request.amount || request.amount <= 0) {
    return { success: true, skipped: true };
  }
  if (!request.creatorAppId?.trim()) {
    return { success: false, error: 'creatorAppId is required for Plata commodity principal settlement' };
  }

  const response = await axios.post<{
    success?: boolean;
    duplicate?: boolean;
    error?: string;
    data?: { settlementTransaction?: { id?: string }; transaction?: { id?: string } };
  }>(
    `${config.plataAccountServiceUrl}/api/v1/wallets/commodity/principal-settlement`,
    {
      creatorMerchantId: request.creatorMerchantId,
      creatorAppId: request.creatorAppId,
      amount: request.amount,
      currency: request.currency || 'NGN',
      referenceId: request.referenceId,
      source: request.source || 'spring-commodity-enrollment',
      category: request.category || 'COMMODITY_DEPOSIT',
      description: request.description,
      productId: request.productId,
      productType: request.productType || 'COMMODITY',
      applicationId: request.applicationId,
      metadata: request.metadata
    },
    {
      headers: { ...getPlataAuthHeaders(), 'Content-Type': 'application/json' },
      timeout: httpTimeoutMs(),
      validateStatus: () => true
    }
  );

  if (response.status >= 200 && response.status < 300 && response.data?.success) {
    return {
      success: true,
      duplicate: response.data.duplicate === true,
      transactionId:
        response.data.data?.settlementTransaction?.id ?? response.data.data?.transaction?.id
    };
  }

  return {
    success: false,
    error: response.data?.error || `Plata commodity principal settlement failed (${response.status})`
  };
}
