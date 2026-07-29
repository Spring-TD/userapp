function truthyEnv(v?: string): boolean {
  if (!v) return false;
  const s = v.trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes';
}

function parseJsonObjectEnv(name: string): Record<string, unknown> | undefined {
  const raw = process.env[name];
  if (!raw?.trim()) return undefined;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore invalid JSON
  }
  return undefined;
}

function stripSurroundingQuotes(s: string): string {
  const t = s.trim();
  if (t.length >= 2) {
    const a = t[0];
    const b = t[t.length - 1];
    if ((a === '"' && b === '"') || (a === "'" && b === "'")) {
      return t.slice(1, -1).trim();
    }
  }
  return t;
}

function parsePathList(envName: string, fallback: string[]): string[] {
  const raw = process.env[envName];
  if (!raw?.trim()) return fallback;
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export type PayonusAuthMode = 'bearer' | 'api-key' | 'basic' | 'oauth';

export const payonusNubanConfig = {
  enabled: truthyEnv(process.env.PAYONUS_NUBAN_ENABLED),
  /** Base URL for virtual-account / NUBAN HTTP calls (no trailing slash). */
  baseUrl: (process.env.PAYONUS_BASE_URL || '').replace(/\/$/, ''),
  /**
   * Optional override for OAuth token host when it differs from PAYONUS_BASE_URL
   * (e.g. virtual accounts on `https://api-sandbox.payonus.com/v1` but tokens on `https://core-sandbox.payonus.com`).
   */
  oauthBaseUrl: (process.env.PAYONUS_OAUTH_BASE_URL || '').replace(/\/$/, ''),
  /** Primary secret / token (Bearer, Basic user, or api-key value) */
  apiKey: process.env.PAYONUS_API_KEY || process.env.PAYONUS_SECRET_KEY || '',
  /** Optional second credential for Basic auth (password) */
  apiSecret: process.env.PAYONUS_API_SECRET || '',
  /** OAuth client id used for /api/v1/access-token in oauth mode */
  oauthClientId: process.env.PAYONUS_CLIENT_ID || process.env.PAYONUS_API_KEY || process.env.PAYONUS_SECRET_KEY || '',
  /** OAuth client secret used for /api/v1/access-token in oauth mode */
  oauthClientSecret:
    process.env.PAYONUS_CLIENT_SECRET || process.env.PAYONUS_API_SECRET || process.env.PAYONUS_API_KEY || '',
  oauthTokenPath: process.env.PAYONUS_TOKEN_PATH || '/api/v1/access-token',
  authMode: (process.env.PAYONUS_AUTH_MODE || 'bearer').toLowerCase() as PayonusAuthMode,
  apiKeyHeaderName: process.env.PAYONUS_API_KEY_HEADER || 'x-api-key',
  /**
   * Documented virtual account create path in current PayOnUs API:
   * POST /api/v1/virtual-accounts/fixed-account
   */
  merchantPath: process.env.PAYONUS_MERCHANT_NUBAN_PATH || '/api/v1/virtual-accounts/fixed-account',
  userPath: process.env.PAYONUS_USER_NUBAN_PATH || '/api/v1/virtual-accounts/fixed-account',
  /**
   * Bank transfer (payout) endpoint — PayOnUs "Initiate Bank Transfer".
   * Docs: POST /api/v1/transfer-requests/bank-transfer
   */
  payoutPath: process.env.PAYONUS_PAYOUT_PATH || '/api/v1/transfer-requests/bank-transfer',
  /**
   * Name-enquiry endpoint — verifies the beneficiary account before transfer.
   * Docs: POST /api/v1/transfer-requests/name-enquiry
   */
  payoutNameEnquiryPath: process.env.PAYONUS_NAME_ENQUIRY_PATH || '/api/v1/transfer-requests/name-enquiry',
  /** PayOnUs requires name enquiry before a transfer; set false only to bypass for testing. */
  payoutNameEnquiryEnabled: process.env.PAYONUS_NAME_ENQUIRY_ENABLED
    ? truthyEnv(process.env.PAYONUS_NAME_ENQUIRY_ENABLED)
    : true,
  /** transferType for bank payouts. Default WALLET_TO_BANK_ACCOUNT. */
  payoutTransferType: process.env.PAYONUS_PAYOUT_TRANSFER_TYPE || 'WALLET_TO_BANK_ACCOUNT',
  /** countryCode for payouts. Default NG. */
  payoutCountryCode: process.env.PAYONUS_PAYOUT_COUNTRY_CODE || 'NG',
  /** PayOnUs bank-transfer body requires an email; used when the caller has none. */
  payoutDefaultEmail: process.env.PAYONUS_PAYOUT_DEFAULT_EMAIL || '',
  /** Optional notificationUrl included on the transfer request (defaults to the VA notification URL). */
  payoutNotificationUrl: process.env.PAYONUS_PAYOUT_NOTIFICATION_URL || process.env.PAYONUS_VA_NOTIFICATION_URL || '',
  /** HTTP method for the payout call (some providers use PUT). Default POST. */
  payoutMethod: (process.env.PAYONUS_PAYOUT_METHOD || 'POST').toUpperCase(),
  /**
   * Optional request-body template for the payout call, as a JSON object. When set,
   * it fully REPLACES the built-in body shape, letting operators match the exact
   * schema PayOnUs documents for their account without a code change. Placeholders
   * (in string values) are substituted at call time:
   *   {{amount}} {{currency}} {{reference}} {{narration}}
   *   {{sourceAccountNumber}} {{destinationAccountNumber}}
   *   {{destinationBankCode}} {{destinationAccountName}} {{businessId}}
   * A string that is EXACTLY one placeholder (e.g. "{{amount}}") is replaced with the
   * typed value (number for amount); placeholders embedded in larger strings interpolate
   * as text. Example:
   *   PAYONUS_PAYOUT_BODY_JSON={"amount":"{{amount}}","currency":"{{currency}}",
   *     "accountNumber":"{{destinationAccountNumber}}","bankCode":"{{destinationBankCode}}",
   *     "accountName":"{{destinationAccountName}}","reference":"{{reference}}",
   *     "narration":"{{narration}}","businessId":"{{businessId}}"}
   */
  payoutBodyTemplate: parseJsonObjectEnv('PAYONUS_PAYOUT_BODY_JSON'),
  timeoutMs: Math.max(1000, parseInt(process.env.PAYONUS_TIMEOUT_MS || '30000', 10)),
  /** In-process cache TTL for the PayOnUs bank list (default 6 hours). */
  bankListCacheTtlMs: Math.max(0, parseInt(process.env.PAYONUS_BANK_LIST_CACHE_TTL_MS || '21600000', 10)),
  /** Only wallets in these ISO currencies trigger provisioning (default NGN). */
  currencies: (process.env.PAYONUS_NUBAN_CURRENCIES || 'NGN')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean),
  merchantExtraBody: parseJsonObjectEnv('PAYONUS_MERCHANT_EXTRA_JSON'),
  userExtraBody: parseJsonObjectEnv('PAYONUS_USER_EXTRA_JSON'),
  payoutExtraBody: parseJsonObjectEnv('PAYONUS_PAYOUT_EXTRA_JSON'),
  /** Defaults for documented virtual account create body (BVN, phone, email domain, etc.) */
  vaEmailDomain: process.env.PAYONUS_VA_EMAIL_DOMAIN || 'wallet.local',
  vaBvn: process.env.PAYONUS_VA_BVN || '',
  vaPhonePrefix: process.env.PAYONUS_VA_PHONE_PREFIX || '080',
  vaDob: process.env.PAYONUS_VA_DOB || '1990-01-01',
  vaBusinessId: process.env.PAYONUS_VA_BUSINESS_ID || '',
  vaNotificationUrl: process.env.PAYONUS_VA_NOTIFICATION_URL || '',
  vaAddressLine1: process.env.PAYONUS_VA_ADDRESS_LINE1 || 'Address line 1',
  vaAddressCity: process.env.PAYONUS_VA_ADDRESS_CITY || 'Lagos',
  vaAddressState: process.env.PAYONUS_VA_ADDRESS_STATE || 'Lagos',
  vaAddressPostalCode: process.env.PAYONUS_VA_ADDRESS_POSTAL_CODE || '100001',
  vaAddressCountryCode: process.env.PAYONUS_VA_ADDRESS_COUNTRY_CODE || 'NG',
  vaPreferredBank: process.env.PAYONUS_VA_PREFERRED_BANK || '',
  vaUseTestPlaceholders: truthyEnv(process.env.PAYONUS_VA_USE_TEST_PLACEHOLDERS),
  // Dynamic virtual-account defaults.
  vaNin: process.env.PAYONUS_VA_NIN || '00000000000000',
  vaDynamicAmount: Number(process.env.PAYONUS_VA_DYNAMIC_AMOUNT || '100'),
  vaCallbackUrl: process.env.PAYONUS_VA_CALLBACK_URL || process.env.PAYONUS_VA_NOTIFICATION_URL || '',
  vaDynamicNarration: process.env.PAYONUS_VA_DYNAMIC_NARRATION || 'Test dynamic VA',
  /** compliance-ms base URL (no trailing slash); used to load first-shareholder BVN for Payonus VA create */
  complianceServiceUrl: stripSurroundingQuotes((process.env.COMPLIANCE_SERVICE_URL || '').replace(/\/$/, '')),
  /** Same value as compliance-ms COMPLIANCE_WALLET_INTERNAL_TOKEN; sent as X-Internal-Token */
  complianceWalletInternalToken: stripSurroundingQuotes((process.env.COMPLIANCE_WALLET_INTERNAL_TOKEN || '').trim()),
  complianceBvnTimeoutMs: Math.max(1000, parseInt(process.env.COMPLIANCE_BVN_TIMEOUT_MS || '10000', 10)),
  accountNumberPaths: parsePathList('PAYONUS_RESPONSE_ACCOUNT_NUMBER_PATHS', [
    'data.attributes.accountNumber',
    'data.accountNumber',
    'data.account_number',
    'account_number',
    'accountNumber',
    'nuban',
    'data.nuban',
    'virtual_account.account_number',
    'virtualAccount.accountNumber',
    'data.virtual_account.account_number',
    'data.virtualAccount.accountNumber'
  ]),
  bankNamePaths: parsePathList('PAYONUS_RESPONSE_BANK_NAME_PATHS', [
    'data.attributes.bank.name',
    'data.bank.name',
    'data.bankName',
    'bank_name',
    'bankName',
    'virtual_account.bank_name',
    'virtualAccount.bankName',
    'data.virtual_account.bank_name'
  ]),
  bankCodePaths: parsePathList('PAYONUS_RESPONSE_BANK_CODE_PATHS', [
    'data.attributes.bank.nipCode',
    'data.bank.nipCode',
    'data.bankCode',
    'bank_code',
    'bankCode',
    'nip_code',
    'nipCode'
  ]),
  providerReferencePaths: parsePathList('PAYONUS_RESPONSE_PROVIDER_REFERENCE_PATHS', [
    'data.id',
    'data.data.id',
    'id',
    'reference',
    'data.reference',
    'virtual_account_id',
    'data.virtual_account_id'
  ]),
  payoutReferencePaths: parsePathList('PAYONUS_PAYOUT_RESPONSE_REFERENCE_PATHS', [
    'data.onusReference',
    'onusReference',
    'data.id',
    'data.reference',
    'data.merchantReference',
    'merchantReference',
    'data.transactionReference',
    'data.transaction_reference',
    'data.transferReference',
    'data.transfer_reference',
    'id',
    'reference',
    'transactionReference',
    'transaction_reference',
    'transferReference',
    'transfer_reference'
  ]),
  payoutStatusPaths: parsePathList('PAYONUS_PAYOUT_RESPONSE_STATUS_PATHS', [
    'data.status',
    'data.paymentStatus',
    'data.payment_status',
    'status',
    'paymentStatus',
    'payment_status'
  ])
};

export function isPayonusNubanReady(): boolean {
  const { enabled, baseUrl, apiKey, authMode, oauthClientId, oauthClientSecret } = payonusNubanConfig;
  if (!enabled || !baseUrl) return false;
  if (authMode === 'oauth') {
    return Boolean(oauthClientId) && Boolean(oauthClientSecret);
  }
  return Boolean(apiKey);
}

export const isPayonusPayoutReady = isPayonusNubanReady;
