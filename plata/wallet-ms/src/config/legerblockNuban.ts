function truthyEnv(v?: string): boolean {
  if (!v) return false;
  const s = v.trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes';
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

export type NubanProviderId = 'payonus' | 'legerblock';

/**
 * Default provider for *new* NUBAN provisioning and rails (banks / name enquiry / payout).
 * Existing wallets keep their stored `nubanProvider` (or inferred payonus).
 */
export function resolveDefaultNubanProvider(): NubanProviderId {
  const raw = (process.env.NUBAN_PROVIDER_DEFAULT || 'payonus').trim().toLowerCase();
  return raw === 'legerblock' ? 'legerblock' : 'payonus';
}

export const legerblockNubanConfig = {
  enabled: truthyEnv(process.env.LEGERBLOCK_NUBAN_ENABLED || process.env.LEDGERBLOCK_NUBAN_ENABLED),
  /** Base URL (no trailing slash). Docs: https://block.fuspay.finance */
  baseUrl: (
    process.env.LEGERBLOCK_BASE_URL ||
    process.env.LEDGERBLOCK_BASEURL ||
    process.env.LEDGERBLOCK_BASE_URL ||
    'https://block.fuspay.finance'
  ).replace(/\/$/, ''),
  apiKey: stripSurroundingQuotes(
    process.env.LEGERBLOCK_API_KEY || process.env.LEDGERBLOCK_API_KEY || process.env.API_KEY || ''
  ),
  merchantRef: stripSurroundingQuotes(
    process.env.LEGERBLOCK_MERCHANT_REF ||
      process.env.LEDGERBLOCK_MERCHANT_REF ||
      process.env.X_MERCHANT_REF ||
      ''
  ),
  /**
   * Optional dedicated key for bank-list (docs show a separate bearer for that endpoint).
   * Falls back to LEGERBLOCK_API_KEY when unset.
   */
  bankListApiKey: stripSurroundingQuotes(
    process.env.LEGERBLOCK_BANK_LIST_API_KEY ||
      process.env.LEGERBLOCK_API_KEY ||
      process.env.LEDGERBLOCK_API_KEY ||
      process.env.API_KEY ||
      ''
  ),
  timeoutMs: Math.max(1000, parseInt(process.env.LEGERBLOCK_TIMEOUT_MS || '30000', 10)),
  currencies: (process.env.LEGERBLOCK_NUBAN_CURRENCIES || 'NGN')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean),
  /** Default KYC tier when creating a LegerBlock user. */
  kycTier: process.env.LEGERBLOCK_KYC_TIER || 'TIER_1',
  vaEmailDomain: process.env.LEGERBLOCK_VA_EMAIL_DOMAIN || 'wallet.local',
  vaBvn: process.env.LEGERBLOCK_VA_BVN || process.env.PAYONUS_VA_BVN || '',
  vaNin: process.env.LEGERBLOCK_VA_NIN || process.env.PAYONUS_VA_NIN || '',
  vaPhonePrefix: process.env.LEGERBLOCK_VA_PHONE_PREFIX || process.env.PAYONUS_VA_PHONE_PREFIX || '080',
  vaDob: process.env.LEGERBLOCK_VA_DOB || process.env.PAYONUS_VA_DOB || '1990-01-01',
  vaAddress: process.env.LEGERBLOCK_VA_ADDRESS || 'Address line 1, Lagos',
  vaUseTestPlaceholders: truthyEnv(
    process.env.LEGERBLOCK_VA_USE_TEST_PLACEHOLDERS || process.env.PAYONUS_VA_USE_TEST_PLACEHOLDERS
  ),
  /** Dynamic VA placeholder amount (merchant collections). */
  vaDynamicAmount: Number(process.env.LEGERBLOCK_VA_DYNAMIC_AMOUNT || process.env.PAYONUS_VA_DYNAMIC_AMOUNT || '100'),
  collectionNotificationUrl:
    process.env.LEGERBLOCK_COLLECTION_NOTIFICATION_URL ||
    process.env.LEGERBLOCK_VA_NOTIFICATION_URL ||
    '',
  payoutNotificationUrl:
    process.env.LEGERBLOCK_PAYOUT_NOTIFICATION_URL ||
    process.env.LEGERBLOCK_COLLECTION_NOTIFICATION_URL ||
    '',
  /**
   * Wallet PIN used to confirm payouts after initiate.
   * Required by LegerBlock confirm endpoint; store as a secrets-managed env value.
   */
  walletPin: stripSurroundingQuotes(process.env.LEGERBLOCK_WALLET_PIN || ''),
  bankListCacheTtlMs: Math.max(0, parseInt(process.env.LEGERBLOCK_BANK_LIST_CACHE_TTL_MS || '21600000', 10)),
  complianceServiceUrl: stripSurroundingQuotes((process.env.COMPLIANCE_SERVICE_URL || '').replace(/\/$/, '')),
  complianceWalletInternalToken: stripSurroundingQuotes((process.env.COMPLIANCE_WALLET_INTERNAL_TOKEN || '').trim()),
  complianceBvnTimeoutMs: Math.max(1000, parseInt(process.env.COMPLIANCE_BVN_TIMEOUT_MS || '10000', 10))
};

export function isLegerblockNubanReady(): boolean {
  const { enabled, baseUrl, apiKey, merchantRef } = legerblockNubanConfig;
  return Boolean(enabled && baseUrl && apiKey && merchantRef);
}

export const isLegerblockPayoutReady = isLegerblockNubanReady;
