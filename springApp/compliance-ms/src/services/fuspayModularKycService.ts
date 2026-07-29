import axios from 'axios';
import { logger } from '../utils/logger';
import { auditLogger } from '../utils/audit';
import {
  type FuspayBranding,
  FUSPAY_PLATFORM_BRANDING_DEFAULTS,
  resolveFuspayBrandingForApp
} from '../utils/fuspayBranding';

type AxiosInstance = ReturnType<typeof axios.create>;

export interface FuspayCreateUserRequest {
  email: string;
  phone: string;
  country: string;
  userRef: string;
  branding?: FuspayBranding | Record<string, unknown>;
}

interface FuspayCreateUserPayload {
  email: string;
  phone: string;
  app: string;
  country: string;
  user_ref: string;
  branding?: FuspayBranding;
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
  branding?: FuspayBranding | Record<string, unknown>;
  individual_checks?: Record<string, unknown>;
  business_checks?: Record<string, unknown>;
  aml_checks?: Record<string, unknown>;
}

/** Extended Modular KYC body (docs.fuspay.us style: customer_id + optional country + checks). */
export interface FuspayCreateVerificationExtendedRequest {
  customer_id: string;
  kyc_type?: string;
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

/**
 * Fuspay modular individual_checks for retail/guarantor flows.
 * @see Fuspay tenant guide — top-level `bio` / `document_verification`; `liveliness` under `verification_types`.
 */
export const INDIVIDUAL_FUSPAY_VERIFICATION_CHECKS = {
  bio: true,
  document_verification: false,
  verification_types: {
    phone: true,
    email: true,
    nin: true,
    bvn: true,
    /** Fuspay spelling — `liveness` is rejected by API validation. */
    liveliness: true
  }
} as const;

/** Guarantor Fuspay KYC uses the same individual_checks as retail. */
export const GUARANTOR_FUSPAY_VERIFICATION_CHECKS = INDIVIDUAL_FUSPAY_VERIFICATION_CHECKS;

export const INDIVIDUAL_FUSPAY_DISABLED_BUSINESS_CHECKS = { tin: false, cac: false } as const;

export function isIndividualFuspayKycType(kycType: string | undefined): boolean {
  const normalized = (kycType || 'individual').toLowerCase();
  return normalized === 'individual' || normalized === 'retail';
}

export class FuspayModularKycService {
  private readonly axiosInstance: AxiosInstance;
  private readonly baseUrl: string;
  private readonly createAppServiceBaseUrl: string;
  private readonly appId: string;
  private readonly apiKey: string;
  private readonly enabled: boolean;
  private readonly allowedFuspayCountryCodes: Set<string>;

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
    this.allowedFuspayCountryCodes = FuspayModularKycService.parseAllowedCountryCodes(
      process.env.FUSPAY_MODULAR_ALLOWED_COUNTRIES
    );

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

  private static parseAllowedCountryCodes(raw?: string): Set<string> {
    const src = (raw ?? 'NG,TZ,GH,KE').trim();
    const codes = src
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter((s) => /^[A-Z]{2}$/.test(s));
    const list = codes.length ? codes : ['NG', 'TZ', 'GH', 'KE'];
    return new Set(list);
  }

