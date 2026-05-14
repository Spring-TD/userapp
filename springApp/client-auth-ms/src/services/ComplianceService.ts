import axios from 'axios';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';

type AxiosInstance = ReturnType<typeof axios.create>;

class ComplianceService {
  private readonly axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: config.complianceServiceUrl,
      timeout: 20000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  private serviceToken(): string {
    return jwt.sign(
      {
        type: 'service',
        serviceId: 'client-auth-ms',
        serviceName: 'client-auth-ms',
        permissions: ['read', 'write']
      },
      config.jwt.secret,
      { expiresIn: '5m' }
    );
  }

  async createMinimalProfile(request: {
    userId: string;
    userType: 'individual' | 'merchant' | 'admin';
    fuspay?: {
      customerId?: string;
      userRef?: string;
      appId?: string;
      country?: string;
      email?: string;
      phone?: string;
    };
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.axiosInstance.post(
        `/api/v1/kyc/profile/${encodeURIComponent(request.userId)}`,
        {
          userType: request.userType,
          ...(request.fuspay ? { fuspay: request.fuspay } : {})
        },
        {
          headers: {
            Authorization: `Bearer ${this.serviceToken()}`
          }
        }
      );

      const payload = response.data as { success?: boolean; error?: string };
      if (!payload?.success) {
        return { success: false, error: payload?.error || 'Failed to create compliance profile' };
      }
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error?.response?.data?.error || error?.message || 'Failed to create compliance profile'
      };
    }
  }
}

export const complianceService = new ComplianceService();
