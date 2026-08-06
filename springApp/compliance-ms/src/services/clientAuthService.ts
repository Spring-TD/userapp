import axios from 'axios';
import { logger } from '../utils/logger';

type AxiosInstance = ReturnType<typeof axios.create>;

export interface ClientAuthUserProfile {
  email?: string;
  phone?: string;
  country?: string;
  user_ref?: string;
  user_merchant_id?: string;
}

interface ClientAuthProfileResponse {
  success?: boolean;
  data?: {
    user?: ClientAuthUserProfile;
  };
}

interface MerchantOwnerResponse {
  success?: boolean;
  data?: {
    userId?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  };
  error?: string;
}

function stripSurroundingQuotes(s: string): string {
  const t = s.trim();
  if (t.length >= 2) {
    const a = t[0];
    const b = t[t.length - 1];
    if ((a === '"' && b === '"') || (a === "'" && b === "'")) {
      return t.slice(1, -1).trim();
    }
  }
  return t;
}

function resolveInternalToken(): string {
  return (
    stripSurroundingQuotes(process.env.CLIENT_AUTH_INTERNAL_TOKEN || '') ||
    stripSurroundingQuotes(process.env.JWT_SECRET || '')
  );
}

export class ClientAuthService {
  private readonly axiosInstance: AxiosInstance;
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.CLIENT_AUTH_BASE_URL || 'http://localhost:3001/api/v1';
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async getCurrentUserProfile(token?: string): Promise<{
    success: boolean;
    data?: ClientAuthUserProfile;
    error?: string;
  }> {
    try {
      if (!token) {
        return { success: false, error: 'Missing bearer token for client-auth profile lookup' };
      }

      const response = await this.axiosInstance.get<ClientAuthProfileResponse>(
        '/user/profile',
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const user = response.data?.data?.user;
      if (!user) {
        return { success: false, error: 'client-auth-ms returned no user profile data' };
      }

      return { success: true, data: user };
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || 'Failed to fetch profile from client-auth-ms';
      logger.warn('client-auth profile lookup failed', {
        error: message,
        baseUrl: this.baseUrl
      });
      return { success: false, error: message };
    }
  }

  /**
   * Resolve tenant merchantId → owner userId (KYC business_infos are keyed by owner userId).
   */
  async getMerchantOwnerUserId(merchantId: string): Promise<{
    success: boolean;
    userId?: string;
    error?: string;
  }> {
    const mid = String(merchantId || '').trim();
    if (!mid) {
      return { success: false, error: 'merchantId is required' };
    }

    const token = resolveInternalToken();
    if (!token) {
      return {
        success: false,
        error: 'client-auth internal lookup is not configured (CLIENT_AUTH_INTERNAL_TOKEN or JWT_SECRET)'
      };
    }

    try {
      const response = await this.axiosInstance.get<MerchantOwnerResponse>(
        `/user/internal/merchant-owner/${encodeURIComponent(mid)}`,
        {
          headers: { 'X-Internal-Token': token },
          validateStatus: () => true
        }
      );

      if (response.status >= 200 && response.status < 300 && response.data?.success) {
        const userId = response.data.data?.userId?.trim();
        if (userId) {
          return { success: true, userId };
        }
      }

      const error =
        response.data?.error ||
        (response.status === 404 ? 'Merchant owner not found' : `client-auth returned ${response.status}`);
      return { success: false, error };
    } catch (error: any) {
      const message =
        error?.response?.data?.error || error?.message || 'Failed to resolve merchant owner from client-auth-ms';
      logger.warn('client-auth merchant owner lookup failed', {
        merchantId: mid,
        error: message,
        baseUrl: this.baseUrl
      });
      return { success: false, error: message };
    }
  }
}

export const clientAuthService = new ClientAuthService();