  private assertFuspayCountry(country: string): { ok: true; code: string } | { ok: false; error: string } {
    const code = country.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) {
      return { ok: false, error: 'Fuspay country must be a valid ISO 3166-1 alpha-2 code' };
    }
    if (!this.allowedFuspayCountryCodes.has(code)) {
      return {
        ok: false,
        error: `Country must be one of: ${[...this.allowedFuspayCountryCodes].sort().join(', ')}`
      };
    }
    return { ok: true, code };
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
   * Individual flows: bio, phone, email, nin, bvn, liveliness (document_verification disabled).
   */
  private defaultChecks(kycType: string): {
    individual_checks?: Record<string, unknown>;
    business_checks?: Record<string, unknown>;
    aml_checks?: Record<string, unknown>;
  } {
    if (isIndividualFuspayKycType(kycType)) {
      return {
        individual_checks: { ...INDIVIDUAL_FUSPAY_VERIFICATION_CHECKS },
        business_checks: { ...INDIVIDUAL_FUSPAY_DISABLED_BUSINESS_CHECKS }
      };
    }

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

  /** Force individual retail/guarantor verification to Fuspay recommended NG individual_checks. */
  private applyIndividualVerificationPolicy(body: Record<string, unknown>, kycType: string): void {
    if (!isIndividualFuspayKycType(kycType)) return;

    body.individual_checks = { ...INDIVIDUAL_FUSPAY_VERIFICATION_CHECKS };
    body.business_checks = { ...INDIVIDUAL_FUSPAY_DISABLED_BUSINESS_CHECKS };
    delete body.aml_checks;
  }

  /** Fuspay expects field schema objects, not `{ key, value }` prefill payloads. */
  private normalizeAdditionalFields(fields: unknown): Array<Record<string, unknown>> | undefined {
    if (!Array.isArray(fields) || fields.length === 0) return undefined;

    const normalized: Array<Record<string, unknown>> = [];
    for (const item of fields) {
      if (!item || typeof item !== 'object') continue;
      const record = item as Record<string, unknown>;
      const fieldName =
        (typeof record.field_name === 'string' && record.field_name.trim()) ||
        (typeof record.fieldName === 'string' && record.fieldName.trim()) ||
        (typeof record.key === 'string' && record.key.trim()) ||
        '';
      if (!fieldName) continue;

      // If caller already sent schema-style fields, keep them (minus unsupported value keys).
      if (
        typeof record.data_type === 'string' ||
        typeof record.field_description === 'string' ||
        typeof record.is_required === 'boolean'
      ) {
        const { value: _value, field_value: _fieldValue, fieldValue: _fieldValueCamel, key: _key, ...rest } = record;
        normalized.push({ ...rest, field_name: fieldName });
        continue;
      }

      // Legacy `{ key, value }` payloads are not valid for create-verification; skip them.
    }

    return normalized.length > 0 ? normalized : undefined;
  }

  private defaultCountry(): string {
    return (process.env.FUSPAY_MODULAR_DEFAULT_COUNTRY || 'NG').trim().toUpperCase();
  }

  /**
   * Resolve tenant branding from create-app-ms PWA manifest (Fuspay tenant branding guide).
   * Optional `override` merges caller-provided branding keys on top of manifest / platform defaults.
   */
  async getBrandingForApp(
    appId?: string,
    override?: Record<string, unknown> | null
  ): Promise<FuspayBranding> {
    try {
      return await resolveFuspayBrandingForApp(this.createAppServiceBaseUrl, appId, override);
    } catch (error: any) {
      logger.warn('Failed to resolve Fuspay branding from create-app-ms; using platform defaults', {
        appId,
        error: error?.message || 'Unknown error'
      });
      return { ...FUSPAY_PLATFORM_BRANDING_DEFAULTS };
    }
  }

  private resolveBranding(
    branding?: FuspayBranding | Record<string, unknown>
  ): FuspayBranding {
    if (!branding || typeof branding !== 'object') {
      return { ...FUSPAY_PLATFORM_BRANDING_DEFAULTS };
    }
    return {
      ...FUSPAY_PLATFORM_BRANDING_DEFAULTS,
      ...branding
    } as FuspayBranding;
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

      const countryCheck = this.assertFuspayCountry(request.country);
      if (!countryCheck.ok) {
        return { success: false, error: countryCheck.error };
      }

      const payload: FuspayCreateUserPayload = {
        email: request.email,
        phone: request.phone,
        app: this.appId,
        country: countryCheck.code,
        user_ref: request.userRef,
        branding: this.resolveBranding(request.branding)
      };

      auditLogger('FUSPAY_CREATE_USER_REQUEST', 'system', {
        userRef: request.userRef,
        country: countryCheck.code
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
        const countryRes = this.assertFuspayCountry(String(body.country));
        if (!countryRes.ok) {
          return { success: false, error: countryRes.error };
        }
        body.country = countryRes.code;
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
          body.branding = { ...FUSPAY_PLATFORM_BRANDING_DEFAULTS };
        } else {
          body.branding = this.resolveBranding(body.branding as FuspayBranding);
        }
        this.applyIndividualVerificationPolicy(body, requestedType);
        delete body.kyc_type;
      } else if ('user_id' in request && request.user_id) {
        const up = request as FuspayCreateVerificationUserPayload;
        const cr = this.resolveCallbackAndRedirect(up.callback, up.redirect);
        if ('error' in cr) {
          return { success: false, error: cr.error };
        }
        const defaultCountryRes = this.assertFuspayCountry(this.defaultCountry());
        if (!defaultCountryRes.ok) {
          return {
            success: false,
            error: `FUSPAY_MODULAR_DEFAULT_COUNTRY must be one of: ${[...this.allowedFuspayCountryCodes].sort().join(', ')}`
          };
        }
        const kycType = up.kyc_type || 'individual';
        const defaults = this.defaultChecks(kycType);
        body = {
          user_id: request.user_id,
          app: this.appId,
          kyc_type: kycType,
          callback: cr.callback,
          redirect: cr.redirect,
          country: defaultCountryRes.code,
          branding: this.resolveBranding(up.branding),
          ...(up.individual_checks ? { individual_checks: up.individual_checks } : defaults.individual_checks ? { individual_checks: defaults.individual_checks } : {}),
          ...(up.business_checks
            ? { business_checks: up.business_checks }
            : defaults.business_checks
              ? { business_checks: defaults.business_checks }
              : { business_checks: { tin: false, cac: false } }),
          ...(up.aml_checks ? { aml_checks: up.aml_checks } : defaults.aml_checks ? { aml_checks: defaults.aml_checks } : {})
        };
        this.applyIndividualVerificationPolicy(body, kycType);
      } else {
        return {
          success: false,
          error: 'Either user_id (Fuspay user id) or customer_id is required'
        };
      }

      auditLogger('FUSPAY_CREATE_VERIFICATION_REQUEST', 'system', {
        mode: 'customer_id' in body ? 'extended' : 'user_payload'
      });

      const normalizedAdditionalFields = this.normalizeAdditionalFields(body.additional_fields);
      if (normalizedAdditionalFields) {
        body.additional_fields = normalizedAdditionalFields;
      } else {
        delete body.additional_fields;
      }

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
