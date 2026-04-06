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

/** Fly sets PORT; invalid values must not produce NaN (would crash listen()). */
function resolveListenPort(): number {
  const raw = process.env.PORT || '4005';
  const n = Number.parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 && n < 65536 ? n : 4005;
}

interface EnvironmentConfig {
  port: number;
  nodeEnv: string;
  /** MongoDB connection (MONGODB_URI for DigitalOcean, DATABASE_URL for docker-compose) */
  mongoUri: string;
  corsOrigins: string[];
  logLevel: string;
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
  /** Max request body size for JSON (e.g. '10mb') */
  requestBodyLimit: string;
}

export const config: EnvironmentConfig = {
  port: resolveListenPort(),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/product_ms',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:4001'],
  logLevel: process.env.LOG_LEVEL || 'info',
  plataAccountServiceUrl: upstreamProductCatalogBaseUrl,
  serverProductServiceUrl: upstreamProductCatalogBaseUrl,
  plataPublicKey: process.env.PLATA_PUBLIC_KEY || '',
  plataSecretKey: process.env.PLATA_SECRET_KEY || '',
  requestBodyLimit: process.env.REQUEST_BODY_LIMIT || '10mb',
};