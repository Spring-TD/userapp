import axios from 'axios';
import { config } from '../config/environment';

type AxiosInstance = ReturnType<typeof axios.create>;

interface CreateFuspayUserRequest {
  email: string;
  phone: string;
  country: string;
  userRef: string;
}

interface CreateFuspayUserResponse {
  customer_id?: string;
  user_ref?: string;
  message?: string;
  data?: {
    id?: string;
    customer_id?: string;
    user_ref?: string;
    email?: string;
    phone?: string;
    created_at?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

class FuspayModularService {
  private readonly axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: config.fuspayModularBaseUrl,
      timeout: 20000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  isEnabled(): boolean {
    return config.fuspayModularEnabled;
  }

  isConfigured(): boolean {
    return Boolean(config.fuspayModularAppId);
  }

  private authHeaders(): Record<string, string> {
    if (!config.fuspayModularApiKey) return {};
    return { Authorization: `Bearer ${config.fuspayModularApiKey}` };
  }

  private assertFuspayCountry(country: string): { ok: true; code: string } | { ok: false; error: string } {
    const code = country.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) {
      return { ok: false, error: 'Fuspay country must be a valid ISO 3166-1 alpha-2 code' };
    }
    const allowed = new Set(config.fuspayModularAllowedCountryCodes);
    if (!allowed.has(code)) {
      return {
        ok: false,
        error: `Country must be one of: ${[...allowed].sort().join(', ')}`
      };
    }
    return { ok: true, code };
  }

  async createUser(request: CreateFuspayUserRequest): Promise<{
    success: boolean;
    data?: CreateFuspayUserResponse;
    error?: string;
  }> {
    try {
      if (!this.isEnabled()) {
        return { success: true };
      }
      if (!this.isConfigured()) {
        return { success: false, error: 'Fuspay modular is enabled but FUSPAY_MODULAR_APP_ID is not configured' };
      }

      const countryCheck = this.assertFuspayCountry(request.country);
      if (!countryCheck.ok) {
        return { success: false, error: countryCheck.error };
      }

      const response = await this.axiosInstance.post<CreateFuspayUserResponse>(
        '/api/v1/modular/user/',
        {
          email: request.email,
          phone: request.phone,
          app: config.fuspayModularAppId,
          country: countryCheck.code,
          user_ref: request.userRef
        },
        { headers: this.authHeaders() }
      );

      const normalizedCustomerId =
        response.data?.customer_id ||
        response.data?.data?.id ||
        response.data?.data?.customer_id;
      const normalizedUserRef =
        response.data?.user_ref ||
        response.data?.data?.user_ref ||
        request.userRef;

      return {
        success: true,
        data: {
          ...response.data,
          ...(normalizedCustomerId ? { customer_id: normalizedCustomerId } : {}),
          ...(normalizedUserRef ? { user_ref: normalizedUserRef } : {})
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.response?.data?.message || error?.message || 'Failed to create Fuspay modular user'
      };
    }
  }
}

export const fuspayModularService = new FuspayModularService();
