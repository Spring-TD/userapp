import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { config } from '../config/environment';
import { MerchantRegistrationForm, UserRegistrationForm, ApiResponse } from '../types/forms';

class AuthApiService {
  private apiClient: AxiosInstance;

  constructor() {
    this.apiClient = axios.create({
      baseURL: `${config.serviceAuthUrl}/api/v1`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.apiClient.interceptors.request.use(
      (config) => {
        console.log(`Making request to: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    this.apiClient.interceptors.response.use(
      (response) => {
        console.log(`Response from ${response.config.url}: ${response.status}`);
        return response;
      },
      (error) => {
        console.error('Response interceptor error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  async registerMerchant(formData: MerchantRegistrationForm): Promise<ApiResponse<any>> {
    try {
      const payload = {
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        user_merchant_id: this.generateMerchantId(formData.first_name, formData.last_name),
        country: formData.country
      };

      const response: AxiosResponse<ApiResponse<any>> = await this.apiClient.post('/auth/register/merchant', payload);
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      return {
        success: false,
        error: 'Failed to connect to authentication service',
        details: error.message
      };
    }
  }

  async registerUser(formData: UserRegistrationForm): Promise<ApiResponse<any>> {
    try {
      const payload = {
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        user_merchant_id: formData.user_merchant_id,
        country: formData.country
      };

      const response: AxiosResponse<ApiResponse<any>> = await this.apiClient.post('/auth/register/user', payload);
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      return {
        success: false,
        error: 'Failed to connect to authentication service',
        details: error.message
      };
    }
  }

  private generateMerchantId(firstName: string, lastName: string): string {
    const timestamp = Date.now().toString();
    const namePrefix = (firstName.substring(0, 2) + lastName.substring(0, 2)).toLowerCase();
    return `${namePrefix}_${timestamp.substring(-8)}`;
  }
}

export const authApiService = new AuthApiService();