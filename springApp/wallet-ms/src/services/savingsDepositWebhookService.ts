import axios from 'axios';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

export interface ForwardExternalSavingsDepositInput {
  upstreamApplicationId: string;
  amount: number;
  currency: string;
  providerReference: string;
  merchantId?: string;
  appId?: string;
}

function internalToken(): string {
  return (config.walletInternalToken || config.jwtSecret || '').trim();
}

function normalizeProductBase(raw: string): string {
  return raw.trim().replace(/\/+$/g, '').replace(/\/api\/v1$/i, '');
}

export async function forwardExternalSavingsDepositToProductMs(
  input: ForwardExternalSavingsDepositInput
): Promise<{ success: boolean; duplicate?: boolean; error?: string; status?: number }> {
  const baseUrl = normalizeProductBase(config.productServiceUrl);
  const token = internalToken();
  if (!baseUrl) {
    return { success: false, error: 'PRODUCT_SERVICE_URL is not configured' };
  }
  if (!token) {
    return { success: false, error: 'JWT_SECRET is not configured for product-ms internal calls' };
  }

  try {
    const response = await axios.post<{
      success?: boolean;
      duplicate?: boolean;
      error?: string;
    }>(
      `${baseUrl}/api/v1/savings-accounts/internal/deposit-webhook`,
      {
        upstreamApplicationId: input.upstreamApplicationId,
        amount: input.amount,
        currency: input.currency,
        providerReference: input.providerReference,
        merchantId: input.merchantId,
        appId: input.appId
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': token
        },
        timeout: 30_000,
        validateStatus: () => true
      }
    );

    if (response.status >= 200 && response.status < 300 && response.data?.success) {
      return { success: true, duplicate: response.data.duplicate === true, status: response.status };
    }

    return {
      success: false,
      error: response.data?.error || `product-ms returned HTTP ${response.status}`,
      status: response.status
    };
  } catch (error) {
    const message = axios.isAxiosError(error) ? error.message : 'product-ms unavailable';
    logger.error('Failed to forward external savings deposit to product-ms', { error: message, input });
    return { success: false, error: message };
  }
}
