import axios, { AxiosError } from 'axios';
import {
  isLegerblockNubanReady,
  isLegerblockPayoutReady,
  legerblockNubanConfig
} from '../config/legerblockNuban';
import { logger } from '../utils/logger';
import type { MerchantWallet, UserWallet } from '../models/Wallet';

export type LegerblockNubanExtracted = {
  accountNumber?: string;
  bankName?: string;
  bankCode?: string;
  providerReference?: string;
  userRef?: string;
  walletId?: string;
};

export type LegerblockNubanCallResult = {
  ok: boolean;
  details: LegerblockNubanExtracted;
  errorMessage?: string;
  httpStatus?: number;
};

export type LegerblockBank = { code: string; name: string };

export type LegerblockBankListResult = {
  ok: boolean;
  banks: LegerblockBank[];
  errorMessage?: string;
  httpStatus?: number;
  cached?: boolean;
};

export type LegerblockNameEnquiryResult = {
  ok: boolean;
  accountName?: string;
  accountNumber?: string;
  bankCode?: string;
  bankName?: string;
  errorMessage?: string;
  httpStatus?: number;
};

export type LegerblockBankPayoutRequest = {
  userRef: string;
  amount: number;
  currency: string;
  reference: string;
  destinationAccountNumber: string;
  destinationBankCode: string;
  destinationAccountName?: string;
  narration?: string;
};

export type LegerblockBankPayoutResult = {
  ok: boolean;
  providerReference?: string;
  providerStatus?: string;
  authToken?: string;
  raw?: unknown;
  errorMessage?: string;
  httpStatus?: number;
};

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${b}${p}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function firstString(node: unknown, keys: string[]): string | undefined {
  const root = asRecord(node);
  for (const key of keys) {
    const parts = key.split('.');
    let cur: unknown = root;
    for (const part of parts) {
      if (!cur || typeof cur !== 'object') {
        cur = undefined;
        break;
      }
      cur = (cur as Record<string, unknown>)[part];
    }
    if (typeof cur === 'string' && cur.trim()) return cur.trim();
    if (typeof cur === 'number' && Number.isFinite(cur)) return String(cur);
  }
  return undefined;
}

function readErrorMessage(payload: unknown, httpStatus: number): string {
  const root = asRecord(payload);
  const data = asRecord(root.data);
  for (const key of ['message', 'error', 'msg', 'description'] as const) {
    const v = data[key] ?? root[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return `LegerBlock HTTP ${httpStatus}`;
}

function authHeaders(apiKey = legerblockNubanConfig.apiKey): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'x-merchant-ref': legerblockNubanConfig.merchantRef,
    'Content-Type': 'application/json'
  };
}

async function postJson(path: string, body: Record<string, unknown>): Promise<{ status: number; data: unknown }> {
  const url = joinUrl(legerblockNubanConfig.baseUrl, path);
  const res = await axios.post<unknown>(url, body, {
    headers: authHeaders(),
    timeout: legerblockNubanConfig.timeoutMs,
    validateStatus: () => true
  });
  return { status: res.status, data: res.data };
}

async function getJson(
  path: string,
  apiKey = legerblockNubanConfig.apiKey
): Promise<{ status: number; data: unknown }> {
  const url = joinUrl(legerblockNubanConfig.baseUrl, path);
  const res = await axios.get<unknown>(url, {
    headers: authHeaders(apiKey),
    timeout: legerblockNubanConfig.timeoutMs,
    validateStatus: () => true
  });
  return { status: res.status, data: res.data };
}

function complianceShareholderOwnerUserId(wallet: MerchantWallet | UserWallet): string {
  const explicit = wallet.complianceShareholderUserId?.trim();
  if (explicit) return explicit;
  if (wallet.walletType === 'USER') {
    return (wallet.userId || wallet.merchantId).trim();
  }
  return wallet.merchantId.trim();
}

function buildEmail(localPart: string): string {
  const domain = legerblockNubanConfig.vaEmailDomain.replace(/^@/, '');
  const safeLocal = localPart.replace(/[^a-zA-Z0-9._+-]/g, '-');
  return `${safeLocal}@${domain}`;
}

