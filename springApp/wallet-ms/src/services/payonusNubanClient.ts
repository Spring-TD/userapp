import axios, { AxiosError } from 'axios';
import {
  payonusNubanConfig,
  isPayonusNubanReady,
  isPayonusPayoutReady,
  type PayonusAuthMode
} from '../config/payonusNuban';
import { logger } from '../utils/logger';
import type { MerchantWallet, UserWallet } from '../models/Wallet';

export type PayonusNubanExtracted = {
  accountNumber?: string;
  bankName?: string;
  bankCode?: string;
  providerReference?: string;
};

export type PayonusNubanCallResult = {
  ok: boolean;
  details: PayonusNubanExtracted;
  errorMessage?: string;
  httpStatus?: number;
};

export type PayonusBankPayoutRequest = {
  sourceAccountNumber: string;
  destinationAccountNumber: string;
  destinationBankCode: string;
  destinationAccountName: string;
  amount: number;
  currency: string;
  reference: string;
  narration?: string;
  /** Beneficiary/customer email — PayOnUs bank-transfer body requires one. */
  email?: string;
  /** ISO country code; defaults to PAYONUS_PAYOUT_COUNTRY_CODE (NG). */
  countryCode?: string;
};

export type PayonusBankPayoutResult = {
  ok: boolean;
  providerReference?: string;
  providerStatus?: string;
  raw?: unknown;
  errorMessage?: string;
  httpStatus?: number;
};

export type PayonusNameEnquiryResult = {
  ok: boolean;
  accountName?: string;
  accountNumber?: string;
  bankCode?: string;
  bankName?: string;
  errorMessage?: string;
  httpStatus?: number;
};

export type PayonusBank = {
  code: string;
  name: string;
};

export type PayonusBankListResult = {
  ok: boolean;
  banks: PayonusBank[];
  errorMessage?: string;
  httpStatus?: number;
  cached?: boolean;
};

type PayonusTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
};

let cachedOAuthToken: { token: string; expiresAtMs: number } | null = null;

function joinPayonusUrl(base: string, path: string): string {
  const b = base.replace(/\/$/, '');
  let p = path.startsWith('/') ? path : `/${path}`;
  if (/\/v1$/i.test(b) && /^\/v1(\/|$)/i.test(p)) {
    p = p.replace(/^\/v1/i, '');
    if (!p.startsWith('/')) p = `/${p}`;
  }
  return `${b}${p}`;
}

function inferOAuthBaseUrlFromApiBase(apiBase: string): string {
  const lower = apiBase.toLowerCase();
  if (lower.includes('sandbox')) return 'https://core-sandbox.payonus.com';
  return 'https://core.payonus.com';
}

function resolveOAuthBaseUrl(): string {
  const { oauthBaseUrl, baseUrl } = payonusNubanConfig;
  if (oauthBaseUrl) return oauthBaseUrl;
  if (baseUrl) return inferOAuthBaseUrlFromApiBase(baseUrl);
  return '';
}

