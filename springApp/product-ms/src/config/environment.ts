import dotenv from 'dotenv';

dotenv.config();

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Full Plata product catalog is exposed on account-ms: GET /api/v1/products (merchant gateway auth).
 * Prefer PLATA_ACCOUNT_SERVICE_URL, then SERVER_PRODUCT_SERVICE_URL.
 * If Plata API keys are set but no URL, default to Plata production account-ms so Fly secrets work without a separate URL.
 */
function resolveUpstreamProductCatalogBaseUrl(): string {
  const explicit =
    trimTrailingSlash(process.env.PLATA_ACCOUNT_SERVICE_URL || '') ||
    trimTrailingSlash(process.env.SERVER_PRODUCT_SERVICE_URL || '');
  if (explicit) {
    return explicit;
  }
  const hasPlataKeys =
    (process.env.PLATA_PUBLIC_KEY || '').trim() && (process.env.PLATA_SECRET_KEY || '').trim();
  if (hasPlataKeys) {
    return 'https://account-ms-plata.fly.dev';
  }
  return 'http://localhost:3005';
}

const upstreamProductCatalogBaseUrl = resolveUpstreamProductCatalogBaseUrl();
const loanWorkflowWebhookPath = '/api/v1/applications/webhooks/plata/loan-workflow';
const guarantorKycWebhookPath = '/api/v1/applications/webhooks/plata/guarantor-kyc';

/** Fly sets PORT; invalid values must not produce NaN (would crash listen()). */
function resolveListenPort(): number {
  const raw = process.env.PORT || '4005';
  const n = Number.parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 && n < 65536 ? n : 4005;
}

function resolveLoanWorkflowCallbackUrl(): string {
  const explicit = (process.env.LOAN_WORKFLOW_CALLBACK_URL || '').trim();
  if (explicit) {
    return explicit;
  }

  const publicBaseUrl = trimTrailingSlash(
    process.env.ACCOUNT_SERVICE_PUBLIC_URL ||
      process.env.ACCOUNT_MS_PUBLIC_URL ||
      process.env.PRODUCT_SERVICE_PUBLIC_URL ||
      process.env.PRODUCT_MS_PUBLIC_URL ||
      (process.env.NODE_ENV === 'production' ? 'https://account-ms.fly.dev' : 'http://localhost:4005')
  );

  return `${publicBaseUrl}${loanWorkflowWebhookPath}`;
}

function resolveGuarantorKycCallbackUrl(): string {
  const explicit = (process.env.GUARANTOR_KYC_CALLBACK_URL || '').trim();
  if (explicit) {
    return explicit;
  }

  const publicBaseUrl = trimTrailingSlash(
    process.env.ACCOUNT_SERVICE_PUBLIC_URL ||
      process.env.ACCOUNT_MS_PUBLIC_URL ||
      process.env.PRODUCT_SERVICE_PUBLIC_URL ||
      process.env.PRODUCT_MS_PUBLIC_URL ||
      (process.env.NODE_ENV === 'production' ? 'https://account-ms.fly.dev' : 'http://localhost:4005')
  );

  return `${publicBaseUrl}${guarantorKycWebhookPath}`;
}

