import axios from 'axios';
import { config } from '../config/environment';
import type { SettlementCollectResult } from './settlement/walletSettlementClient';

export type PlataIntegratorContext = {
  merchantId: string;
  apiKeyId: string;
  environment: string;
};

export function isPlataGatewayConfigured(): boolean {
  return Boolean(config.plataPublicKey && config.plataSecretKey && config.plataAccountServiceUrl);
}

/** Same headers as product-ms upstream Plata catalog calls. */
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

/** Full catalog list includes merchant metadata that GET /products/:id may omit. */
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

export type CommodityPrincipalGatewayRequest = {
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
  metadata?: Record<string, unknown>;
};

/**
 * Credit product creator SETTLEMENT on Plata via account-ms-plata gateway (not direct wallet-ms internal token).
 */
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
    return { success: false, error: 'creatorAppId is required for Plata principal settlement' };
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
      source: request.source || 'spring-commodity-purchase',
      category: request.category || 'COMMODITY_DEPOSIT',
      description: request.description,
      productId: request.productId,
      productType: request.productType,
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
