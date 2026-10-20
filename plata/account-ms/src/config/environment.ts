import dotenv from 'dotenv';

dotenv.config();

function envBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
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
  corsOrigins: string[];
  logLevel: string;
  rateLimit: RateLimitConfig;
  complianceServiceUrl: string;
  billingServiceUrl: string;
  walletServiceUrl: string;
  serviceAuthUrl: string;
  /** Same value as service-auth-ms INTERNAL_SERVICE_TOKEN — gateway calls /internal/... */
  serviceAuthInternalToken: string;
  clientAuthServiceUrl: string;
  createAppServiceUrl: string;
  productServiceUrl: string;
  paymentServiceUrl: string;
  notificationsServiceUrl: string;
}

export const config: EnvironmentConfig = {
  port: parseInt(process.env.PORT || '3008', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  logLevel: process.env.LOG_LEVEL || 'info',
  rateLimit: {
    enabled: envBool('RATE_LIMIT_ENABLED', true),
    windowMs: envInt('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
    maxRequests: envInt('RATE_LIMIT_MAX_REQUESTS', 2000),
    authMaxRequests: envInt('AUTH_RATE_LIMIT_MAX_REQUESTS', 20)
  },
  complianceServiceUrl: process.env.COMPLIANCE_SERVICE_URL || 'http://localhost:3003',
  billingServiceUrl: process.env.BILLING_SERVICE_URL || 'http://localhost:3006',
  walletServiceUrl: process.env.WALLET_SERVICE_URL || 'http://localhost:3004',
  serviceAuthUrl: process.env.SERVICE_AUTH_URL || 'http://localhost:3000',
  serviceAuthInternalToken: process.env.SERVICE_AUTH_INTERNAL_TOKEN || 'internal-dev-token',
  clientAuthServiceUrl: process.env.CLIENT_AUTH_SERVICE_URL || 'http://localhost:3001',
  createAppServiceUrl: process.env.CREATE_APP_SERVICE_URL || 'http://localhost:3002',
  productServiceUrl: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3005',
  paymentServiceUrl: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3007',
  notificationsServiceUrl: process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:4009'
};
