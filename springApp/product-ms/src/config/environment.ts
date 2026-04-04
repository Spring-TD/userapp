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

interface EnvironmentConfig {
  port: number;
  nodeEnv: string;
  /** MongoDB connection (MONGODB_URI for DigitalOcean, DATABASE_URL for docker-compose) */
  mongoUri: string;
  corsOrigins: string[];
  logLevel: string;
  /**
   * Plata account-ms base URL (GET /api/v1/products, GET /api/v1/products/:id, etc.).
   * @see resolveUpstreamProductCatalogBaseUrl
   */
  serverProductServiceUrl: string;
  /** Merchant API keys used by account-ms gateway for GET /api/v1/products */
  plataPublicKey: string;
  plataSecretKey: string;
  /** Max request body size for JSON (e.g. '10mb') */
  requestBodyLimit: string;
}

export const config: EnvironmentConfig = {
  port: parseInt(process.env.PORT || '4005', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/product_ms',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:4001'],
  logLevel: process.env.LOG_LEVEL || 'info',
  serverProductServiceUrl: resolveUpstreamProductCatalogBaseUrl(),
  plataPublicKey: process.env.PLATA_PUBLIC_KEY || '',
  plataSecretKey: process.env.PLATA_SECRET_KEY || '',
  requestBodyLimit: process.env.REQUEST_BODY_LIMIT || '10mb',
};