function readPayonusErrorMessage(payload: unknown, httpStatus: number): string {
  if (payload && typeof payload === 'object') {
    const o = payload as Record<string, unknown>;
    const data = o.data;
    if (data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      for (const key of ['error', 'message', 'msg', 'description'] as const) {
        const v = d[key];
        if (typeof v === 'string' && v.trim()) return v.trim();
      }
    }
    for (const key of ['error', 'message', 'msg', 'description'] as const) {
      const v = o[key];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
  }
  return `Payonus HTTP ${httpStatus}`;
}

function getAtPath(obj: unknown, path: string): unknown {
  const parts = path.split('.').filter(Boolean);
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur === null || cur === undefined) return undefined;
    if (typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function firstString(obj: unknown, paths: string[]): string | undefined {
  for (const p of paths) {
    const v = getAtPath(obj, p);
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      return String(v).trim();
    }
  }
  return undefined;
}

function extractFromPayload(payload: unknown): PayonusNubanExtracted {
  const c = payonusNubanConfig;
  const base = {
    accountNumber: firstString(payload, c.accountNumberPaths),
    bankName: firstString(payload, c.bankNamePaths),
    bankCode: firstString(payload, c.bankCodePaths),
    providerReference: firstString(payload, c.providerReferencePaths)
  };
  if (base.accountNumber) return base;
  const nested = getAtPath(payload, 'data');
  if (nested && typeof nested === 'object') {
    return {
      accountNumber: firstString(nested, c.accountNumberPaths) ?? base.accountNumber,
      bankName: firstString(nested, c.bankNamePaths) ?? base.bankName,
      bankCode: firstString(nested, c.bankCodePaths) ?? base.bankCode,
      providerReference: firstString(nested, c.providerReferencePaths) ?? base.providerReference
    };
  }
  return base;
}

function extractPayoutFromPayload(payload: unknown): Pick<PayonusBankPayoutResult, 'providerReference' | 'providerStatus'> {
  const c = payonusNubanConfig;
  const base = {
    providerReference: firstString(payload, c.payoutReferencePaths),
    providerStatus: firstString(payload, c.payoutStatusPaths)
  };
  if (base.providerReference || base.providerStatus) return base;
  const nested = getAtPath(payload, 'data');
  if (nested && typeof nested === 'object') {
    return {
      providerReference: firstString(nested, c.payoutReferencePaths),
      providerStatus: firstString(nested, c.payoutStatusPaths)
    };
  }
  return base;
}

function pathUsesDocumentedVirtualAccountCreate(path: string): boolean {
  const p = path.toLowerCase();
  return p.includes('/api/v1/virtual-accounts/fixed-account');
}

/** Shareholders in compliance-ms use JWT userId; wallets use userMerchantId as merchantId. */
function complianceShareholderOwnerUserId(wallet: MerchantWallet | UserWallet): string {
  const explicit = wallet.complianceShareholderUserId?.trim();
  if (explicit) return explicit;
  if (wallet.walletType === 'USER') {
    return (wallet.userId || wallet.merchantId).trim();
  }
  return wallet.merchantId.trim();
}

function buildVirtualAccountEmail(localPart: string): string {
  const domain = payonusNubanConfig.vaEmailDomain.replace(/^@/, '');
  const safeLocal = localPart.replace(/[^a-zA-Z0-9._+-]/g, '-');
  return `${safeLocal}@${domain}`;
}

async function fetchUserBvnFromCompliance(retailUserId: string): Promise<string | undefined> {
  const base = payonusNubanConfig.complianceServiceUrl.trim();
  const token = payonusNubanConfig.complianceWalletInternalToken;
  if (!base || !token) return undefined;

  const url = `${base}/api/v1/kyc/internal/payonus/user-bvn/${encodeURIComponent(retailUserId)}`;
  try {
    const res = await axios.get<unknown>(url, {
      headers: { 'X-Internal-Token': token },
      timeout: payonusNubanConfig.complianceBvnTimeoutMs,
      validateStatus: () => true
    });
    if (res.status >= 200 && res.status < 300 && res.data && typeof res.data === 'object') {
      const o = res.data as Record<string, unknown>;
      if (o.success === true && typeof o.bvn === 'string') {
        const digits = o.bvn.replace(/\D/g, '');
        if (digits.length === 11) return digits;
      }
    } else if (res.status !== 404) {
      logger.warn('Compliance user BVN unexpected response', {
        retailUserId,
        httpStatus: res.status
      });
    }
  } catch (err) {
    logger.warn('Compliance user BVN request failed', {
      retailUserId,
      message: err instanceof Error ? err.message : String(err)
    });
  }
  return undefined;
}

/** Retail user: Fuspay KYC BVN first, then merchant shareholder fallback. */
async function resolveBvnForUserWallet(wallet: UserWallet): Promise<string> {
  const fromKyc = await fetchUserBvnFromCompliance(wallet.userId.trim());
  if (fromKyc) return fromKyc;
  return resolveBvn(complianceShareholderOwnerUserId(wallet));
}

async function fetchFirstShareholderBvnFromCompliance(ownerUserId: string): Promise<string | undefined> {
  const base = payonusNubanConfig.complianceServiceUrl.trim();
  const token = payonusNubanConfig.complianceWalletInternalToken;
  if (!base || !token) return undefined;

  const url = `${base}/api/v1/kyc/internal/payonus/first-shareholder-bvn/${encodeURIComponent(ownerUserId)}`;
  try {
    const res = await axios.get<unknown>(url, {
      headers: { 'X-Internal-Token': token },
      timeout: payonusNubanConfig.complianceBvnTimeoutMs,
      validateStatus: () => true
    });
    if (res.status >= 200 && res.status < 300 && res.data && typeof res.data === 'object') {
      const o = res.data as Record<string, unknown>;
      if (o.success === true && typeof o.bvn === 'string') {
        const digits = o.bvn.replace(/\D/g, '');
        if (digits.length === 11) return digits;
      }
    } else if (res.status !== 404) {
      logger.warn('Compliance first-shareholder BVN unexpected response', {
        ownerUserId,
        httpStatus: res.status
      });
    }
  } catch (err) {
    logger.warn('Compliance first-shareholder BVN request failed', {
      ownerUserId,
      message: err instanceof Error ? err.message : String(err)
    });
  }
  return undefined;
}

async function resolveBvn(shareholderOwnerUserId: string): Promise<string> {
  const uid = shareholderOwnerUserId.trim();
  if (uid) {
    const fromCompliance = await fetchFirstShareholderBvnFromCompliance(uid);
    if (fromCompliance) return fromCompliance;
  }

  const configured = payonusNubanConfig.vaBvn.trim();
  if (configured) {
    const digitsOnly = configured.replace(/\D/g, '');
    return digitsOnly.length === 11 ? digitsOnly : configured;
  }
  if (payonusNubanConfig.vaUseTestPlaceholders) return '00000000000';
  return '';
}

function resolvePhone(suffix: string): string {
  const digits = suffix.replace(/\D/g, '').slice(-9) || '000000000';
  return `${payonusNubanConfig.vaPhonePrefix}${digits}`.slice(0, 15);
}

async function buildVirtualAccountCreateBody(
  accountName: string,
  reference: string,
  idForEmail: string,
  shareholderOwnerUserId: string,
  options?: { bvn?: string }
): Promise<Record<string, unknown>> {
  const businessId = payonusNubanConfig.vaBusinessId.trim();
  if (!businessId) {
    throw new Error('PayOnUs fixed-account create requires PAYONUS_VA_BUSINESS_ID.');
  }

  const dob = payonusNubanConfig.vaDob.trim();
  if (!dob) {
    throw new Error('PayOnUs fixed-account create requires PAYONUS_VA_DOB (YYYY-MM-DD).');
  }

  const bvn = options?.bvn ?? (await resolveBvn(shareholderOwnerUserId));
  if (!bvn) {
    throw new Error(
      'PayOnUs virtual account create requires an 11-digit BVN: complete Fuspay modular KYC for the user (webhook stores BVN on KYC profile), add merchant shareholder BVN in compliance-ms, set COMPLIANCE_SERVICE_URL + COMPLIANCE_WALLET_INTERNAL_TOKEN on wallet-ms, or set PAYONUS_VA_BVN, or PAYONUS_VA_USE_TEST_PLACEHOLDERS=true for sandbox.'
    );
  }

  const customer: Record<string, unknown> = {
    name: accountName,
    phone: resolvePhone(idForEmail),
    email: buildVirtualAccountEmail(idForEmail),
    bvn,
    address: {
      line1: payonusNubanConfig.vaAddressLine1,
      city: payonusNubanConfig.vaAddressCity,
      state: payonusNubanConfig.vaAddressState,
      postalCode: payonusNubanConfig.vaAddressPostalCode,
      countryCode: payonusNubanConfig.vaAddressCountryCode
    }
  };

  const body: Record<string, unknown> = {
    customer,
    reference,
    dob,
    businessId
  };
  const notificationUrl = payonusNubanConfig.vaNotificationUrl.trim();
  if (notificationUrl) body.notificationUrl = notificationUrl;
  return body;
}

function buildAuthHeaders(mode: PayonusAuthMode): Record<string, string> {
  const { apiKey, apiSecret, apiKeyHeaderName } = payonusNubanConfig;
  if (mode === 'api-key') {
    return { [apiKeyHeaderName]: apiKey };
  }
  if (mode === 'basic') {
    const token = Buffer.from(`${apiKey}:${apiSecret || ''}`, 'utf8').toString('base64');
    return { Authorization: `Basic ${token}` };
  }
  return { Authorization: `Bearer ${apiKey}` };
}

function normalizeTokenPayload(payload: unknown): PayonusTokenResponse {
  if (!payload || typeof payload !== 'object') return {};
  const root = payload as Record<string, unknown>;
  const nested = root.data;
  if (nested && typeof nested === 'object') {
    const n = nested as Record<string, unknown>;
    return {
      access_token: typeof n.access_token === 'string' ? n.access_token : undefined,
      token_type: typeof n.token_type === 'string' ? n.token_type : undefined,
      expires_in: typeof n.expires_in === 'number' ? n.expires_in : undefined
    };
  }
  return {
    access_token: typeof root.access_token === 'string' ? root.access_token : undefined,
    token_type: typeof root.token_type === 'string' ? root.token_type : undefined,
    expires_in: typeof root.expires_in === 'number' ? root.expires_in : undefined
  };
}

async function getOAuthAccessToken(forceRefresh = false): Promise<string> {
  const now = Date.now();
  if (!forceRefresh && cachedOAuthToken && cachedOAuthToken.expiresAtMs > now + 10_000) {
    return cachedOAuthToken.token;
  }

  const oauthHost = resolveOAuthBaseUrl();
  if (!oauthHost) {
    throw new Error('Payonus OAuth base URL is not configured (set PAYONUS_OAUTH_BASE_URL or PAYONUS_BASE_URL).');
  }
  const tokenUrl = joinPayonusUrl(oauthHost, payonusNubanConfig.oauthTokenPath);
  const body = {
    apiClientId: payonusNubanConfig.oauthClientId,
    apiClientSecret: payonusNubanConfig.oauthClientSecret
  };

  const res = await axios.post<unknown>(tokenUrl, body, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    timeout: payonusNubanConfig.timeoutMs,
    validateStatus: () => true
  });

  const normalized = normalizeTokenPayload(res.data);
  if (!(res.status >= 200 && res.status < 300) || !normalized.access_token) {
    const message = readPayonusErrorMessage(res.data, res.status);
    throw new Error(`Payonus OAuth token request failed: ${message}`);
  }

  const expiresInSec = Math.max(30, Number(normalized.expires_in || 3600));
  cachedOAuthToken = {
    token: normalized.access_token,
    expiresAtMs: Date.now() + Math.max(10, expiresInSec - 30) * 1000
  };
  return normalized.access_token;
}