function resolvePhone(suffix: string): string {
  const digits = suffix.replace(/\D/g, '').slice(-9) || '000000000';
  return `${legerblockNubanConfig.vaPhonePrefix}${digits}`.slice(0, 15);
}

async function fetchUserBvnFromCompliance(retailUserId: string): Promise<string | undefined> {
  const base = legerblockNubanConfig.complianceServiceUrl.trim();
  const token = legerblockNubanConfig.complianceWalletInternalToken;
  if (!base || !token) return undefined;

  const url = `${base}/api/v1/kyc/internal/payonus/user-bvn/${encodeURIComponent(retailUserId)}`;
  try {
    const res = await axios.get<unknown>(url, {
      headers: { 'X-Internal-Token': token },
      timeout: legerblockNubanConfig.complianceBvnTimeoutMs,
      validateStatus: () => true
    });
    if (res.status >= 200 && res.status < 300 && res.data && typeof res.data === 'object') {
      const o = res.data as Record<string, unknown>;
      if (o.success === true && typeof o.bvn === 'string') {
        const digits = o.bvn.replace(/\D/g, '');
        if (digits.length === 11) return digits;
      }
    }
  } catch (err) {
    logger.warn('LegerBlock: compliance user BVN request failed', {
      retailUserId,
      message: err instanceof Error ? err.message : String(err)
    });
  }
  return undefined;
}

async function fetchFirstShareholderBvn(ownerUserId: string): Promise<string | undefined> {
  const base = legerblockNubanConfig.complianceServiceUrl.trim();
  const token = legerblockNubanConfig.complianceWalletInternalToken;
  if (!base || !token) return undefined;

  const url = `${base}/api/v1/kyc/internal/payonus/first-shareholder-bvn/${encodeURIComponent(ownerUserId)}`;
  try {
    const res = await axios.get<unknown>(url, {
      headers: { 'X-Internal-Token': token },
      timeout: legerblockNubanConfig.complianceBvnTimeoutMs,
      validateStatus: () => true
    });
    if (res.status >= 200 && res.status < 300 && res.data && typeof res.data === 'object') {
      const o = res.data as Record<string, unknown>;
      if (o.success === true && typeof o.bvn === 'string') {
        const digits = o.bvn.replace(/\D/g, '');
        if (digits.length === 11) return digits;
      }
    }
  } catch (err) {
    logger.warn('LegerBlock: compliance shareholder BVN request failed', {
      ownerUserId,
      message: err instanceof Error ? err.message : String(err)
    });
  }
  return undefined;
}

async function resolveBvn(wallet: MerchantWallet | UserWallet): Promise<string> {
  if (wallet.walletType === 'USER') {
    const fromKyc = await fetchUserBvnFromCompliance(wallet.userId.trim());
    if (fromKyc) return fromKyc;
  }
  const fromShareholder = await fetchFirstShareholderBvn(complianceShareholderOwnerUserId(wallet));
  if (fromShareholder) return fromShareholder;

  const configured = legerblockNubanConfig.vaBvn.trim();
  if (configured) {
    const digitsOnly = configured.replace(/\D/g, '');
    return digitsOnly.length === 11 ? digitsOnly : configured;
  }
  if (legerblockNubanConfig.vaUseTestPlaceholders) return '00000000000';
  return '';
}

function walletDisplayName(wallet: MerchantWallet | UserWallet): string {
  if (wallet.walletType === 'MERCHANT' && wallet.appName) {
    return `${wallet.appName} - ${wallet.merchantWalletType}`;
  }
  return wallet.name;
}

function accountReferenceFor(wallet: MerchantWallet | UserWallet): string {
  if (wallet.walletType === 'MERCHANT') {
    return `mw-${wallet.merchantId}-${wallet.merchantWalletType}-${wallet.id}`.slice(0, 64);
  }
  return `uw-${wallet.userId}-${wallet.id}`.slice(0, 64);
}