interface EnvironmentConfig {
  port: number;
  nodeEnv: string;
  /** MongoDB connection (MONGODB_URI for DigitalOcean, DATABASE_URL for docker-compose) */
  mongoUri: string;
  corsOrigins: string[];
  logLevel: string;
  /** Same secret client-auth-ms uses to sign access tokens (for optional Bearer on this service). */
  jwtSecret: string;
  /** notifications-ms base URL (send-dual). */
  notificationsServiceUrl: string;
  /** client-auth-ms origin used for authenticated user profile enrichment. */
  clientAuthServiceUrl: string;
  /** Shared internal token accepted by client-auth-ms internal user lookup routes. */
  clientAuthInternalToken: string;
  /** Timeout for client-auth-ms user profile lookup requests. */
  clientAuthUserTimeoutMs: number;
  /**
   * Plata account-ms / gateway base URL from `PLATA_ACCOUNT_SERVICE_URL` (or fallbacks).
   * Use with `/api/v1/products`, `/api/v1/products/:id`, etc.
   */
  plataAccountServiceUrl: string;
  /**
   * @deprecated Use plataAccountServiceUrl — same value, kept for any external references.
   */
  serverProductServiceUrl: string;
  /** Merchant API keys used for upstream Plata requests */
  plataPublicKey: string;
  plataSecretKey: string;
  /** External-platform integrator merchant id sent as body.merchantId (defaults to apply merchantId). */
  plataIntegratorMerchantId: string;
  plataIntegratorMerchantName: string;
  /** Spring app id for integrator REPAYMENT principal-hold wallet (defaults to offering app). */
  plataIntegratorAppId: string;
  /** Plata client-auth-ms used to resolve upstream product creator personal names. */
  plataClientAuthServiceUrl: string;
  /** Plata compliance-ms used to resolve upstream product creator business names. */
  plataComplianceServiceUrl: string;
  /** Internal token for Plata client-auth internal routes (falls back to CLIENT_AUTH_INTERNAL_TOKEN). */
  plataClientAuthInternalToken: string;
  /** wallet-ms origin for product application wallet provisioning */
  walletServiceUrl: string;
  /** Shared internal token expected by wallet-ms */
  walletInternalToken: string;
  /** compliance-ms origin for guarantor hosted KYC link creation */
  complianceServiceUrl: string;
  /** Service auth token accepted by compliance-ms serviceAuth middleware */
  complianceServiceToken: string;
  /** Shared internal token accepted by compliance-ms BVN lookup endpoints. */
  complianceWalletInternalToken: string;
  /** Timeout for compliance-ms BVN lookup requests. */
  complianceBvnTimeoutMs: number;
  /**
   * Product-creator merchant IDs that must NOT get last-3 BVN randomization on upstream
   * account init (BankOne / Charis and any future FI rails that require the real BVN).
   * Comma-separated. Default includes Charis Plata merchantId.
   */
  upstreamBvnMutationSkipMerchantIds: string[];
  walletServiceHttpTimeoutMs: number;
  /** create-app-ms origin used for canonical transaction stats */
  createAppServiceUrl: string;
  /** Max request body size for JSON (e.g. '10mb') */
  requestBodyLimit: string;
  /** Public URL Plata calls when upstream loan workflow status changes. */
  loanWorkflowCallbackUrl: string;
  /** Public URL Plata calls when upstream guarantor KYC completes. */
  guarantorKycCallbackUrl: string;
  /** Optional shared secret for verifying X-Plata-Signature webhook HMACs. */
  plataLoanWorkflowWebhookSecret: string;
  /** Public Backend-platter product-ms URL (guarantor report links). */
  plataProductServicePublicUrl: string;
  /** Shared JWT_SECRET for Backend-platter product-ms internal routes (X-Internal-Token). */
  plataProductInternalToken: string;
  /** When true, periodically reconcile local product clones against Plata. */
  productCatalogSyncEnabled: boolean;
  /** Interval for catalog reconciliation (ms). Default 15 minutes. */
  productCatalogSyncIntervalMs: number;
}

function resolveProductCatalogSyncEnabled(): boolean {
  const raw = (process.env.PRODUCT_CATALOG_SYNC_ENABLED || '').trim().toLowerCase();
  if (raw === 'false' || raw === '0' || raw === 'off') return false;
  if (raw === 'true' || raw === '1' || raw === 'on') return true;
  return process.env.NODE_ENV === 'production';
}

function resolveProductCatalogSyncIntervalMs(): number {
  const parsed = parseInt(process.env.PRODUCT_CATALOG_SYNC_INTERVAL_MS || '900000', 10);
  return Number.isFinite(parsed) && parsed >= 60_000 ? parsed : 900_000;
}

