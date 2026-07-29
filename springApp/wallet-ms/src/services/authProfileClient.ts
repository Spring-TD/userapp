import axios from 'axios';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

type InternalAuthProfile = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
};

type MerchantOwner = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
};

function internalToken(): string {
  return (config.clientAuthInternalToken || config.jwtSecret || '').trim();
}

function internalHeaders(): Record<string, string> {
  return { 'X-Internal-Token': internalToken() };
}

export async function fetchRetailUserProfile(userId: string): Promise<InternalAuthProfile | undefined> {
  const base = config.authServiceUrl.trim();
  const token = internalToken();
  if (!base || !token || !userId.trim()) return undefined;

  try {
    const res = await axios.get<{ success?: boolean; data?: InternalAuthProfile }>(
      `${base}/api/v1/user/internal/profile/${encodeURIComponent(userId.trim())}`,
      { headers: internalHeaders(), timeout: 10_000, validateStatus: () => true }
    );
    if (res.status >= 200 && res.status < 300 && res.data?.success && res.data.data) {
      return res.data.data;
    }
  } catch (error) {
    logger.warn('Retail user profile lookup failed', {
      userId,
      message: error instanceof Error ? error.message : String(error)
    });
  }
  return undefined;
}

export async function fetchMerchantOwner(merchantId: string): Promise<MerchantOwner | undefined> {
  const base = config.authServiceUrl.trim();
  const token = internalToken();
  if (!base || !token || !merchantId.trim()) return undefined;

  try {
    const res = await axios.get<{ success?: boolean; data?: MerchantOwner }>(
      `${base}/api/v1/user/internal/merchant-owner/${encodeURIComponent(merchantId.trim())}`,
      { headers: internalHeaders(), timeout: 10_000, validateStatus: () => true }
    );
    if (res.status >= 200 && res.status < 300 && res.data?.success && res.data.data) {
      return res.data.data;
    }
  } catch (error) {
    logger.warn('Merchant owner lookup failed', {
      merchantId,
      message: error instanceof Error ? error.message : String(error)
    });
  }
  return undefined;
}

export function formatPersonName(firstName?: string, lastName?: string, fallback?: string): string {
  const full = `${firstName || ''} ${lastName || ''}`.trim();
  return full || fallback?.trim() || 'Customer';
}