/** Create (or reuse) a LegerBlock user and return user_ref. */
export async function createLegerblockUser(params: {
  userName: string;
  email: string;
  kycTier?: string;
}): Promise<{ ok: boolean; userRef?: string; errorMessage?: string; httpStatus?: number }> {
  if (!isLegerblockNubanReady()) {
    return { ok: false, errorMessage: 'LegerBlock is not configured' };
  }
  try {
    const res = await postJson('/api/v1/merchant/user', {
      user_name: params.userName,
      email: params.email,
      kyc_tier: params.kycTier || legerblockNubanConfig.kycTier
    });
    const userRef = firstString(res.data, ['data.user_ref', 'user_ref', 'data.userRef']);
    if (res.status >= 200 && res.status < 300 && userRef) {
      return { ok: true, userRef, httpStatus: res.status };
    }
    return { ok: false, errorMessage: readErrorMessage(res.data, res.status), httpStatus: res.status };
  } catch (err) {
    const ax = err as AxiosError;
    return { ok: false, errorMessage: ax.message || 'LegerBlock create user failed', httpStatus: ax.response?.status };
  }
}

/** Create an NGN subwallet for a LegerBlock user. */
export async function createLegerblockWallet(params: {
  userRef: string;
  currency?: string;
}): Promise<{ ok: boolean; walletId?: string; errorMessage?: string; httpStatus?: number }> {
  if (!isLegerblockNubanReady()) {
    return { ok: false, errorMessage: 'LegerBlock is not configured' };
  }
  try {
    const res = await postJson('/api/v1/user/subwallet', {
      user_ref: params.userRef,
      currency: (params.currency || 'NGN').toUpperCase(),
      chain: ''
    });
    const walletId = firstString(res.data, ['data.wallet_id', 'wallet_id', 'data.walletId']);
    if (res.status >= 200 && res.status < 300 && walletId) {
      return { ok: true, walletId, httpStatus: res.status };
    }
    return { ok: false, errorMessage: readErrorMessage(res.data, res.status), httpStatus: res.status };
  } catch (err) {
    const ax = err as AxiosError;
    return { ok: false, errorMessage: ax.message || 'LegerBlock create wallet failed', httpStatus: ax.response?.status };
  }
}

/** Assign a static NGN virtual account to a LegerBlock wallet. */
export async function assignStaticVirtualAccount(params: {
  userRef: string;
  walletId: string;
  currency: string;
  accountReference: string;
  userName: string;
  email: string;
  phone: string;
  bvn: string;
  address?: string;
  dob?: string;
}): Promise<LegerblockNubanCallResult> {
  if (!isLegerblockNubanReady()) {
    return { ok: false, details: {}, errorMessage: 'LegerBlock is not configured' };
  }
  try {
    const res = await postJson('/api/v1/static/account', {
      user_ref: params.userRef,
      wallet_id: params.walletId,
      fund_type: 'STATIC_VIRTUAL_ACCOUNT',
      chain: 'FIAT_ACCOUNT',
      currency: params.currency.toUpperCase(),
      account_reference: params.accountReference,
      user_kyc: {
        user_name: params.userName,
        email: params.email,
        address: params.address || legerblockNubanConfig.vaAddress,
        phone: params.phone,
        bvn: params.bvn,
        dob: params.dob || legerblockNubanConfig.vaDob
      }
    });

    const fiat = asRecord(asRecord(res.data).fiat_data);
    const data = asRecord(asRecord(res.data).data);
    const accountNumber =
      firstString(fiat, ['account_number', 'accountNumber']) ||
      firstString(data, ['account_number', 'accountNumber', 'pay_data.account_number']);
    const bankCode =
      firstString(fiat, ['bank_code', 'bankCode']) || firstString(data, ['bank_code', 'bankCode', 'pay_data.bank_code']);
    const bankName =
      firstString(fiat, ['bank_name', 'bankName']) || firstString(data, ['bank_name', 'bankName', 'pay_data.bank_name']);
    const providerReference =
      firstString(fiat, ['funding_source_id']) ||
      firstString(data, ['funding_source_id', 'payment_ref', 'providerReference']);

    if (res.status >= 200 && res.status < 300 && accountNumber) {
      return {
        ok: true,
        details: {
          accountNumber,
          bankCode: bankCode || undefined,
          bankName: bankName || (bankCode && !/^\d+$/.test(bankCode) ? bankCode : undefined),
          providerReference: providerReference || undefined,
          userRef: params.userRef,
          walletId: params.walletId
        },
        httpStatus: res.status
      };
    }

    return {
      ok: false,
      details: { userRef: params.userRef, walletId: params.walletId },
      errorMessage: readErrorMessage(res.data, res.status),
      httpStatus: res.status
    };
  } catch (err) {
    const ax = err as AxiosError;
    return {
      ok: false,
      details: {},
      errorMessage: ax.message || 'LegerBlock static VA failed',
      httpStatus: ax.response?.status
    };
  }
}