async function buildRequestHeaders(): Promise<Record<string, string>> {
  if (payonusNubanConfig.authMode === 'oauth') {
    const token = await getOAuthAccessToken();
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`
    };
  }

  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...buildAuthHeaders(payonusNubanConfig.authMode)
  };
}

async function postJson(path: string, body: Record<string, unknown>): Promise<PayonusNubanCallResult> {
  if (!isPayonusNubanReady()) {
    return { ok: false, details: {}, errorMessage: 'Payonus NUBAN is not configured' };
  }

  const url = joinPayonusUrl(payonusNubanConfig.baseUrl, path);
  const headers = await buildRequestHeaders();

  try {
    const res = await axios.post<unknown>(url, body, {
      headers,
      timeout: payonusNubanConfig.timeoutMs,
      validateStatus: () => true
    });

    let payload = res.data;
    let extracted = extractFromPayload(payload);

    if (res.status === 401 && payonusNubanConfig.authMode === 'oauth') {
      try {
        const freshToken = await getOAuthAccessToken(true);
        const retried = await axios.post<unknown>(url, body, {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${freshToken}`
          },
          timeout: payonusNubanConfig.timeoutMs,
          validateStatus: () => true
        });
        payload = retried.data;
        extracted = extractFromPayload(payload);
        if (retried.status >= 200 && retried.status < 300 && extracted.accountNumber) {
          return { ok: true, details: extracted, httpStatus: retried.status };
        }
        const retryErr = readPayonusErrorMessage(payload, retried.status);
        return {
          ok: false,
          details: extracted,
          errorMessage: retryErr,
          httpStatus: retried.status
        };
      } catch (tokenError) {
        const msg = tokenError instanceof Error ? tokenError.message : 'OAuth refresh failed';
        return { ok: false, details: extracted, errorMessage: msg, httpStatus: 401 };
      }
    }

    if (res.status >= 200 && res.status < 300 && extracted.accountNumber) {
      return { ok: true, details: extracted, httpStatus: res.status };
    }

    const errMsg = readPayonusErrorMessage(payload, res.status);

    logger.warn('Payonus NUBAN request did not yield an account number', {
      httpStatus: res.status,
      extracted,
      path
    });

    return {
      ok: false,
      details: extracted,
      errorMessage: errMsg,
      httpStatus: res.status
    };
  } catch (err) {
    const ax = err as AxiosError;
    const msg = ax.message || 'Payonus request failed';
    logger.error('Payonus NUBAN HTTP error', { path, message: msg, status: ax.response?.status });
    return { ok: false, details: {}, errorMessage: msg, httpStatus: ax.response?.status };
  }
}

