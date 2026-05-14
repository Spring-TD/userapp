// src/services/premblyService.ts
import axios from 'axios';
import { logger } from '../utils/logger';
import { auditLogger } from '../utils/audit';

// Prembly API Configuration
interface PremblyConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  appId: string;
}

/** Normalized result from IdentityPass (form-encoded) verification calls */
export interface IdentityPassVerificationResult {
  ok: boolean;
  message?: string;
  reference?: string;
  premlyStatus?: string;
  redirectUrl?: string;
  raw?: unknown;
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
    const appId = process.env.PREMBLY_APP_ID || '';

    this.config = {
      apiKey,
      apiSecret,
      baseUrl,
      appId
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
   * IdentityPass uses different headers (`x-api-key` + `app-id`) and often `application/x-www-form-urlencoded`.
   */
  isIdentityPassConfigured(): boolean {
    const secret = this.config.apiSecret || this.config.apiKey;
    return !!(this.config.appId && secret);
  }

  private parseIdentityPassBody(data: Record<string, unknown> | undefined | null): {
    reference?: string;
    premlyStatus?: string;
    redirectUrl?: string;
    topLevelOk?: boolean;
    responseCode?: string;
    message?: string;
  } {
    if (!data || typeof data !== 'object') {
      return {};
    }
    const d = data as Record<string, unknown>;
    const verification = (d.verification as Record<string, unknown> | undefined) ?? undefined;
    const nestedData = (d.data as Record<string, unknown> | undefined) ?? undefined;
    const resultData = (d.result as Record<string, unknown> | undefined) ?? undefined;
    const v =
      verification ??
      (nestedData?.verification as Record<string, unknown> | undefined) ??
      (resultData?.verification as Record<string, unknown> | undefined);
    const reference =
      (v?.reference as string | undefined) ??
      (v?.id as string | undefined) ??
      (d.reference as string | undefined) ??
      (nestedData?.reference as string | undefined) ??
      (resultData?.reference as string | undefined) ??
      (nestedData?.id as string | undefined) ??
      (resultData?.id as string | undefined);
    const premlyStatus =
      (v?.status as string | undefined) ??
      (d.status as string | undefined) ??
      (nestedData?.status as string | undefined) ??
      (resultData?.status as string | undefined);
    const redirectUrl =
      (v?.url as string | undefined) ??
      (v?.redirect_url as string | undefined) ??
      (v?.redirectUrl as string | undefined) ??
      (v?.verification_url as string | undefined) ??
      (d.url as string | undefined) ??
      (d.verification_url as string | undefined) ??
      (d.redirect_url as string | undefined) ??
      (nestedData?.url as string | undefined) ??
      (nestedData?.verification_url as string | undefined) ??
      (nestedData?.redirect_url as string | undefined) ??
      (resultData?.url as string | undefined) ??
      (resultData?.verification_url as string | undefined) ??
      (resultData?.redirect_url as string | undefined);
    const responseCode = d.response_code != null ? String(d.response_code) : undefined;
    const message = typeof d.message === 'string' ? d.message : undefined;
    const topLevelOk = d.status === true;
    return { reference, premlyStatus, redirectUrl, topLevelOk, responseCode, message };
  }

  /**
   * POST IdentityPass path with form body (Prembly docs: `number` for BVN, etc.)
   */
  async postIdentityPassForm(
    path: string,
    fields: Record<string, string>
  ): Promise<IdentityPassVerificationResult> {
    const secret = this.config.apiSecret || this.config.apiKey;
    if (!this.config.appId || !secret) {
      return {
        ok: false,
        message: 'Prembly IdentityPass not configured: set PREMBLY_APP_ID and PREMBLY_API_SECRET (secret key for x-api-key)'
      };
    }

    const url = `${this.config.baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
    const body = new URLSearchParams();
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined && v !== null && String(v).length > 0) {
        body.append(k, String(v));
      }
    }

    try {
      auditLogger('PREMBLY_IDENTITYPASS_REQUEST', 'system', { path, keys: Object.keys(fields) });

      const response = await axios.post(url, body.toString(), {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'x-api-key': secret,
          'app-id': this.config.appId
        },
        validateStatus: () => true
      });

      const payload = response.data as Record<string, unknown>;
      const parsed = this.parseIdentityPassBody(payload);
      const explicitFail = payload.status === false;
      const codeOk = parsed.responseCode === '00' || parsed.responseCode === '0';
      const statusStr = (parsed.premlyStatus || '').toString().toLowerCase();
      const statusNegative = ['failed', 'fail', 'rejected', 'error'].includes(statusStr);
      const statusPositive = ['success', 'verified', 'completed', 'pending', 'processing'].includes(statusStr);
      const ok =
        !explicitFail &&
        !statusNegative &&
        response.status >= 200 &&
        response.status < 300 &&
        (parsed.topLevelOk === true || codeOk || statusPositive);

      auditLogger('PREMBLY_IDENTITYPASS_RESPONSE', 'system', {
        path,
        httpStatus: response.status,
        reference: parsed.reference,
        premlyStatus: parsed.premlyStatus,
        redirectUrl: parsed.redirectUrl,
        raw: payload
      });

      if (!ok) {
        const msg =
          parsed.message ||
          (typeof payload?.detail === 'string' ? payload.detail : undefined) ||
          `IdentityPass request failed (HTTP ${response.status})`;
        return {
          ok: false,
          message: msg,
          reference: parsed.reference,
          premlyStatus: parsed.premlyStatus,
          redirectUrl: parsed.redirectUrl,
          raw: payload
        };
      }

      return {
        ok: true,
        message: parsed.message,
        reference: parsed.reference,
        premlyStatus: parsed.premlyStatus,
        redirectUrl: parsed.redirectUrl,
        raw: payload
      };
    } catch (error: unknown) {
      const err = error as { message?: string; response?: { data?: unknown; status?: number } };
      logger.error('Prembly IdentityPass Error', {
        path,
        error: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
      return {
        ok: false,
        message: err.response?.data
          ? JSON.stringify(err.response.data)
          : err.message || 'IdentityPass request failed',
        raw: err.response?.data
      };
    }
  }

  /** BVN via IdentityPass: `POST /identitypass/verification/bvn` */
  async identityPassVerifyBvn(bvn: string): Promise<IdentityPassVerificationResult> {
    const digits = String(bvn).replace(/\D/g, '');
    if (digits.length !== 11) {
      return { ok: false, message: 'BVN must be 11 digits' };
    }
    return this.postIdentityPassForm('/identitypass/verification/bvn', { number: digits });
  }

  /** Bank account via IdentityPass: `POST /identitypass/verification/bank_account` */
  async identityPassVerifyBankAccount(
    accountNumber: string,
    bankCode: string
  ): Promise<IdentityPassVerificationResult> {
    const num = String(accountNumber).trim();
    const code = String(bankCode).replace(/\D/g, '');
    if (!num) {
      return { ok: false, message: 'Bank account number is required' };
    }
    if (!code) {
      return { ok: false, message: 'bank_code is required for IdentityPass bank account verification' };
    }
    return this.postIdentityPassForm('/identitypass/verification/bank_account', {
      number: num,
      bank_code: code
    });
  }

  /**
   * Document (e.g. UBO / bank statement URL in Spaces) via `POST /identitypass/verification/document`.
   * Prembly may expect base64 for some products; public HTTPS URLs are passed as `doc_image` when supported.
   */
  async identityPassVerifyDocument(
    documentImageOrUrl: string,
    extra?: Record<string, string>
  ): Promise<IdentityPassVerificationResult> {
    const doc = String(documentImageOrUrl).trim();
    if (!doc) {
      return { ok: false, message: 'Document image or URL is required' };
    }
    const fields: Record<string, string> = {
      doc_image: doc,
      ...(extra || {})
    };
    return this.postIdentityPassForm('/identitypass/verification/document', fields);
  }

  /** Mock IdentityPass when Prembly IdentityPass env is not set (local/tests). */
  mockIdentityPassResult(kind: 'bvn' | 'bank_account' | 'document'): IdentityPassVerificationResult {
    const reference = `mock_identitypass_${kind}_${Date.now()}`;
    return {
      ok: true,
      reference,
      premlyStatus: 'pending',
      redirectUrl: `https://mock-identitypass.example/verify/${reference}`,
      message: 'Mock IdentityPass (configure PREMBLY_APP_ID and PREMBLY_API_SECRET)'
    };
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
