import axios from 'axios';
import { logger } from '../utils/logger';
import { auditLogger } from '../utils/audit';

type AxiosInstance = ReturnType<typeof axios.create>;

export interface FuspayCreateUserRequest {
  email: string;
  phone: string;
  country: string;
  userRef: string;
}

interface FuspayCreateUserPayload {
  email: string;
  phone: string;
  app: string;
  country: string;
  user_ref: string;
}

export interface FuspayCreateUserResponse {
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

/** Payload for Payonus/Fuspay “simple” create-verification (user_id + kyc_type); `app` always from env in API body. */
export interface FuspayCreateVerificationUserPayload {
  user_id: string;
  kyc_type?: string;
  /** Server webhook URL Payonus calls when verification completes; required by API unless set via env. */
  callback?: string;
  /** Optional user return URL after flow; defaults to `callback` or env. */
  redirect?: string;
  individual_checks?: Record<string, unknown>;
  business_checks?: Record<string, unknown>;
  aml_checks?: Record<string, unknown>;
}

/** Extended Modular KYC body (docs.fuspay.us style: customer_id + optional country + checks). */
export interface FuspayCreateVerificationExtendedRequest {
  customer_id: string;
  country?: string;
  callback?: string;
  redirect?: string;
  branding?: Record<string, unknown>;
  individual_checks?: Record<string, unknown>;
  business_checks?: Record<string, unknown>;
  aml_checks?: Record<string, unknown>;
  additional_fields?: Array<Record<string, unknown>>;
}

export interface FuspayCreateVerificationResponse {
  verification_id?: string;
  reference?: string;
  verification_url?: string;
  todo?: string[];
  total_checks?: number;
  status?: string;
  message?: string;
  success?: boolean;
  data?: {
    id?: string;
    url?: string;
    verification_url?: string;
    status?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface FuspayVerificationStatusResponse {
  verification_id?: string;
  reference?: string;
  status?: string;
  overall_status?: string;
  completed_checks?: number;
  total_checks?: number;
  check_statuses?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface FuspaySubmitVerificationResponse {
  success?: boolean;
  message?: string;
  [key: string]: unknown;
}

export interface FuspayCompleteVerificationResponse {
  success?: boolean;
  message?: string;
  pending_checks?: string[];
  completed_checks?: number;
  total_checks?: number;
  [key: string]: unknown;
}

export class FuspayModularKycService {
  private readonly axiosInstance: AxiosInstance;
  private readonly baseUrl: string;
  private readonly createAppServiceBaseUrl: string;
  private readonly appId: string;
  private readonly apiKey: string;
  private readonly enabled: boolean;

  constructor() {
    let rawBase =
      process.env.FUSPAY_MODULAR_BASE_URL ||
      'https://fuspay-kyc-prod-e9eb4fd3aa33.herokuapp.com';
    rawBase = rawBase.replace(/\/$/, '');
    if (rawBase.endsWith('/api/v1')) {
      rawBase = rawBase.slice(0, -'/api/v1'.length);
    }
    this.baseUrl = rawBase;
    this.createAppServiceBaseUrl = (process.env.CREATE_APP_SERVICE_URL || process.env.CREATE_APP_MS_URL || '').replace(/\/$/, '');
    this.appId = process.env.FUSPAY_MODULAR_APP_ID || '';
    this.apiKey = process.env.FUSPAY_MODULAR_API_KEY || '';
    this.enabled = (process.env.FUSPAY_MODULAR_KYC_ENABLED || 'false').toLowerCase() === 'true';

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 20000,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  isConfigured(): boolean {
    return Boolean(this.appId);
  }

  /** Payonus/Fuspay rejects create-verification without `callback`. */
  private resolveCallbackAndRedirect(
    explicitCallback?: string,
    explicitRedirect?: string
  ): { callback: string; redirect?: string } | { error: string } {
    const envCallback = process.env.FUSPAY_MODULAR_VERIFICATION_CALLBACK?.trim();
    const envRedirect = process.env.FUSPAY_MODULAR_VERIFICATION_REDIRECT?.trim();
    const callback = explicitCallback?.trim() || envCallback;
    if (!callback) {
      return {
        error:
          'Fuspay requires a callback URL. Set FUSPAY_MODULAR_VERIFICATION_CALLBACK or pass callback (your compliance webhook URL).'
      };
    }
    const redirect = explicitRedirect?.trim() || envRedirect || callback;
    return { callback, redirect };
  }

  private getHeaders(): Record<string, string> {
    if (!this.apiKey) return {};
    return { Authorization: `Bearer ${this.apiKey}` };
  }

  /**
   * Default checks for create-verification when caller doesn't provide one.
   * Keeps frontend payload minimal while still creating actionable verification sessions.
   */
  private defaultChecks(kycType: string): {
    individual_checks?: Record<string, unknown>;
    business_checks?: Record<string, unknown>;
    aml_checks: Record<string, unknown>;
  } {
    const normalized = (kycType || 'individual').toLowerCase();
    if (normalized === 'business' || normalized === 'merchant') {
      return {
        business_checks: {
          tin: true,
          cac: true
        },
        aml_checks: {
          aml_check: true,
          sanction_list: true
        }
      };
    }

    return {
      individual_checks: {
        verification_types: {
          bvn: true,
          nin: true,
          phone: true,
          email: true
        },
        liveliness: true,
        address_verification: {
          enabled: true,
          upload_proof_of_address: true
        },
        bio: true,
        document_verification: true,
        disclaimer: true
      },
      aml_checks: {
        aml_check: true,
        sanction_list: true
      }
    };
  }

  private defaultCountry(): string {
    return (process.env.FUSPAY_MODULAR_DEFAULT_COUNTRY || 'NG').trim().toUpperCase();
  }

  /**
   * Default branding for hosted verification page.
   * Caller can override by passing `branding` in request body.
   */
  private defaultBranding(): Record<string, unknown> {
    return {
      bg_color: '#1a1a2e',
      text_color: '#ffffff',
      button_color: '#00ff88',
      brand_logo: 'https://example.com/logo.png',
      brand_name: 'Xyz'
    };
  }

  private buildCreateAppManifestUrl(appId: string): string | undefined {
    if (!this.createAppServiceBaseUrl) return undefined;

    let base = this.createAppServiceBaseUrl;
    if (base.endsWith('/api/v1/apps')) {
      base = base.slice(0, -'/api/v1/apps'.length);
    } else if (base.endsWith('/api/v1')) {
      base = base.slice(0, -'/api/v1'.length);
    }

    return `${base}/api/v1/apps/${encodeURIComponent(appId)}/pwa/manifest.webmanifest`;
  }

  /**
   * Resolve branding from create-app-ms app config (via published manifest) and
   * return Fuspay branding keys. Returns undefined when app context is missing.
   * Caller can fall back to built-in defaults.
   */
  async getBrandingForApp(appId?: string): Promise<Record<string, unknown> | undefined> {
    if (!appId) return undefined;

    const manifestUrl = this.buildCreateAppManifestUrl(appId);
    if (!manifestUrl) return undefined;

    try {
      const response = await axios.get<any>(manifestUrl, { timeout: 5000 });
      const manifest = response?.data && typeof response.data === 'object' ? response.data : {};
      const defaults = this.defaultBranding();

      const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
      const firstIcon = icons.find((icon: any) => icon && typeof icon.src === 'string' && icon.src.trim().length > 0);
      const brandLogo = firstIcon?.src as string | undefined;
      const brandName =
        (typeof manifest.name === 'string' && manifest.name.trim()) ||
        (typeof manifest.short_name === 'string' && manifest.short_name.trim()) ||
        undefined;
      const buttonColor =
        (typeof manifest.theme_color === 'string' && manifest.theme_color.trim()) ||
        undefined;
      const backgroundColor =
        (typeof manifest.background_color === 'string' && manifest.background_color.trim()) ||
        undefined;

      return {
        ...defaults,
        ...(backgroundColor ? { bg_color: backgroundColor } : {}),
        ...(buttonColor ? { button_color: buttonColor } : {}),
        ...(brandLogo ? { brand_logo: brandLogo } : {}),
        ...(brandName ? { brand_name: brandName } : {})
      };
    } catch (error: any) {
      logger.warn('Failed to resolve Fuspay branding from create-app-ms; using defaults', {
        appId,
        error: error?.message || 'Unknown error'
      });
      return undefined;
    }
  }

  async createUser(request: FuspayCreateUserRequest): Promise<{
    success: boolean;
    message?: string;
    data?: FuspayCreateUserResponse;
    error?: string;
  }> {
    try {
      if (!this.isEnabled()) {
        return { success: true, message: 'Fuspay modular KYC integration is disabled' };
      }
      if (!this.isConfigured()) {
        return { success: false, error: 'Fuspay modular KYC is enabled but FUSPAY_MODULAR_APP_ID is not set' };
      }

      const payload: FuspayCreateUserPayload = {
        email: request.email,
        phone: request.phone,
        app: this.appId,
        country: request.country,
        user_ref: request.userRef
      };

      auditLogger('FUSPAY_CREATE_USER_REQUEST', 'system', {
        userRef: request.userRef,
        country: request.country
      });

      const response = await this.axiosInstance.post<FuspayCreateUserResponse>(
        '/api/v1/modular/user/',
        payload,
        { headers: this.getHeaders() }
      );

      const normalizedCustomerId =
        response.data?.customer_id ||
        response.data?.data?.id ||
        response.data?.data?.customer_id;
      const normalizedUserRef =
        response.data?.user_ref ||
        response.data?.data?.user_ref ||
        request.userRef;

      logger.info('Fuspay modular user created', {
        userRef: request.userRef,
        customerId: normalizedCustomerId
      });

      auditLogger('FUSPAY_CREATE_USER_RESPONSE', 'system', {
        userRef: normalizedUserRef,
        customerId: normalizedCustomerId
      });

      return {
        success: true,
        message: response.data?.message || 'Fuspay user created successfully',
        data: {
          ...response.data,
          ...(normalizedCustomerId ? { customer_id: normalizedCustomerId } : {}),
          ...(normalizedUserRef ? { user_ref: normalizedUserRef } : {})
        }
      };
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to create Fuspay user';
      logger.error('Fuspay modular create user failed', {
        error: message,
        status: error?.response?.status
      });
      return {
        success: false,
        error: message
      };
    }
  }

  /**
   * Create verification session — prefers `{ user_id, app, kyc_type }` (env app id only).
   * Falls back to extended Modular payload (`customer_id` + `country`) when `customer_id` is present.
   */
  async createVerification(
    request: FuspayCreateVerificationUserPayload | FuspayCreateVerificationExtendedRequest
  ): Promise<{
    success: boolean;
    message?: string;
    data?: FuspayCreateVerificationResponse;
    error?: string;
  }> {
    try {
      if (!this.isEnabled()) {
        return { success: true, message: 'Fuspay modular KYC integration is disabled' };
      }
      if (!this.isConfigured()) {
        return { success: false, error: 'Fuspay modular KYC is enabled but FUSPAY_MODULAR_APP_ID is not set' };
      }

      let body: Record<string, unknown>;
      if ('customer_id' in request && request.customer_id) {
        const ext = request as FuspayCreateVerificationExtendedRequest;
        body = { ...ext } as Record<string, unknown>;
        const cr = this.resolveCallbackAndRedirect(ext.callback, ext.redirect);
        if ('error' in cr) {
          return { success: false, error: cr.error };
        }
        body.country = (typeof body.country === 'string' && body.country.trim().length > 0)
          ? body.country
          : this.defaultCountry();
        body.callback = cr.callback;
        body.redirect = cr.redirect ?? cr.callback;

        const requestedType = ((body.kyc_type as string | undefined) || 'individual').toLowerCase();
        const defaults = this.defaultChecks(requestedType);
        if (!body.individual_checks && defaults.individual_checks) {
          body.individual_checks = defaults.individual_checks;
        }
        if (!body.business_checks && defaults.business_checks) {
          body.business_checks = defaults.business_checks;
        }
        if (!body.aml_checks && defaults.aml_checks) {
          body.aml_checks = defaults.aml_checks;
        }
        // Keep explicit false values for business checks in individual flow unless caller overrides.
        if (!body.business_checks && requestedType === 'individual') {
          body.business_checks = { tin: false, cac: false };
        }
        if (!body.branding) {
          body.branding = this.defaultBranding();
        }
      } else if ('user_id' in request && request.user_id) {
        const up = request as FuspayCreateVerificationUserPayload;
        const cr = this.resolveCallbackAndRedirect(up.callback, up.redirect);
        if ('error' in cr) {
          return { success: false, error: cr.error };
        }
        const kycType = up.kyc_type || 'individual';
        const defaults = this.defaultChecks(kycType);
        body = {
          user_id: request.user_id,
          app: this.appId,
          kyc_type: kycType,
          callback: cr.callback,
          redirect: cr.redirect,
          country: this.defaultCountry(),
          branding: this.defaultBranding(),
          ...(up.individual_checks ? { individual_checks: up.individual_checks } : defaults.individual_checks ? { individual_checks: defaults.individual_checks } : {}),
          ...(up.business_checks
            ? { business_checks: up.business_checks }
            : defaults.business_checks
              ? { business_checks: defaults.business_checks }
              : { business_checks: { tin: false, cac: false } }),
          ...(up.aml_checks ? { aml_checks: up.aml_checks } : defaults.aml_checks ? { aml_checks: defaults.aml_checks } : {})
        };
      } else {
        return {
          success: false,
          error: 'Either user_id (Fuspay user id) or customer_id is required'
        };
      }

      auditLogger('FUSPAY_CREATE_VERIFICATION_REQUEST', 'system', {
        mode: 'customer_id' in body ? 'extended' : 'user_payload'
      });

      const response = await this.axiosInstance.post<FuspayCreateVerificationResponse>(
        '/api/v1/modular/verification',
        body,
        { headers: this.getHeaders() }
      );

      const raw = response.data || {};
      const nested = raw.data && typeof raw.data === 'object' ? raw.data : undefined;
      const verificationId =
        nested?.id ||
        raw.verification_id ||
        (nested as { verification_id?: string })?.verification_id;
      const verificationUrl =
        nested?.url ||
        nested?.verification_url ||
        raw.verification_url ||
        (nested as { verificationUrl?: string })?.verificationUrl;
      const status = nested?.status ?? raw.status;

      const normalized: FuspayCreateVerificationResponse = {
        ...raw,
        ...(verificationId ? { verification_id: verificationId } : {}),
        ...(verificationUrl ? { verification_url: verificationUrl } : {}),
        ...(status ? { status } : {})
      };

      auditLogger('FUSPAY_CREATE_VERIFICATION_RESPONSE', 'system', {
        verificationId,
        hasUrl: Boolean(verificationUrl)
      });

      return {
        success: true,
        message: raw.message || 'Fuspay verification created successfully',
        data: normalized
      };
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to create Fuspay verification';
      logger.error('Fuspay modular create verification failed', {
        error: message,
        status: error?.response?.status
      });
      return { success: false, error: message };
    }
  }

  async submitVerification(
    verificationId: string,
    request: Record<string, unknown>
  ): Promise<{
    success: boolean;
    message?: string;
    data?: FuspaySubmitVerificationResponse;
    error?: string;
  }> {
    try {
      if (!this.isEnabled()) {
        return { success: true, message: 'Fuspay modular KYC integration is disabled' };
      }
      if (!this.isConfigured()) {
        return { success: false, error: 'Fuspay modular KYC is enabled but FUSPAY_MODULAR_APP_ID is not set' };
      }

      const response = await this.axiosInstance.post<FuspaySubmitVerificationResponse>(
        `/api/v1/modular/submit/${verificationId}`,
        request,
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        message: 'Fuspay verification data submitted successfully',
        data: response.data
      };
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to submit Fuspay verification';
      logger.error('Fuspay modular submit verification failed', {
        verificationId,
        error: message,
        status: error?.response?.status
      });
      return { success: false, error: message };
    }
  }

  async getVerificationStatus(verificationId: string): Promise<{
    success: boolean;
    message?: string;
    data?: FuspayVerificationStatusResponse;
    error?: string;
  }> {
    try {
      if (!this.isEnabled()) {
        return { success: true, message: 'Fuspay modular KYC integration is disabled' };
      }
      if (!this.isConfigured()) {
        return { success: false, error: 'Fuspay modular KYC is enabled but FUSPAY_MODULAR_APP_ID is not set' };
      }

      const response = await this.axiosInstance.get<FuspayVerificationStatusResponse>(
        `/api/v1/modular/status/${verificationId}`,
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        message: 'Fuspay verification status fetched successfully',
        data: response.data
      };
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to fetch Fuspay verification status';
      logger.error('Fuspay modular get verification status failed', {
        verificationId,
        error: message,
        status: error?.response?.status
      });
      return { success: false, error: message };
    }
  }

  async completeVerification(verificationId: string): Promise<{
    success: boolean;
    message?: string;
    data?: FuspayCompleteVerificationResponse;
    error?: string;
  }> {
    try {
      if (!this.isEnabled()) {
        return { success: true, message: 'Fuspay modular KYC integration is disabled' };
      }
      if (!this.isConfigured()) {
        return { success: false, error: 'Fuspay modular KYC is enabled but FUSPAY_MODULAR_APP_ID is not set' };
      }

      const response = await this.axiosInstance.post<FuspayCompleteVerificationResponse>(
        `/api/v1/modular/complete/${verificationId}`,
        {},
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        message: 'Fuspay verification completion attempted',
        data: response.data
      };
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to complete Fuspay verification';
      logger.error('Fuspay modular complete verification failed', {
        verificationId,
        error: message,
        status: error?.response?.status
      });
      return { success: false, error: message };
    }
  }
}

export const fuspayModularKycService = new FuspayModularKycService();