/**
 * Full retail/merchant static NUBAN provision:
 * create user → create NGN wallet → assign static VA.
 */
export async function provisionStaticNubanForWallet(
  wallet: MerchantWallet | UserWallet
): Promise<LegerblockNubanCallResult> {
  if (!isLegerblockNubanReady()) {
    return { ok: false, details: {}, errorMessage: 'LegerBlock is not configured' };
  }

  const currency = wallet.currency.toUpperCase();
  if (!legerblockNubanConfig.currencies.includes(currency)) {
    return { ok: false, details: {}, errorMessage: `Currency ${currency} is not enabled for LegerBlock` };
  }

  const bvn = await resolveBvn(wallet);
  if (!bvn) {
    return {
      ok: false,
      details: {},
      errorMessage:
        'LegerBlock static VA requires an 11-digit BVN (Fuspay KYC, shareholder BVN, LEGERBLOCK_VA_BVN, or LEGERBLOCK_VA_USE_TEST_PLACEHOLDERS=true).'
    };
  }

  const emailLocal =
    wallet.walletType === 'USER'
      ? `${wallet.userId}-${wallet.id}`
      : `${wallet.merchantId}-${wallet.merchantWalletType}-${wallet.id}`;
  const email = buildEmail(emailLocal);
  const userName = walletDisplayName(wallet);
  const phone = resolvePhone(emailLocal);

  const userResult = await createLegerblockUser({ userName, email });
  if (!userResult.ok || !userResult.userRef) {
    return {
      ok: false,
      details: {},
      errorMessage: userResult.errorMessage || 'Failed to create LegerBlock user',
      httpStatus: userResult.httpStatus
    };
  }

  const walletResult = await createLegerblockWallet({ userRef: userResult.userRef, currency });
  if (!walletResult.ok || !walletResult.walletId) {
    return {
      ok: false,
      details: { userRef: userResult.userRef },
      errorMessage: walletResult.errorMessage || 'Failed to create LegerBlock wallet',
      httpStatus: walletResult.httpStatus
    };
  }

  return assignStaticVirtualAccount({
    userRef: userResult.userRef,
    walletId: walletResult.walletId,
    currency,
    accountReference: accountReferenceFor(wallet),
    userName,
    email,
    phone,
    bvn
  });
}

/**
 * Merchant dynamic VA (one-off collection). Requires an existing LegerBlock user_ref
 * (create via provisionStatic or createLegerblockUser first).
 */
export async function createDynamicCollection(params: {
  userRef: string;
  amount: number;
  currency: string;
  txnMerchantRef: string;
  notificationUrl?: string;
}): Promise<LegerblockNubanCallResult> {
  if (!isLegerblockNubanReady()) {
    return { ok: false, details: {}, errorMessage: 'LegerBlock is not configured' };
  }
  const notificationUrl =
    params.notificationUrl?.trim() || legerblockNubanConfig.collectionNotificationUrl.trim();
  if (!notificationUrl) {
    return {
      ok: false,
      details: {},
      errorMessage: 'LEGERBLOCK_COLLECTION_NOTIFICATION_URL is required for dynamic VA'
    };
  }

  try {
    const res = await postJson('/api/v1/collection/subwallet', {
      user_ref: params.userRef,
      txn_merchant_ref: params.txnMerchantRef,
      amount: params.amount,
      currency: params.currency.toUpperCase(),
      chain: '',
      payment_method: 'DYNAMIC_VIRTUAL_ACCOUNT',
      pay_meta_data: {},
      notification_url: notificationUrl
    });
    const data = asRecord(asRecord(res.data).data);
    const payData = asRecord(data.pay_data);
    const accountNumber = firstString(payData, ['account_number', 'accountNumber']);
    if (res.status >= 200 && res.status < 300 && accountNumber) {
      return {
        ok: true,
        details: {
          accountNumber,
          bankCode: firstString(payData, ['bank_code', 'bankCode']),
          bankName: firstString(payData, ['bank_name', 'bankName']),
          providerReference: firstString(data, ['payment_ref', 'txn_merchant_ref']),
          userRef: params.userRef
        },
        httpStatus: res.status
      };
    }
    return {
      ok: false,
      details: { userRef: params.userRef },
      errorMessage: readErrorMessage(res.data, res.status),
      httpStatus: res.status
    };
  } catch (err) {
    const ax = err as AxiosError;
    return {
      ok: false,
      details: {},
      errorMessage: ax.message || 'LegerBlock dynamic VA failed',
      httpStatus: ax.response?.status
    };
  }
}

