import dotenv from 'dotenv';

dotenv.config();

interface EnvironmentConfig {
  port: number;
  nodeEnv: string;
  mongoUri: string;
  corsOrigins: string[];
  logLevel: string;
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
  tenantResolverTimeoutMs: number;
  /** Must match client-auth-ms JWT_SECRET for Bearer merchant tokens */
  jwtSecret: string;
}

export const config: EnvironmentConfig = {
  port: parseInt(process.env.PORT || '4008', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/account_db',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  logLevel: process.env.LOG_LEVEL || 'info',
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
  tenantResolverTimeoutMs: parseInt(process.env.TENANT_RESOLVER_TIMEOUT_MS || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-key-for-development-purposes-only'
};