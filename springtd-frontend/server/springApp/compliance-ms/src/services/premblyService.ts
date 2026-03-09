// src/services/premblyService.ts
import axios from 'axios';
import { logger } from '../utils/logger';
import { auditLogger } from '../utils/audit';

// Prembly API Configuration
interface PremblyConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
}

// Prembly API Response Interfaces
export interface PremblyKYCResponse {
  status: boolean;
  message: string;
  data?: {
    verificationId: string;
    status: 'verified' | 'failed' | 'pending';
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    documentNumber?: string;
    documentType?: string;
    verificationScore?: number;
    details?: any;
  };
}

export interface PremblyAMLResponse {
  status: boolean;
  message: string;
  data?: {
    verificationId: string;
    kybVerified: boolean;
    amlClear: boolean;
    peps: boolean;
    sanctions: boolean;
    adverseMedia: boolean;
    riskScore: number;
    details?: any;
  };
}

export interface PremblyCACResponse {
  status: boolean;
  message: string;
  data?: {
    verificationId: string;
    companyName: string;
    registrationNumber: string;
    registrationDate: string;
    status: string;
    address?: string;
    directors?: Array<{
      name: string;
      position: string;
    }>;
    verified: boolean;
  };
}

export interface PremblySanctionsResponse {
  status: boolean;
  message: string;
  data?: {
    verificationId: string;
    flagged: boolean;
    matches: Array<{
      id: string;
      name: string;
      type: string;
      country?: string;
      reason?: string;
    }>;
  };
}

export interface PremblyLivenessResponse {
  status: boolean;
  message: string;
  data?: {
    verificationId: string;
    url: string;
    expiresAt: string;
    status: 'pending' | 'completed' | 'failed';
    score?: number;
    details?: string;
  };
}

export interface PremblyLivenessResultResponse {
  status: boolean;
  message: string;
  data?: {
    verificationId: string;
    success: boolean;
    score: number;
    details: string;
    completedAt: string;
  };
}

// Individual KYC Request
export interface PremblyIndividualKYCRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  documentType: 'nin' | 'passport' | 'drivers_license' | 'voters_card';
  documentNumber: string;
  documentImage?: string; // Base64 encoded image
  phoneNumber?: string;
  email?: string;
}

// Business KYC Request
export interface PremblyBusinessKYCRequest {
  companyName: string;
  registrationNumber: string;
  country?: string;
  documentImage?: string; // Base64 encoded image
}

// CAC Verification Request
export interface PremblyCACRequest {
  registrationNumber: string;
  companyName: string;
}

// Sanctions Check Request
export interface PremblySanctionsRequest {
  name: string;
  companyId?: string;
  country?: string;
  dateOfBirth?: string;
}

// Liveness Test Request
export interface PremblyLivenessRequest {
  userId: string;
  callbackUrl?: string;
}

/**
 * Prembly Service - Unified service for all Prembly API integrations
 * Handles KYC, AML, CAC, Sanctions, and Liveness verification
 */
export class PremblyService {
  private axiosInstance: ReturnType<typeof axios.create>;
  private config: PremblyConfig;

