import axios from 'axios';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

function springProductBaseUrl(): string {
  return (
    process.env.SPRING_PRODUCT_SERVICE_URL ||
    process.env.STOREFRONT_PRODUCT_SERVICE_URL ||
    (config.nodeEnv === 'production' ? 'https://product-ms.fly.dev' : 'http://localhost:4005')
  ).replace(/\/+$/, '');
}

function internalHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Internal-Token': (config.jwtSecret || '').trim()
  };
}

export async function notifySpringMaturityWithdrawalApproved(args: {
  localApplicationId: string;
  referenceId: string;
  principal: number;
  interest: number;
  totalPayout: number;
  currency?: string;
  productType?: string;
}): Promise<{ success: boolean; error?: string }> {
  const id = args.localApplicationId.trim();
  if (!id) return { success: false, error: 'springLocalApplicationId is required' };

  try {
    const response = await axios.post(
      `${springProductBaseUrl()}/api/v1/internal/maturity-withdrawals/${encodeURIComponent(id)}/approved`,
      {
        referenceId: args.referenceId,
        principal: args.principal,
        interest: args.interest,
        totalPayout: args.totalPayout,
        currency: args.currency || 'NGN',
        productType: args.productType
      },
      { headers: internalHeaders(), timeout: 30_000, validateStatus: () => true }
    );
    if (response.status >= 200 && response.status < 300 && response.data?.success !== false) {
      return { success: true };
    }
    return {
      success: false,
      error: response.data?.error || `Spring approve callback failed (${response.status})`
    };
  } catch (error) {
    logger.error('Spring maturity withdrawal approve callback failed', {
      localApplicationId: id,
      message: error instanceof Error ? error.message : String(error)
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Spring approve callback failed'
    };
  }
}

export async function notifySpringMaturityWithdrawalRejected(args: {
  localApplicationId: string;
  referenceId: string;
  reason?: string;
  productType?: string;
}): Promise<{ success: boolean; error?: string }> {
  const id = args.localApplicationId.trim();
  if (!id) return { success: false, error: 'springLocalApplicationId is required' };

  try {
    const response = await axios.post(
      `${springProductBaseUrl()}/api/v1/internal/maturity-withdrawals/${encodeURIComponent(id)}/rejected`,
      {
        referenceId: args.referenceId,
        reason: args.reason,
        productType: args.productType
      },
      { headers: internalHeaders(), timeout: 20_000, validateStatus: () => true }
    );
    if (response.status >= 200 && response.status < 300 && response.data?.success !== false) {
      return { success: true };
    }
    return {
      success: false,
      error: response.data?.error || `Spring reject callback failed (${response.status})`
    };
  } catch (error) {
    logger.error('Spring maturity withdrawal reject callback failed', {
      localApplicationId: id,
      message: error instanceof Error ? error.message : String(error)
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Spring reject callback failed'
    };
  }
}
