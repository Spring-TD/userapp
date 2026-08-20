import dotenv from 'dotenv';

dotenv.config();

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function envInt(name: string, fallback: number): number {
  const n = parseInt(process.env[name] || '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function envBool(name: string, fallback: boolean): boolean {
  const v = (process.env[name] || '').trim().toLowerCase();
  if (v === 'true' || v === '1' || v === 'yes') return true;
  if (v === 'false' || v === '0' || v === 'no') return false;
  return fallback;
}

/**
 * Plata account-ms gateway base URL (same pattern as product-ms catalog).
 * Prefer PLATA_ACCOUNT_SERVICE_URL; if Plata API keys are set but no URL, default to production gateway.
 */
function resolvePlataAccountServiceUrl(): string {
  const explicit = trimTrailingSlash(process.env.PLATA_ACCOUNT_SERVICE_URL || '');
  if (explicit) {
    return explicit;
  }
  const hasPlataKeys =
    (process.env.PLATA_PUBLIC_KEY || '').trim() && (process.env.PLATA_SECRET_KEY || '').trim();
  if (hasPlataKeys) {
    return 'https://account-ms-plata.fly.dev';
  }
  return '';
}

interface RateLimitConfig {
  enabled: boolean;
  windowMs: number;
  maxRequests: number;
  authMaxRequests: number;
}

interface EnvironmentConfig {
  port: number;
  nodeEnv: string;
  mongoUri: string;
  corsOrigins: string[];
  logLevel: string;
  rateLimit: RateLimitConfig;
  complianceServiceUrl: string;
  billingServiceUrl: string;
  walletServiceUrl: string;
  serviceAuthUrl: string;
  clientAuthServiceUrl: string;
  createAppServiceUrl: string;
  productServiceUrl: string;
  paymentServiceUrl: string;
  notificationServiceUrl: string;
  platformBaseDomain: string;
  platformSubdomainPrefix: string;
  reservedSubdomains: string[];
  /** Axios timeout for server-side GET .../apps/resolve/:subdomain (Fly auto-stop cold starts often exceed a few seconds). */
  tenantResolverTimeoutMs: number;
  /** Must match client-auth-ms JWT_SECRET for Bearer merchant tokens */
  jwtSecret: string;
  /** Plata account-ms gateway for integrator API key flows (commodity principal, catalog, etc.) */
  plataAccountServiceUrl: string;
  plataPublicKey: string;
  plataSecretKey: string;
  /** Plata service-auth-ms for verifying inbound integrator PLATA keys (applicant profile pulls). */
  plataServiceAuthUrl: string;
  /** X-Internal-Token for Plata service-auth-ms (must match service-auth-ms-plata JWT_SECRET). */
  plataServiceAuthInternalToken: string;
}

export const config: EnvironmentConfig = {
  port: parseInt(process.env.PORT || '4008', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/account_db',
  corsOrigins: process.env.CORS_ORIGINS?.split(',').map((value) => value.trim()).filter(Boolean) || [
    'http://localhost:3000'
  ],
  logLevel: process.env.LOG_LEVEL || 'info',
  rateLimit: {
    enabled: envBool('RATE_LIMIT_ENABLED', true),
    windowMs: envInt('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
    maxRequests: envInt('RATE_LIMIT_MAX_REQUESTS', 2000),
    authMaxRequests: envInt('AUTH_RATE_LIMIT_MAX_REQUESTS', 20),
  },
  complianceServiceUrl: process.env.COMPLIANCE_SERVICE_URL || 'http://localhost:4003',
  billingServiceUrl: process.env.BILLING_SERVICE_URL || 'http://localhost:4006',
  walletServiceUrl: process.env.WALLET_SERVICE_URL || 'http://localhost:4004',
  serviceAuthUrl: process.env.SERVICE_AUTH_URL || 'http://localhost:4000',
  clientAuthServiceUrl: process.env.CLIENT_AUTH_SERVICE_URL || 'http://localhost:4001',
  createAppServiceUrl: process.env.CREATE_APP_SERVICE_URL || 'http://localhost:4002',
  productServiceUrl: process.env.PRODUCT_SERVICE_URL || 'http://localhost:4005',
  paymentServiceUrl: process.env.PAYMENT_SERVICE_URL || 'http://localhost:4007',
  notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4009',
  platformBaseDomain: (process.env.PLATFORM_BASE_DOMAIN || 'tryspring.io').replace(/^\.+|\.+$/g, ''),
  platformSubdomainPrefix: (process.env.PLATFORM_SUBDOMAIN_PREFIX || 'www').trim().replace(/\.+/g, ''),
  reservedSubdomains: (process.env.RESERVED_SUBDOMAINS || 'www,api,admin,docs')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
  tenantResolverTimeoutMs: parseInt(process.env.TENANT_RESOLVER_TIMEOUT_MS || '30000', 10),
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-key-for-development-purposes-only',
  plataAccountServiceUrl: resolvePlataAccountServiceUrl(),
  plataPublicKey: (process.env.PLATA_PUBLIC_KEY || '').trim(),
  plataSecretKey: (process.env.PLATA_SECRET_KEY || '').trim(),
  plataServiceAuthUrl: trimTrailingSlash(
    process.env.PLATA_SERVICE_AUTH_URL ||
      (process.env.NODE_ENV === 'production' ? 'https://service-auth-ms-plata.fly.dev' : '')
  ),
  plataServiceAuthInternalToken: (
    process.env.PLATA_SERVICE_AUTH_INTERNAL_TOKEN ||
    process.env.JWT_SECRET ||
    ''
  ).trim()
};
