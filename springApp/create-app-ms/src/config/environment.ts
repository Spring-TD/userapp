import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  serviceAuthUrl: string;
  /** client-auth-ms base URL for internal customer analytics (falls back to serviceAuthUrl). */
  clientAuthServiceUrl: string;
  /** springApp account-ms (gateway local routes); used for merchant-scoped applications listing */
  accountServiceUrl: string;
  productServiceUrl: string;
  walletServiceUrl: string;
  specialApiKey: string;
  publicKey: string;
  jwtSecret: string;
  /** Shared with client-auth-ms as X-Internal-Token (JWT_SECRET). */
  internalServiceToken: string;
  mongoUri: string;
  /** DigitalOcean Spaces (S3-compatible) for PWA template assets (logo, splash images). */
  doSpaces: {
    region: string;
    endpoint: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    /** e.g. https://bucket.nyc3.cdn.digitaloceanspaces.com — optional */
    cdnBaseUrl: string;
    /** Key prefix for PWA uploads, default pwa-assets */
    pwaKeyPrefix: string;
  };
  /** Max upload size for PWA asset images (bytes). */
  pwaAssetMaxBytes: number;
  /** Hostname only, e.g. springtd.com — used for default app URLs `{subdomain}.{appPlatformBaseDomain}`. */
  appPlatformBaseDomain: string;
  /** Optional host prefix before subdomain, e.g. `www` => `{prefix}.{subdomain}.{domain}`. */
  appSubdomainPrefix: string;
  /** URL scheme for default app URLs (usually https). */
  appUrlScheme: string;
  /** Base URL for notifications-ms (email + in-app via send-dual). */
  notificationsServiceUrl: string;
  /** Wallet currency for app-scoped merchant wallets (NGN aligns with Payonus NUBAN defaults). */
  merchantWalletCurrency: string;
  /**
   * Public base URL for this service (scheme + host), used when auto-publishing PWA artifacts
   * and the incoming request has no Host header. Example: https://springtd-create-app-ms.fly.dev
   */
  createAppServicePublicUrl: string;
}

const pwaAssetMaxMb = parseInt(process.env.PWA_ASSET_MAX_UPLOAD_MB || '2', 10);

export const config: Config = {
  port: parseInt(process.env.PORT || '3002', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  serviceAuthUrl: process.env.SERVICE_AUTH_URL || 'http://localhost:3000',
  clientAuthServiceUrl: (
    process.env.CLIENT_AUTH_SERVICE_URL ||
    process.env.SERVICE_AUTH_URL ||
    'http://localhost:4001'
  ).replace(/\/+$/, ''),
  accountServiceUrl: process.env.ACCOUNT_SERVICE_URL || 'http://localhost:4008',
  productServiceUrl: process.env.PRODUCT_SERVICE_URL || 'http://localhost:4005',
  walletServiceUrl: process.env.WALLET_SERVICE_URL || 'http://localhost:3004',
  specialApiKey: process.env.SPECIAL_API_KEY || 'default-special-key',
  publicKey: process.env.PUBLIC_KEY || 'default-public-key',
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-key-for-development-purposes-only',
  internalServiceToken:
    process.env.JWT_SECRET || 'fallback-secret-key-for-development-purposes-only',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/create-app-ms',
  doSpaces: {
    region: process.env.DO_SPACES_REGION || '',
    endpoint: process.env.DO_SPACES_ENDPOINT || '',
    bucket: process.env.DO_SPACES_BUCKET || '',
    accessKeyId: process.env.DO_SPACES_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.DO_SPACES_SECRET_ACCESS_KEY || '',
    cdnBaseUrl: process.env.DO_SPACES_CDN_URL || '',
    pwaKeyPrefix: (process.env.DO_SPACES_PWA_PREFIX || 'pwa-assets').replace(/^\/+|\/+$/g, '')
  },
  pwaAssetMaxBytes: Math.max(1, pwaAssetMaxMb) * 1024 * 1024,
  appPlatformBaseDomain: (process.env.APP_PLATFORM_BASE_DOMAIN || 'tryspring.io').replace(/^\.+|\.+$/g, ''),
  appSubdomainPrefix: (process.env.APP_SUBDOMAIN_PREFIX || 'www').trim().replace(/\.+/g, ''),
  appUrlScheme: (process.env.APP_URL_SCHEME || 'https').replace(/:$/, ''),
  notificationsServiceUrl:
    process.env.NOTIFICATIONS_SERVICE_URL ||
    (process.env.NODE_ENV === 'production' ? 'https://springtd-notifications-ms.fly.dev' : 'http://localhost:4009'),
  merchantWalletCurrency: (process.env.MERCHANT_WALLET_CURRENCY || 'NGN').trim().toUpperCase() || 'NGN',
  createAppServicePublicUrl: (process.env.CREATE_APP_SERVICE_PUBLIC_URL || '').trim().replace(/\/+$/, '')
};

/** Full default URL for an app on the platform origin, e.g. https://my-store.springtd.com */
export function buildDefaultAppUrl(subdomain: string): string {
  const s = subdomain.trim().toLowerCase();
  const prefix = config.appSubdomainPrefix.trim().toLowerCase();
  const host = prefix ? `${prefix}.${s}.${config.appPlatformBaseDomain}` : `${s}.${config.appPlatformBaseDomain}`;
  return `${config.appUrlScheme}://${host}/`;
}