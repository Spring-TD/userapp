import axios from 'axios';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

export type MerchantOwnerProfile = {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
};

type ClientAuthMerchantOwnerResponse = {
  success?: boolean;
  data?: {
    userId?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  };
};

export async function fetchMerchantOwner(merchantId: string): Promise<MerchantOwnerProfile | undefined> {
  const id = merchantId.trim();
  const base = config.authServiceUrl.replace(/\/+$/, '');
  const token = (config.jwtSecret || '').trim();
  if (!id || !base || !token) return undefined;

  try {
    const response = await axios.get<ClientAuthMerchantOwnerResponse>(
      `${base}/api/v1/user/internal/merchant-owner/${encodeURIComponent(id)}`,
      {
        headers: { 'X-Internal-Token': token },
        timeout: 12_000,
        validateStatus: () => true
      }
    );

    if (response.status >= 200 && response.status < 300 && response.data?.success === true) {
      const owner = response.data.data;
      const userId = owner?.userId?.trim();
      const email = owner?.email?.trim();
      if (userId && email) {
        return {
          userId,
          email,
          ...(owner?.firstName ? { firstName: owner.firstName } : {}),
          ...(owner?.lastName ? { lastName: owner.lastName } : {})
        };
      }
    }
  } catch (error) {
    logger.warn('Merchant owner lookup failed', {
      merchantId: id,
      message: error instanceof Error ? error.message : String(error)
    });
  }

  return undefined;
}