export const config: EnvironmentConfig = {
  port: resolveListenPort(),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/product_ms',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:4001'],
  logLevel: process.env.LOG_LEVEL || 'info',
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-key-for-development-purposes-only',
  notificationsServiceUrl:
    process.env.NOTIFICATIONS_SERVICE_URL ||
    (process.env.NODE_ENV === 'production' ? 'https://springtd-notifications-ms.fly.dev' : 'http://localhost:4009'),
  clientAuthServiceUrl:
    (process.env.CLIENT_AUTH_SERVICE_URL || '').replace(/\/+$/, '') ||
    (process.env.NODE_ENV === 'production' ? 'https://client-auth-ms.fly.dev' : 'http://localhost:4001'),
  clientAuthInternalToken: (process.env.CLIENT_AUTH_INTERNAL_TOKEN || '').trim(),
  clientAuthUserTimeoutMs: Math.max(1000, parseInt(process.env.CLIENT_AUTH_USER_TIMEOUT_MS || '10000', 10)),
  plataAccountServiceUrl: upstreamProductCatalogBaseUrl,
  serverProductServiceUrl: upstreamProductCatalogBaseUrl,
  plataPublicKey: process.env.PLATA_PUBLIC_KEY || '',
  plataSecretKey: process.env.PLATA_SECRET_KEY || '',
  plataIntegratorMerchantId: (process.env.PLATA_INTEGRATOR_MERCHANT_ID || '').trim(),
  plataIntegratorMerchantName: (process.env.PLATA_INTEGRATOR_MERCHANT_NAME || '').trim(),
  plataIntegratorAppId: (process.env.PLATA_INTEGRATOR_APP_ID || '').trim(),
  plataClientAuthServiceUrl: trimTrailingSlash(
    process.env.PLATA_CLIENT_AUTH_SERVICE_URL ||
      (process.env.NODE_ENV === 'production' ? 'https://client-auth-ms-plata.fly.dev' : '')
  ),
  plataComplianceServiceUrl: trimTrailingSlash(
    process.env.PLATA_COMPLIANCE_SERVICE_URL ||
      (process.env.NODE_ENV === 'production' ? 'https://compliance-ms-plata.fly.dev' : '')
  ),
  plataClientAuthInternalToken: (
    process.env.PLATA_CLIENT_AUTH_INTERNAL_TOKEN ||
    process.env.CLIENT_AUTH_INTERNAL_TOKEN ||
    ''
  ).trim(),
  walletServiceUrl: process.env.WALLET_SERVICE_URL || 'http://localhost:4004',
  walletInternalToken: (process.env.WALLET_INTERNAL_TOKEN || '').trim(),
  complianceServiceUrl:
    (process.env.COMPLIANCE_SERVICE_URL || '').replace(/\/+$/, '') ||
    (process.env.NODE_ENV === 'production' ? 'https://compliance-ms.fly.dev' : 'http://localhost:4003'),
  complianceServiceToken: (process.env.COMPLIANCE_SERVICE_TOKEN || 'sams_account_service_token').trim(),
  complianceWalletInternalToken: (process.env.COMPLIANCE_WALLET_INTERNAL_TOKEN || '').trim(),
  complianceBvnTimeoutMs: Math.max(1000, parseInt(process.env.COMPLIANCE_BVN_TIMEOUT_MS || '10000', 10)),
  upstreamBvnMutationSkipMerchantIds: (
    process.env.UPSTREAM_BVN_MUTATION_SKIP_MERCHANT_IDS || 'merchant_1786008898151_5791w97s6'
  )
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),
  walletServiceHttpTimeoutMs: parseInt(process.env.WALLET_SERVICE_HTTP_TIMEOUT_MS || '15000', 10),
  createAppServiceUrl: process.env.CREATE_APP_SERVICE_URL || 'http://localhost:3002',
  requestBodyLimit: process.env.REQUEST_BODY_LIMIT || '10mb',
  loanWorkflowCallbackUrl: resolveLoanWorkflowCallbackUrl(),
  guarantorKycCallbackUrl: resolveGuarantorKycCallbackUrl(),
  plataLoanWorkflowWebhookSecret: (process.env.PLATA_LOAN_WORKFLOW_WEBHOOK_SECRET || '').trim(),
  plataProductServicePublicUrl: trimTrailingSlash(
    process.env.PLATA_PRODUCT_SERVICE_PUBLIC_URL ||
      process.env.PRODUCT_MS_PLATA_PUBLIC_URL ||
      (process.env.NODE_ENV === 'production' ? 'https://product-ms-plata.fly.dev' : 'http://localhost:3005')
  ),
  plataProductInternalToken: (
    process.env.PLATA_PRODUCT_INTERNAL_TOKEN ||
    process.env.JWT_SECRET ||
    ''
  ).trim(),
  productCatalogSyncEnabled: resolveProductCatalogSyncEnabled(),
  productCatalogSyncIntervalMs: resolveProductCatalogSyncIntervalMs(),
};