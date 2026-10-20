import axios from 'axios';
import { config } from '../config/environment';

export type MerchantOwnerProfile = {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
};

export async function resolveMerchantOwner(
  merchantId: string
): Promise<MerchantOwnerProfile | undefined> {
  const id = merchantId.trim();
  const base = config.clientAuthUrl.replace(/\/+$/, '');
  const token = config.clientAuthInternalToken;
  if (!id || !base || !token) {
    return undefined;
  }

  const url = `${base}/api/v1/user/internal/merchant-owner/${encodeURIComponent(id)}`;
  try {
    const response = await axios.get(url, {
      headers: { 'X-Internal-Token': token },
      timeout: 12000,
      validateStatus: () => true
    });
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
    console.warn('[product-ms] Merchant owner lookup failed', {
      merchantId: id,
      message: error instanceof Error ? error.message : String(error)
    });
  }
  return undefined;
}