async function postPayoutJson(path: string, body: Record<string, unknown>): Promise<PayonusBankPayoutResult> {
  if (!isPayonusPayoutReady()) {
    return { ok: false, errorMessage: 'Payonus payout is not configured' };
  }

  const url = joinPayonusUrl(payonusNubanConfig.baseUrl, path);
  const headers = await buildRequestHeaders();
  const method = (payonusNubanConfig.payoutMethod || 'POST').toUpperCase();

  try {
    const res = await axios.request<unknown>({
      url,
      method: method as 'POST' | 'PUT' | 'PATCH',
      data: body,
      headers,
      timeout: payonusNubanConfig.timeoutMs,
      validateStatus: () => true
    });

    let payload = res.data;
    let extracted = extractPayoutFromPayload(payload);

    if (res.status === 401 && payonusNubanConfig.authMode === 'oauth') {
      try {
        const freshToken = await getOAuthAccessToken(true);
        const retried = await axios.request<unknown>({
          url,
          method: method as 'POST' | 'PUT' | 'PATCH',
          data: body,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${freshToken}`
          },
          timeout: payonusNubanConfig.timeoutMs,
          validateStatus: () => true
        });
        payload = retried.data;
        extracted = extractPayoutFromPayload(payload);
        if (retried.status >= 200 && retried.status < 300) {
          return { ok: true, ...extracted, raw: payload, httpStatus: retried.status };
        }
        return {
          ok: false,
          ...extracted,
          raw: payload,
          errorMessage: describePayoutError(payload, retried.status, method, path),
          httpStatus: retried.status
        };
      } catch (tokenError) {
        const msg = tokenError instanceof Error ? tokenError.message : 'OAuth refresh failed';
        return { ok: false, ...extracted, raw: payload, errorMessage: msg, httpStatus: 401 };
      }
    }

    if (res.status >= 200 && res.status < 300) {
      // A 2xx can still carry a terminal failure status; don't treat those as ok
      // (otherwise the caller would debit the wallet for a rejected transfer).
      const status = (extracted.providerStatus || '').toUpperCase();
      if (status === 'FAILED' || status === 'REJECTED') {
        return {
          ok: false,
          ...extracted,
          raw: payload,
          errorMessage: `PayOnUs transfer ${status}`,
          httpStatus: res.status
        };
      }
      return { ok: true, ...extracted, raw: payload, httpStatus: res.status };
    }

    logger.warn('Payonus payout request failed', {
      httpStatus: res.status,
      method,
      extracted,
      path
    });

    return {
      ok: false,
      ...extracted,
      raw: payload,
      errorMessage: describePayoutError(payload, res.status, method, path),
      httpStatus: res.status
    };
  } catch (err) {
    const ax = err as AxiosError;
    const msg = ax.message || 'Payonus payout request failed';
    logger.error('Payonus payout HTTP error', { path, message: msg, status: ax.response?.status });
    return { ok: false, errorMessage: msg, httpStatus: ax.response?.status };
  }
}

function mergeBody(
  base: Record<string, unknown>,
  extra?: Record<string, unknown>
): Record<string, unknown> {
  if (!extra) return { ...base };
  return { ...base, ...extra };
}

/**
 * When the provider returns 404 for the payout call it almost always means
 * `PAYONUS_PAYOUT_PATH` is unset/incorrect for this account (the default
 * `/api/v1/transfers/bank` is a placeholder). Surface an actionable hint so the
 * operator configures the right path rather than chasing a transfer that "fails".
 */
function describePayoutError(payload: unknown, status: number, method: string, path: string): string {
  const providerMsg = readPayonusErrorMessage(payload, status);
  if (status === 404) {
    return `PayOnUs payout endpoint not found (${method} ${path}). Set PAYONUS_PAYOUT_PATH (and, if needed, PAYONUS_PAYOUT_METHOD / PAYONUS_PAYOUT_BODY_JSON) to the disbursement route documented for your PayOnUs account. Provider said: ${providerMsg}`;
  }
  return providerMsg;
}

/** Placeholder values available to PAYONUS_PAYOUT_BODY_JSON templates. */
function payoutTemplateValues(input: PayonusBankPayoutRequest): Record<string, string | number> {
  return {
    amount: input.amount,
    currency: input.currency,
    reference: input.reference,
    narration: input.narration || 'Wallet payout',
    sourceAccountNumber: input.sourceAccountNumber,
    destinationAccountNumber: input.destinationAccountNumber,
    destinationBankCode: input.destinationBankCode,
    destinationAccountName: input.destinationAccountName,
    businessId: payonusNubanConfig.vaBusinessId || ''
  };
}

function resolvePayoutEmail(input: PayonusBankPayoutRequest): string {
  const explicit = input.email?.trim();
  if (explicit) return explicit;
  const configured = payonusNubanConfig.payoutDefaultEmail.trim();
  if (configured) return configured;
  // Last resort: a deterministic placeholder so the required field is populated.
  return buildVirtualAccountEmail(`payout-${input.destinationAccountNumber}`);
}

/**
 * PayOnUs Name Enquiry — verify a beneficiary bank account before transfer.
 * POST /api/v1/transfer-requests/name-enquiry
 */
export async function nameEnquiry(params: {
  accountNumber: string;
  bankCode: string;
  currency?: string;
}): Promise<PayonusNameEnquiryResult> {
  if (!isPayonusPayoutReady()) {
    return { ok: false, errorMessage: 'Payonus payout is not configured' };
  }
  const url = joinPayonusUrl(payonusNubanConfig.baseUrl, payonusNubanConfig.payoutNameEnquiryPath);
  const headers = await buildRequestHeaders();
  const body: Record<string, unknown> = {
    institutionCode: params.bankCode,
    accountNumber: params.accountNumber,
    businessId: payonusNubanConfig.vaBusinessId || undefined,
    currency: (params.currency || 'NGN').toUpperCase()
  };
  if (!body.businessId) delete body.businessId;

  try {
    const res = await axios.post<unknown>(url, body, {
      headers,
      timeout: payonusNubanConfig.timeoutMs,
      validateStatus: () => true
    });
    // Response data may be the object directly or nested under `data` (the docs
    // show an extra wrapping brace); handle both.
    let node: unknown = res.data;
    const dataNode = getAtPath(res.data, 'data');
    if (dataNode && typeof dataNode === 'object') node = dataNode;
    const accountName = firstString(node, ['accountName', 'account_name', 'data.accountName']);
    const ok = res.status >= 200 && res.status < 300 && Boolean(accountName);
    if (!ok) {
      return {
        ok: false,
        errorMessage: describePayoutError(res.data, res.status, 'POST', payonusNubanConfig.payoutNameEnquiryPath),
        httpStatus: res.status
      };
    }
    return {
      ok: true,
      accountName,
      accountNumber: firstString(node, ['accountNumber', 'account_number']) || params.accountNumber,
      bankCode: firstString(node, ['bankCode', 'bank_code', 'institutionCode']) || params.bankCode,
      bankName: firstString(node, ['bankName', 'bank_name']),
      httpStatus: res.status
    };
  } catch (err) {
    const ax = err as AxiosError;
    const msg = ax.message || 'Payonus name enquiry failed';
    logger.error('Payonus name enquiry HTTP error', { message: msg, status: ax.response?.status });
    return { ok: false, errorMessage: msg, httpStatus: ax.response?.status };
  }
}

/** Parse PayOnUs `GET /api/v1/banks` payload into a sorted [{ code, name }] list. */
function extractBankList(payload: unknown): PayonusBank[] {
  let node: unknown = payload;
  const dataNode = getAtPath(payload, 'data');
  if (dataNode !== undefined && dataNode !== null) node = dataNode;

  const banks: PayonusBank[] = [];
  const seen = new Set<string>();

  const push = (code: unknown, name: unknown) => {
    const c = String(code ?? '').trim();
    const n = String(name ?? '').trim();
    if (!c || !n || seen.has(c)) return;
    seen.add(c);
    banks.push({ code: c, name: n });
  };

  if (Array.isArray(node)) {
    // Array form: either [{code,name}] objects or ["code":"name"]-style maps.
    for (const item of node) {
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        if ('code' in o || 'name' in o) {
          push(o.code ?? o.bankCode ?? o.institutionCode, o.name ?? o.bankName);
        } else {
          for (const [code, name] of Object.entries(o)) push(code, name);
        }
      }
    }
  } else if (node && typeof node === 'object') {
    // Object map form: { "<code>": "<BANK NAME>" }.
    for (const [code, name] of Object.entries(node as Record<string, unknown>)) push(code, name);
  }

  banks.sort((a, b) => a.name.localeCompare(b.name));
  return banks;
}

type BankListCacheEntry = { banks: PayonusBank[]; expiresAtMs: number };
const bankListCache = new Map<string, BankListCacheEntry>();

/**
 * Fetch the PayOnUs bank list (`GET /api/v1/banks`). The list is large and rarely
 * changes, so results are cached in-process for PAYONUS_BANK_LIST_CACHE_TTL_MS.
 * Pass `key` (e.g. `ZAR`) to fetch the EFT bank list.
 */
export async function fetchBanks(options?: { key?: string; forceRefresh?: boolean }): Promise<PayonusBankListResult> {
  if (!isPayonusPayoutReady()) {
    return { ok: false, banks: [], errorMessage: 'Payonus is not configured' };
  }

  const key = options?.key?.trim().toUpperCase() || 'DEFAULT';
  const now = Date.now();
  if (!options?.forceRefresh) {
    const cached = bankListCache.get(key);
    if (cached && cached.expiresAtMs > now) {
      return { ok: true, banks: cached.banks, cached: true };
    }
  }

  const path = options?.key ? `/api/v1/banks?key=${encodeURIComponent(options.key)}` : '/api/v1/banks';
  const url = joinPayonusUrl(payonusNubanConfig.baseUrl, path);
  const headers = await buildRequestHeaders();

  try {
    const res = await axios.get<unknown>(url, {
      headers,
      timeout: payonusNubanConfig.timeoutMs,
      validateStatus: () => true
    });

    if (res.status >= 200 && res.status < 300) {
      const banks = extractBankList(res.data);
      if (banks.length) {
        bankListCache.set(key, { banks, expiresAtMs: now + payonusNubanConfig.bankListCacheTtlMs });
        return { ok: true, banks, httpStatus: res.status };
      }
      return { ok: false, banks: [], errorMessage: 'PayOnUs returned an empty bank list', httpStatus: res.status };
    }

    return {
      ok: false,
      banks: [],
      errorMessage: readPayonusErrorMessage(res.data, res.status),
      httpStatus: res.status
    };
  } catch (err) {
    const ax = err as AxiosError;
    const msg = ax.message || 'Payonus bank list request failed';
    logger.error('Payonus bank list HTTP error', { message: msg, status: ax.response?.status });
    return { ok: false, banks: [], errorMessage: msg, httpStatus: ax.response?.status };
  }
}

const PLACEHOLDER_ONLY = /^\{\{\s*([a-zA-Z]+)\s*\}\}$/;
const PLACEHOLDER_GLOBAL = /\{\{\s*([a-zA-Z]+)\s*\}\}/g;

/**
 * Recursively render a payout body template. A string that is exactly one
 * placeholder is replaced with the typed value (so `"{{amount}}"` becomes a
 * number); placeholders embedded in a larger string are interpolated as text.
 */
function renderPayoutTemplate(node: unknown, values: Record<string, string | number>): unknown {
  if (typeof node === 'string') {
    const exact = node.match(PLACEHOLDER_ONLY);
    if (exact) {
      const key = exact[1];
      return key in values ? values[key] : node;
    }
    return node.replace(PLACEHOLDER_GLOBAL, (m, key: string) => (key in values ? String(values[key]) : m));
  }
  if (Array.isArray(node)) {
    return node.map((item) => renderPayoutTemplate(item, values));
  }
  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      out[k] = renderPayoutTemplate(v, values);
    }
    return out;
  }
  return node;
}

export async function initiateBankPayout(input: PayonusBankPayoutRequest): Promise<PayonusBankPayoutResult> {
  // PayOnUs requires a name enquiry before a bank transfer. Verify the account
  // first and use the bank-confirmed account name on the transfer for accuracy.
  let beneficiaryAccountName = input.destinationAccountName;
  if (payonusNubanConfig.payoutNameEnquiryEnabled) {
    const enquiry = await nameEnquiry({
      accountNumber: input.destinationAccountNumber,
      bankCode: input.destinationBankCode,
      currency: input.currency
    });
    if (!enquiry.ok) {
      return {
        ok: false,
        errorMessage: enquiry.errorMessage || 'Bank account verification (name enquiry) failed',
        httpStatus: enquiry.httpStatus
      };
    }
    if (enquiry.accountName) beneficiaryAccountName = enquiry.accountName;
  }

  // When an operator supplies PAYONUS_PAYOUT_BODY_JSON, render it verbatim so the
  // request body matches exactly what PayOnUs documents for the account.
  if (payonusNubanConfig.payoutBodyTemplate) {
    const rendered = renderPayoutTemplate(
      payonusNubanConfig.payoutBodyTemplate,
      { ...payoutTemplateValues(input), destinationAccountName: beneficiaryAccountName }
    ) as Record<string, unknown>;
    return postPayoutJson(
      payonusNubanConfig.payoutPath,
      mergeBody(rendered, payonusNubanConfig.payoutExtraBody)
    );
  }

  // Documented PayOnUs "Initiate Bank Transfer" body.
  const body: Record<string, unknown> = {
    amount: input.amount,
    beneficiaryAccountNumber: input.destinationAccountNumber,
    beneficiaryAccountName,
    beneficiaryBankCode: input.destinationBankCode,
    reference: input.reference,
    transferType: payonusNubanConfig.payoutTransferType,
    countryCode: input.countryCode || payonusNubanConfig.payoutCountryCode,
    currency: input.currency,
    email: resolvePayoutEmail(input),
    businessId: payonusNubanConfig.vaBusinessId || undefined,
    narration: input.narration || 'Wallet payout'
  };
  const notificationUrl = payonusNubanConfig.payoutNotificationUrl.trim();
  if (notificationUrl) body.notificationUrl = notificationUrl;
  if (!body.businessId) delete body.businessId;

  return postPayoutJson(payonusNubanConfig.payoutPath, mergeBody(body, payonusNubanConfig.payoutExtraBody));
}

export async function createStaticMerchantNuban(wallet: MerchantWallet): Promise<PayonusNubanCallResult> {
  let body: Record<string, unknown>;
  if (pathUsesDocumentedVirtualAccountCreate(payonusNubanConfig.merchantPath)) {
    try {
      body = await buildVirtualAccountCreateBody(
        wallet.appName ? `${wallet.appName} - ${wallet.merchantWalletType}` : wallet.name,
        `mw-${wallet.merchantId}-${wallet.merchantWalletType}-${wallet.id}`,
        `${wallet.merchantId}-${wallet.merchantWalletType}-${wallet.id}`,
        complianceShareholderOwnerUserId(wallet)
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Invalid virtual account body';
      return { ok: false, details: {}, errorMessage: msg };
    }
  } else {
    body = {
      reference: wallet.id,
      client_reference: wallet.id,
      wallet_id: wallet.id,
      merchant_id: wallet.merchantId,
      account_name: wallet.name,
      account_type: 'static',
      currency: wallet.currency,
      merchant_wallet_type: wallet.merchantWalletType
    };
    if (wallet.appId) {
      body.app_id = wallet.appId;
    }
    if (wallet.payonusSubaccountCode) {
      body.subaccount = wallet.payonusSubaccountCode;
    }
  }
  body = mergeBody(body, payonusNubanConfig.merchantExtraBody);
  return postJson(payonusNubanConfig.merchantPath, body);
}

export async function createReservedUserNuban(wallet: UserWallet): Promise<PayonusNubanCallResult> {
  let body: Record<string, unknown>;
  if (pathUsesDocumentedVirtualAccountCreate(payonusNubanConfig.userPath)) {
    try {
      const bvn = await resolveBvnForUserWallet(wallet);
      body = await buildVirtualAccountCreateBody(
        wallet.name,
        `uw-${wallet.userId}-${wallet.id}`,
        `${wallet.userId}-${wallet.id}`,
        complianceShareholderOwnerUserId(wallet),
        { bvn }
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Invalid virtual account body';
      return { ok: false, details: {}, errorMessage: msg };
    }
  } else {
    body = {
      reference: wallet.id,
      client_reference: wallet.id,
      wallet_id: wallet.id,
      merchant_id: wallet.merchantId,
      user_id: wallet.userId,
      account_name: wallet.name,
      account_type: 'reserved',
      currency: wallet.currency
    };
  }
  body = mergeBody(body, payonusNubanConfig.userExtraBody);
  return postJson(payonusNubanConfig.userPath, body);
}

function buildDynamicMerchantVirtualAccountCreateBody(
  wallet: MerchantWallet,
  reference: string,
  idForEmail: string
): Record<string, unknown> {
  const businessId = payonusNubanConfig.vaBusinessId.trim();
  if (!businessId) {
    throw new Error('PayOnUs dynamic virtual account create requires PAYONUS_VA_BUSINESS_ID.');
  }

  const customer = {
    name: wallet.appName ? `${wallet.appName} - ${wallet.merchantWalletType}` : wallet.name,
    phone: resolvePhone(idForEmail),
    email: buildVirtualAccountEmail(idForEmail),
    address: {
      line1: payonusNubanConfig.vaAddressLine1,
      line2: 'string',
      city: payonusNubanConfig.vaAddressCity,
      state: payonusNubanConfig.vaAddressState,
      postalCode: payonusNubanConfig.vaAddressPostalCode,
      countryCode: payonusNubanConfig.vaAddressCountryCode
    },
    nin: payonusNubanConfig.vaNin
  };

  const callbackUrl = payonusNubanConfig.vaCallbackUrl.trim();
  const notificationUrl = payonusNubanConfig.vaNotificationUrl.trim();

  const body: Record<string, unknown> = {
    amount: payonusNubanConfig.vaDynamicAmount,
    customer,
    reference,
    callbackUrl: callbackUrl || notificationUrl || 'https://example.com/callback',
    notificationUrl: notificationUrl || undefined,
    narration: payonusNubanConfig.vaDynamicNarration,
    businessId
  };

  if (!notificationUrl) delete body.notificationUrl;
  return body;
}

export async function createDynamicMerchantNuban(wallet: MerchantWallet): Promise<PayonusNubanCallResult> {
  const reference = `mw-${wallet.merchantId}-${wallet.merchantWalletType}-${wallet.id}`;
  const idForEmail = `${wallet.merchantId}-${wallet.merchantWalletType}-${wallet.id}`;

  try {
    const body = buildDynamicMerchantVirtualAccountCreateBody(wallet, reference, idForEmail);
    return postJson('/api/v1/virtual-accounts/dynamic', body);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid dynamic virtual account body';
    return { ok: false, details: {}, errorMessage: msg };
  }
}