  constructor() {
    const apiKey = process.env.PREMBLY_API_KEY || '';
    const apiSecret = process.env.PREMBLY_API_SECRET || '';
    const baseUrl = process.env.PREMBLY_BASE_URL || 'https://api.prembly.com';

    this.config = {
      apiKey,
      apiSecret,
      baseUrl
    };

    // Create axios instance with default config
    this.axiosInstance = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'X-API-Secret': apiSecret
      }
    });

    // Add request interceptor for logging
    this.axiosInstance.interceptors.request.use(
      (config: any) => {
        logger.info('Prembly API Request', {
          method: config.method,
          url: config.url,
          baseURL: config.baseURL
        });
        return config;
      },
      (error: any) => {
        logger.error('Prembly API Request Error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.axiosInstance.interceptors.response.use(
      (response: any) => {
        logger.info('Prembly API Response', {
          status: response.status,
          url: response.config.url
        });
        return response;
      },
      (error: any) => {
        logger.error('Prembly API Response Error', {
          status: error.response?.status,
          message: error.message,
          data: error.response?.data
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Verify if Prembly API is configured
   */
  isConfigured(): boolean {
    return !!(this.config.apiKey && this.config.apiSecret);
  }

  /**
   * Individual KYC Verification
   */
  async verifyIndividualKYC(request: PremblyIndividualKYCRequest): Promise<PremblyKYCResponse> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Prembly API not configured. Please set PREMBLY_API_KEY and PREMBLY_API_SECRET');
      }

      auditLogger('PREMBLY_KYC_REQUEST', 'system', { request });

      const response = await this.axiosInstance.post<PremblyKYCResponse>(
        '/identity/kyc/individual',
        request
      );

      auditLogger('PREMBLY_KYC_RESPONSE', 'system', { 
        verificationId: response.data.data?.verificationId,
        status: response.data.data?.status
      });

      return response.data;
    } catch (error: any) {
      logger.error('Prembly Individual KYC Verification Error', {
        error: error.message,
        request
      });

      return {
        status: false,
        message: error.response?.data?.message || error.message || 'KYC verification failed',
        data: undefined
      };
    }
  }

  /**
   * Business KYC Verification
   */
  async verifyBusinessKYC(request: PremblyBusinessKYCRequest): Promise<PremblyKYCResponse> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Prembly API not configured. Please set PREMBLY_API_KEY and PREMBLY_API_SECRET');
      }

      auditLogger('PREMBLY_BUSINESS_KYC_REQUEST', 'system', { request });

      const response = await this.axiosInstance.post<PremblyKYCResponse>(
        '/identity/kyc/business',
        request
      );

      auditLogger('PREMBLY_BUSINESS_KYC_RESPONSE', 'system', {
        verificationId: response.data.data?.verificationId,
        status: response.data.data?.status
      });

      return response.data;
    } catch (error: any) {
      logger.error('Prembly Business KYC Verification Error', {
        error: error.message,
        request
      });

      return {
        status: false,
        message: error.response?.data?.message || error.message || 'Business KYC verification failed',
        data: undefined
      };
    }
  }

  /**
   * AML Document Verification
   */
  async verifyAML(request: PremblyBusinessKYCRequest): Promise<PremblyAMLResponse> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Prembly API not configured. Please set PREMBLY_API_KEY and PREMBLY_API_SECRET');
      }

      auditLogger('PREMBLY_AML_REQUEST', 'system', { request });

      const response = await this.axiosInstance.post<PremblyAMLResponse>(
        '/compliance/aml/verify',
        request
      );

      auditLogger('PREMBLY_AML_RESPONSE', 'system', {
        verificationId: response.data.data?.verificationId,
        kybVerified: response.data.data?.kybVerified,
        amlClear: response.data.data?.amlClear
      });

      return response.data;
    } catch (error: any) {
      logger.error('Prembly AML Verification Error', {
        error: error.message,
        request
      });

      return {
        status: false,
        message: error.response?.data?.message || error.message || 'AML verification failed',
        data: undefined
      };
    }
  }

  /**
   * CAC Certificate Verification
   */
  async verifyCAC(request: PremblyCACRequest): Promise<PremblyCACResponse> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Prembly API not configured. Please set PREMBLY_API_KEY and PREMBLY_API_SECRET');
      }

      auditLogger('PREMBLY_CAC_REQUEST', 'system', { request });

      const response = await this.axiosInstance.post<PremblyCACResponse>(
        '/compliance/cac/verify',
        request
      );

      auditLogger('PREMBLY_CAC_RESPONSE', 'system', {
        verificationId: response.data.data?.verificationId,
        verified: response.data.data?.verified
      });

      return response.data;
    } catch (error: any) {
      logger.error('Prembly CAC Verification Error', {
        error: error.message,
        request
      });

      return {
        status: false,
        message: error.response?.data?.message || error.message || 'CAC verification failed',
        data: undefined
      };
    }
  }

  /**
   * Sanctions List Check
   */
  async checkSanctions(request: PremblySanctionsRequest): Promise<PremblySanctionsResponse> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Prembly API not configured. Please set PREMBLY_API_KEY and PREMBLY_API_SECRET');
      }

      auditLogger('PREMBLY_SANCTIONS_REQUEST', 'system', { request });

      const response = await this.axiosInstance.post<PremblySanctionsResponse>(
        '/compliance/sanctions/check',
        request
      );

      auditLogger('PREMBLY_SANCTIONS_RESPONSE', 'system', {
        verificationId: response.data.data?.verificationId,
        flagged: response.data.data?.flagged
      });

      return response.data;
    } catch (error: any) {
      logger.error('Prembly Sanctions Check Error', {
        error: error.message,
        request
      });

      return {
        status: false,
        message: error.response?.data?.message || error.message || 'Sanctions check failed',
        data: undefined
      };
    }
  }

  /**
   * Generate Liveness Test URL
   */
  async generateLivenessTest(request: PremblyLivenessRequest): Promise<PremblyLivenessResponse> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Prembly API not configured. Please set PREMBLY_API_KEY and PREMBLY_API_SECRET');
      }

      auditLogger('PREMBLY_LIVENESS_REQUEST', 'system', { request });

      const response = await this.axiosInstance.post<PremblyLivenessResponse>(
        '/identity/liveness/generate',
        request
      );

      auditLogger('PREMBLY_LIVENESS_RESPONSE', 'system', {
        verificationId: response.data.data?.verificationId,
        url: response.data.data?.url
      });

      return response.data;
    } catch (error: any) {
      logger.error('Prembly Liveness Test Generation Error', {
        error: error.message,
        request
      });

      return {
        status: false,
        message: error.response?.data?.message || error.message || 'Liveness test generation failed',
        data: undefined
      };
    }
  }

  /**
   * Get Liveness Test Result
   */
  async getLivenessResult(verificationId: string): Promise<PremblyLivenessResultResponse> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Prembly API not configured. Please set PREMBLY_API_KEY and PREMBLY_API_SECRET');
      }

      auditLogger('PREMBLY_LIVENESS_RESULT_REQUEST', 'system', { verificationId });

      const response = await this.axiosInstance.get<PremblyLivenessResultResponse>(
        `/identity/liveness/result/${verificationId}`
      );

      auditLogger('PREMBLY_LIVENESS_RESULT_RESPONSE', 'system', {
        verificationId: response.data.data?.verificationId,
        success: response.data.data?.success
      });

      return response.data;
    } catch (error: any) {
      logger.error('Prembly Liveness Result Error', {
        error: error.message,
        verificationId
      });

      return {
        status: false,
        message: error.response?.data?.message || error.message || 'Failed to get liveness result',
        data: undefined
      };
    }
  }

  /**
   * Verify NIN (National Identification Number)
   */
  async verifyNIN(nin: string, firstName?: string, lastName?: string): Promise<PremblyKYCResponse> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Prembly API not configured. Please set PREMBLY_API_KEY and PREMBLY_API_SECRET');
      }

      const request: PremblyIndividualKYCRequest = {
        firstName: firstName || '',
        lastName: lastName || '',
        dateOfBirth: '',
        documentType: 'nin',
        documentNumber: nin
      };

      return this.verifyIndividualKYC(request);
    } catch (error: any) {
      logger.error('Prembly NIN Verification Error', {
        error: error.message,
        nin
      });

      return {
        status: false,
        message: error.message || 'NIN verification failed',
        data: undefined
      };
    }
  }

  /**
   * Verify BVN (Bank Verification Number)
   */
  async verifyBVN(bvn: string, firstName?: string, lastName?: string): Promise<PremblyKYCResponse> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Prembly API not configured. Please set PREMBLY_API_KEY and PREMBLY_API_SECRET');
      }

      auditLogger('PREMBLY_BVN_REQUEST', 'system', { bvn });

      const response = await this.axiosInstance.post<PremblyKYCResponse>(
        '/identity/bvn/verify',
        {
          bvn,
          firstName,
          lastName
        }
      );

      auditLogger('PREMBLY_BVN_RESPONSE', 'system', {
        verificationId: response.data.data?.verificationId,
        status: response.data.data?.status
      });

      return response.data;
    } catch (error: any) {
      logger.error('Prembly BVN Verification Error', {
        error: error.message,
        bvn
      });

      return {
        status: false,
        message: error.response?.data?.message || error.message || 'BVN verification failed',
        data: undefined
      };
    }
  }
}

// Export singleton instance
export const premblyService = new PremblyService();
