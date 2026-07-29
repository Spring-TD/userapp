import axios from 'axios';
import { logger } from '../utils/logger';

const GUARANTOR_USER_REF_PATTERN = /^guarantor_([a-f0-9]{24})_([a-f0-9-]+)$/i;

function productServiceBaseUrl(): string | undefined {
  const url = (process.env.PRODUCT_SERVICE_URL || process.env.PRODUCT_MS_URL || '').trim();
  return url ? url.replace(/\/+$/, '') : undefined;
}

function internalToken(): string | undefined {
  const token = (process.env.COMPLIANCE_WALLET_INTERNAL_TOKEN || '').trim();
  return token || undefined;
}

export function parseGuarantorUserRef(userRef: string | undefined): { applicationId: string; guarantorId: string } | null {
  if (!userRef?.trim()) {
    return null;
  }
  const match = userRef.trim().match(GUARANTOR_USER_REF_PATTERN);
  if (!match) {
    return null;
  }
  return { applicationId: match[1], guarantorId: match[2] };
}

/**
 * Notify springApp product-ms when a Fuspay modular guarantor verification completes.
 * Plata/Backend-platter Prembly guarantor KYC uses a direct browser callback to product-ms instead.
 */
export async function notifyProductMsGuarantorKycCompleted(
  applicationId: string,
  guarantorId: string
): Promise<void> {
  const base = productServiceBaseUrl();
  const token = internalToken();
  if (!base || !token) {
    logger.warn(
      'Skipping guarantor KYC completion notify to product-ms: PRODUCT_SERVICE_URL or COMPLIANCE_WALLET_INTERNAL_TOKEN not set'
    );
    return;
  }

  try {
    const response = await axios.post(
      `${base}/api/v1/applications/internal/guarantor-kyc-completed`,
      { applicationId, guarantorId, status: 'approved' },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': token
        },
        timeout: 12000,
        validateStatus: () => true
      }
    );
    if (response.status < 200 || response.status >= 300) {
      logger.warn('product-ms guarantor KYC completion notify returned non-success', {
        applicationId,
        guarantorId,
        status: response.status,
        body: response.data
      });
    }
  } catch (error) {
    logger.warn('Failed to notify product-ms of guarantor KYC completion', {
      applicationId,
      guarantorId,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
