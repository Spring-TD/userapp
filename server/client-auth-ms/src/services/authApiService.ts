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

  private handleError(error: any): ApiResponse<any> {
    if (error.response?.data) {
      return error.response.data;
    }
    return {
      success: false,
      error: 'Failed to connect to authentication service',
      details: error.message
    };
  }

  private createAuthHeaders(token?: string) {
    const headers: any = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return { headers };
  }

  // ===== REGISTRATION ENDPOINTS =====
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
      return this.handleError(error);
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
      return this.handleError(error);
    }
  }

  // ===== AUTHENTICATION ENDPOINTS =====
  async verifyAccount(token: string): Promise<ApiResponse<any>> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await this.apiClient.post('/auth/verify-account', { token });
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async login(email: string, password: string): Promise<ApiResponse<any>> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await this.apiClient.post('/auth/login', { email, password });
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async logout(token: string): Promise<ApiResponse<any>> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await this.apiClient.post('/auth/logout', {}, this.createAuthHeaders(token));
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async refreshToken(refreshToken: string): Promise<ApiResponse<any>> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await this.apiClient.post('/auth/refresh', { refreshToken });
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async getMe(token: string): Promise<ApiResponse<any>> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await this.apiClient.get('/auth/me', this.createAuthHeaders(token));
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async verifyToken(token: string): Promise<ApiResponse<any>> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await this.apiClient.post('/auth/verify-token', {}, this.createAuthHeaders(token));
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async checkEmailExists(email: string): Promise<ApiResponse<any>> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await this.apiClient.get(`/auth/email-exists/${email}`);
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  // ===== OTP ENDPOINTS =====
  async generateOTP(identifier: string, channel: string, purpose: string): Promise<ApiResponse<any>> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await this.apiClient.post('/otp/generate', { identifier, channel, purpose });
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async verifyOTP(identifier: string, code: string): Promise<ApiResponse<any>> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await this.apiClient.post('/otp/verify', { identifier, code });
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async resendOTP(identifier: string, channel: string, purpose: string): Promise<ApiResponse<any>> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await this.apiClient.post('/otp/resend', { identifier, channel, purpose });
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  // ===== PASSWORD ENDPOINTS =====
  async forgotPassword(email: string): Promise<ApiResponse<any>> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await this.apiClient.post('/password/forgot', { email });
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async resetPassword(token: string, password: string): Promise<ApiResponse<any>> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await this.apiClient.post('/password/reset', { token, password });
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async changePassword(token: string, currentPassword: string, newPassword: string): Promise<ApiResponse<any>> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await this.apiClient.put('/password/change', { currentPassword, newPassword }, this.createAuthHeaders(token));
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  // ===== USER MANAGEMENT ENDPOINTS =====
  async getUserProfile(token: string): Promise<ApiResponse<any>> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await this.apiClient.get('/user/profile', this.createAuthHeaders(token));
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async updateUserProfile(token: string, profileData: any): Promise<ApiResponse<any>> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await this.apiClient.put('/user/profile', profileData, this.createAuthHeaders(token));
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async getUserInfo(token: string, userId: string): Promise<ApiResponse<any>> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await this.apiClient.get(`/user/info/${userId}`, this.createAuthHeaders(token));
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async verifyUserInfo(token: string, userId: string, verificationData: any): Promise<ApiResponse<any>> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await this.apiClient.post(`/user/verify-info/${userId}`, verificationData, this.createAuthHeaders(token));
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async suspendUser(token: string, userId: string, reason?: string): Promise<ApiResponse<any>> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await this.apiClient.put(`/user/suspend/${userId}`, { reason }, this.createAuthHeaders(token));
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async activateUser(token: string, userId: string): Promise<ApiResponse<any>> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await this.apiClient.put(`/user/activate/${userId}`, {}, this.createAuthHeaders(token));
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  // ===== UTILITY METHODS =====
  private generateMerchantId(firstName: string, lastName: string): string {
    const timestamp = Date.now().toString();
    const namePrefix = (firstName.substring(0, 2) + lastName.substring(0, 2)).toLowerCase();
    return `${namePrefix}_${timestamp.substring(-8)}`;
  }
}

export const authApiService = new AuthApiService();