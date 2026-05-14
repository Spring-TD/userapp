import axios, { AxiosError } from 'axios';
import { payonusNubanConfig, isPayonusNubanReady, type PayonusAuthMode } from '../config/payonusNuban';
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
  shareholderOwnerUserId: string
): Promise<Record<string, unknown>> {
  const businessId = payonusNubanConfig.vaBusinessId.trim();
  if (!businessId) {
    throw new Error('PayOnUs fixed-account create requires PAYONUS_VA_BUSINESS_ID.');
  }

  const dob = payonusNubanConfig.vaDob.trim();
  if (!dob) {
    throw new Error('PayOnUs fixed-account create requires PAYONUS_VA_DOB (YYYY-MM-DD).');
  }

  const bvn = await resolveBvn(shareholderOwnerUserId);
  if (!bvn) {
    throw new Error(
      'PayOnUs virtual account create requires an 11-digit BVN: add it to the first shareholder (by creation time) in compliance-ms under the merchant auth user id (JWT userId), set COMPLIANCE_SERVICE_URL + COMPLIANCE_WALLET_INTERNAL_TOKEN on wallet-ms, or set PAYONUS_VA_BVN, or PAYONUS_VA_USE_TEST_PLACEHOLDERS=true for sandbox.'
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

    // If oauth token expired/invalid mid-flight, refresh once and retry.
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

function mergeBody(
  base: Record<string, unknown>,
  extra?: Record<string, unknown>
): Record<string, unknown> {
  if (!extra) return { ...base };
  return { ...base, ...extra };
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
      body = await buildVirtualAccountCreateBody(
        wallet.name,
        `uw-${wallet.userId}-${wallet.id}`,
        `${wallet.userId}-${wallet.id}`,
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
    name: wallet.appName ? `${wallet.appName}` : wallet.name,
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

  // Strip undefined optional fields to keep request clean.
  if (!notificationUrl) delete body.notificationUrl;
  return body;
}

export async function createDynamicMerchantNuban(wallet: MerchantWallet): Promise<PayonusNubanCallResult> {
  const reference = `mw-${wallet.merchantId}-${wallet.merchantWalletType}-${wallet.id}`;
  const idForEmail = `${wallet.merchantId}-${wallet.merchantWalletType}-${wallet.id}`;

  try {
    const body = buildDynamicMerchantVirtualAccountCreateBody(wallet, reference, idForEmail);
    // Dynamic endpoint is documented as: POST /api/v1/virtual-accounts/dynamic
    // and returns a fixed account number per request (even for repeated customers).
    return postJson('/api/v1/virtual-accounts/dynamic', body);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid dynamic virtual account body';
    return { ok: false, details: {}, errorMessage: msg };
  }
}
