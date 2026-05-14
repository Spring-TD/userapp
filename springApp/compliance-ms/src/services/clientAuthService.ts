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
}

export const clientAuthService = new ClientAuthService();
