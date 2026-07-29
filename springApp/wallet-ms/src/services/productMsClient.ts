import axios from 'axios';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

export const PRODUCT_MS_SETTLEMENT_SOURCE = 'product-ms-settlement';

export type LoanTransferChargeCollectParams = {
  merchantId: string;
  appId?: string;
  userId: string;
  amount: number;
  referenceId: string;
  source: string;
  category: 'LOAN_CHARGE' | 'MORTGAGE_CHARGE';
  applicationId: string;
  productId: string;
  productType: 'LOAN' | 'MORTGAGE';
  currency: string;
  description: string;
  metadata: Record<string, unknown>;
};

export type LoanTransferChargeContext = {
  skipped: boolean;
  skippedReason?: string;
  chargeAmount: number;
  collect?: LoanTransferChargeCollectParams;
};

export type LoanTransferChargeCollectionResult = {
  attempted: boolean;
  success: boolean;
  duplicate?: boolean;
  skipped?: boolean;
  skippedReason?: string;
  chargeAmount?: number;
  netToPrimary?: number;
  error?: string;
  transactionId?: string;
};

function internalToken(): string {
  return (config.walletInternalToken || config.jwtSecret || '').trim();
}

function normalizeProductBase(raw: string): string {
  return raw.trim().replace(/\/+$/g, '').replace(/\/api\/v1$/i, '');
}

export async function resolveLoanTransferCharge(input: {
  userId: string;
  applicationId: string;
}): Promise<LoanTransferChargeContext | { error: string } | null> {
  const base = normalizeProductBase(config.productServiceUrl);
  const token = internalToken();
  if (!base || !token) {
    return null;
  }

  const url = `${base}/api/v1/applications/internal/${encodeURIComponent(input.applicationId)}/resolve-loan-transfer-charge`;
  try {
    const response = await axios.post(
      url,
      { userId: input.userId },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': token
        },
        timeout: parseInt(process.env.PRODUCT_SERVICE_HTTP_TIMEOUT_MS || '30000', 10),
        validateStatus: () => true
      }
    );

    const body = response.data as {
      success?: boolean;
      error?: string;
      data?: LoanTransferChargeContext;
    };

    if (response.status >= 200 && response.status < 300 && body.success && body.data) {
      return body.data;
    }

    return {
      error: body.error || `Failed to resolve loan transfer charge (${response.status})`
    };
  } catch (error) {
    logger.error('Failed to resolve loan transfer charge', {
      error,
      applicationId: input.applicationId,
      userId: input.userId
    });
    return { error: 'Failed to contact product-ms for loan charge resolution' };
  }
}