/** Merchant wallets: create user+wallet+static VA (persistent NUBAN), same as retail for dual-run simplicity. */
export async function createMerchantLegerblockNuban(wallet: MerchantWallet): Promise<LegerblockNubanCallResult> {
  return provisionStaticNubanForWallet(wallet);
}

export async function createUserLegerblockNuban(wallet: UserWallet): Promise<LegerblockNubanCallResult> {
  return provisionStaticNubanForWallet(wallet);
}

type BankListCacheEntry = { banks: LegerblockBank[]; expiresAtMs: number };
const bankListCache = new Map<string, BankListCacheEntry>();

export async function fetchLegerblockBanks(options?: {
  currency?: string;
  forceRefresh?: boolean;
}): Promise<LegerblockBankListResult> {
  if (!isLegerblockPayoutReady() && !legerblockNubanConfig.bankListApiKey) {
    return { ok: false, banks: [], errorMessage: 'LegerBlock is not configured' };
  }

  const currency = (options?.currency || 'NGN').toUpperCase();
  const now = Date.now();
  if (!options?.forceRefresh) {
    const cached = bankListCache.get(currency);
    if (cached && cached.expiresAtMs > now) {
      return { ok: true, banks: cached.banks, cached: true };
    }
  }

  try {
    const res = await getJson(
      `/api/v1/payout/bank-list?currency=${encodeURIComponent(currency)}`,
      legerblockNubanConfig.bankListApiKey || legerblockNubanConfig.apiKey
    );
    if (res.status < 200 || res.status >= 300) {
      return { ok: false, banks: [], errorMessage: readErrorMessage(res.data, res.status), httpStatus: res.status };
    }

    const root = asRecord(res.data);
    const list = Array.isArray(root.data) ? root.data : [];
    const banks: LegerblockBank[] = [];
    const seen = new Set<string>();
    for (const item of list) {
      const o = asRecord(item);
      const code = String(o.bank_code ?? o.bankCode ?? '').trim();
      const name = String(o.bank_name ?? o.bankName ?? '').trim();
      if (!code || !name || seen.has(code)) continue;
      seen.add(code);
      banks.push({ code, name });
    }
    banks.sort((a, b) => a.name.localeCompare(b.name));
    if (!banks.length) {
      return { ok: false, banks: [], errorMessage: 'LegerBlock returned an empty bank list', httpStatus: res.status };
    }
    bankListCache.set(currency, { banks, expiresAtMs: now + legerblockNubanConfig.bankListCacheTtlMs });
    return { ok: true, banks, httpStatus: res.status };
  } catch (err) {
    const ax = err as AxiosError;
    return {
      ok: false,
      banks: [],
      errorMessage: ax.message || 'LegerBlock bank list failed',
      httpStatus: ax.response?.status
    };
  }
}

