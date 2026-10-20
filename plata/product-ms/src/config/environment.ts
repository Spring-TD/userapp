import dotenv from 'dotenv';

dotenv.config();

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

interface EnvironmentConfig {
  port: number;
  nodeEnv: string;
  mongoUri: string;
  corsOrigins: string[];
  logLevel: string;
  /** Base URL for client-auth-ms (verify-token). Same host payment-ms often uses as SERVICE_AUTH_URL. */
  clientAuthUrl: string;
  /** Internal token for product-ms -> client-auth-ms mirror endpoint. */
  clientAuthInternalToken: string;
  /** Base URL for create-app-ms (transaction stats source). */
  createAppServiceUrl: string;
  /** notifications-ms — dual email + in-app */
  notificationsServiceUrl: string;
  complianceServiceUrl: string;
  internalServiceToken: string;
  walletServiceUrl: string;
  billingServiceUrl: string;
  publicProductServiceUrl: string;
  loanWorkflowWebhookSecret: string;
  monoBaseUrl: string;
  monoSecretKey: string;
  springAccountServiceUrl: string;
  springApplicantProfileTimeoutMs: number;
  springIntegratorPlataPublicKey: string;
  springIntegratorPlataSecretKey: string;
  springProductSyncCallbackUrl: string;
}

export const config: EnvironmentConfig = {
  port: parseInt(process.env.PORT || '3005', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/product_ms',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  logLevel: process.env.LOG_LEVEL || 'info',
  clientAuthUrl: trimTrailingSlash(
    process.env.CLIENT_AUTH_URL || process.env.SERVICE_AUTH_URL || 'http://localhost:3001'
  ),
  clientAuthInternalToken:
    process.env.CLIENT_AUTH_INTERNAL_TOKEN ||
    process.env.SERVICE_AUTH_INTERNAL_TOKEN ||
    process.env.JWT_SECRET ||
    'internal-dev-token',
  createAppServiceUrl: trimTrailingSlash(process.env.CREATE_APP_SERVICE_URL || 'http://localhost:3002'),
  notificationsServiceUrl: trimTrailingSlash(
    process.env.NOTIFICATIONS_SERVICE_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://notifications-ms-plata.fly.dev'
        : 'http://localhost:4009')
  ),
  complianceServiceUrl: trimTrailingSlash(
    process.env.COMPLIANCE_SERVICE_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://compliance-ms-plata.fly.dev'
        : 'http://localhost:3003')
  ),
  internalServiceToken:
    process.env.INTERNAL_SERVICE_TOKEN ||
    process.env.CLIENT_AUTH_INTERNAL_TOKEN ||
    process.env.JWT_SECRET ||
    'internal-dev-token',
  walletServiceUrl: trimTrailingSlash(
    process.env.WALLET_SERVICE_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://wallet-ms-plata.fly.dev'
        : 'http://localhost:3004')
  ),
  billingServiceUrl: trimTrailingSlash(
    process.env.BILLING_SERVICE_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://billing-ms-plata.fly.dev'
        : 'http://localhost:3006')
  ),
  publicProductServiceUrl: trimTrailingSlash(
    process.env.PUBLIC_PRODUCT_SERVICE_URL ||
      process.env.PRODUCT_MS_PUBLIC_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://product-ms-plata.fly.dev'
        : 'http://localhost:3005')
  ),
  loanWorkflowWebhookSecret: (process.env.LOAN_WORKFLOW_WEBHOOK_SECRET || '').trim(),
  monoBaseUrl: trimTrailingSlash(process.env.MONO_BASE_URL || ''),
  monoSecretKey: (process.env.MONO_SECRET_KEY || '').trim(),
  springAccountServiceUrl: trimTrailingSlash(
    process.env.SPRING_ACCOUNT_SERVICE_URL ||
      (process.env.NODE_ENV === 'production' ? 'https://account-ms.fly.dev' : 'http://localhost:4008')
  ),
  springApplicantProfileTimeoutMs: Math.max(
    1000,
    parseInt(process.env.SPRING_APPLICANT_PROFILE_TIMEOUT_MS || '10000', 10)
  ),
  springIntegratorPlataPublicKey: (process.env.SPRING_INTEGRATOR_PLATA_PUBLIC_KEY || '').trim(),
  springIntegratorPlataSecretKey: (process.env.SPRING_INTEGRATOR_PLATA_SECRET_KEY || '').trim(),
  springProductSyncCallbackUrl: (process.env.SPRING_PRODUCT_SYNC_CALLBACK_URL || '').trim()
};