export async function legerblockNameEnquiry(params: {
  accountNumber: string;
  bankCode: string;
  currency?: string;
}): Promise<LegerblockNameEnquiryResult> {
  if (!isLegerblockPayoutReady()) {
    return { ok: false, errorMessage: 'LegerBlock is not configured' };
  }
  try {
    const res = await postJson('/api/v1/payout/bank-list/verify', {
      bank_code: params.bankCode,
      account_number: params.accountNumber
    });
    const data = asRecord(asRecord(res.data).data);
    const accountName =
      firstString(data, ['account_name', 'accountName']) ||
      firstString(res.data, ['data.account_name', 'account_name']);
    if (res.status >= 200 && res.status < 300 && accountName) {
      return {
        ok: true,
        accountName,
        accountNumber: firstString(data, ['account_number', 'accountNumber']) || params.accountNumber,
        bankCode: firstString(data, ['bank_code', 'bankCode']) || params.bankCode,
        bankName: firstString(data, ['bank_name', 'bankName']),
        httpStatus: res.status
      };
    }
    return { ok: false, errorMessage: readErrorMessage(res.data, res.status), httpStatus: res.status };
  } catch (err) {
    const ax = err as AxiosError;
    return { ok: false, errorMessage: ax.message || 'LegerBlock name enquiry failed', httpStatus: ax.response?.status };
  }
}

/**
 * Initiate + confirm wallet-to-bank payout.
 * Confirm uses LEGERBLOCK_WALLET_PIN (merchant-operated PIN vault for phase 1).
 */
export async function initiateLegerblockBankPayout(
  input: LegerblockBankPayoutRequest
): Promise<LegerblockBankPayoutResult> {
  if (!isLegerblockPayoutReady()) {
    return { ok: false, errorMessage: 'LegerBlock is not configured' };
  }
  const pin = legerblockNubanConfig.walletPin;
  if (!pin) {
    return {
      ok: false,
      errorMessage: 'LEGERBLOCK_WALLET_PIN is required to confirm LegerBlock payouts'
    };
  }
  const notificationUrl = legerblockNubanConfig.payoutNotificationUrl.trim();
  if (!notificationUrl) {
    return { ok: false, errorMessage: 'LEGERBLOCK_PAYOUT_NOTIFICATION_URL is required' };
  }

  try {
    const initiated = await postJson('/api/v1/payout/wallet-bank', {
      user_ref: input.userRef,
      currency: input.currency.toUpperCase(),
      wallet_type: 'SUB_WALLET',
      txn_merchant_ref: input.reference,
      amount: input.amount,
      account_no: input.destinationAccountNumber,
      bank_code: input.destinationBankCode,
      meta_data: input.narration ? { narration: input.narration } : {},
      notification_url: notificationUrl
    });

    const initData = asRecord(asRecord(initiated.data).data);
    const authToken = firstString(initData, ['auth_token', 'authToken']);
    const paymentRef = firstString(initData, ['payment_ref', 'paymentRef']);
    if (initiated.status < 200 || initiated.status >= 300 || !authToken) {
      return {
        ok: false,
        raw: initiated.data,
        errorMessage: readErrorMessage(initiated.data, initiated.status),
        httpStatus: initiated.status
      };
    }

    const confirmed = await postJson('/api/v1/payout/wallet-bank/confirm', {
      user_ref: input.userRef,
      auth_token: authToken,
      wallet_pin: pin
    });
    const confirmData = asRecord(asRecord(confirmed.data).data);
    const status = firstString(confirmData, ['payment_status', 'paymentStatus', 'status']);
    if (confirmed.status >= 200 && confirmed.status < 300) {
      const terminal = (status || '').toUpperCase();
      if (terminal === 'FAILED' || terminal === 'REJECTED') {
        return {
          ok: false,
          providerReference: firstString(confirmData, ['payment_ref']) || paymentRef,
          providerStatus: status,
          raw: confirmed.data,
          errorMessage: `LegerBlock payout ${terminal}`,
          httpStatus: confirmed.status
        };
      }
      return {
        ok: true,
        providerReference: firstString(confirmData, ['payment_ref']) || paymentRef,
        providerStatus: status || 'PENDING',
        raw: confirmed.data,
        httpStatus: confirmed.status
      };
    }

    return {
      ok: false,
      providerReference: paymentRef,
      authToken,
      raw: confirmed.data,
      errorMessage: readErrorMessage(confirmed.data, confirmed.status),
      httpStatus: confirmed.status
    };
  } catch (err) {
    const ax = err as AxiosError;
    return { ok: false, errorMessage: ax.message || 'LegerBlock payout failed', httpStatus: ax.response?.status };
  }
}
