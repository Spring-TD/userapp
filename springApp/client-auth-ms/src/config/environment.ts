import dotenv from 'dotenv';

dotenv.config();

interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshExpiresIn: string;
}

interface BcryptConfig {
  rounds: number;
}

interface EnvironmentConfig {
  port: number;
  nodeEnv: string;
  serviceAuthUrl: string;
  serviceAuthInternalToken: string;
  /** Axios timeout (ms) for calls to service-auth-ms (bootstrap, etc.). */
  serviceAuthHttpTimeoutMs: number;
  /** wallet-ms base URL (no trailing slash). If empty, user wallets are not provisioned on signup. */
  walletServiceUrl: string;
  /** Must match wallet-ms WALLET_INTERNAL_TOKEN. */
  walletInternalToken: string;
  /** ISO currency for new retail user wallets (NGN aligns with Payonus defaults). */
  userWalletDefaultCurrency: string;
  /** Timeout (ms) for wallet-ms internal calls. */
  walletServiceHttpTimeoutMs: number;
  notificationsServiceUrl: string;
  complianceServiceUrl: string;
  fuspayModularEnabled: boolean;
  fuspayModularBaseUrl: string;
  fuspayModularAppId: string;
  fuspayModularApiKey: string;
  corsOrigins: string[];
  logLevel: string;
  jwt: JwtConfig;
  bcrypt: BcryptConfig;
}

export const config: EnvironmentConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  serviceAuthUrl: process.env.SERVICE_AUTH_URL || 'http://localhost:4000',
  serviceAuthInternalToken: process.env.SERVICE_AUTH_INTERNAL_TOKEN || 'internal-dev-token',
  serviceAuthHttpTimeoutMs: parseInt(process.env.SERVICE_AUTH_HTTP_TIMEOUT_MS || '90000', 10),
  walletServiceUrl: (process.env.WALLET_SERVICE_URL || '').trim(),
  walletInternalToken: (process.env.WALLET_INTERNAL_TOKEN || '').trim(),
  userWalletDefaultCurrency: (process.env.USER_WALLET_DEFAULT_CURRENCY || 'NGN').trim().toUpperCase() || 'NGN',
  walletServiceHttpTimeoutMs: parseInt(process.env.WALLET_SERVICE_HTTP_TIMEOUT_MS || '30000', 10),
  notificationsServiceUrl:
    process.env.NOTIFICATIONS_SERVICE_URL ||
    (process.env.NODE_ENV === 'production' ? 'https://notifications-ms.fly.dev' : 'http://localhost:4009'),
  complianceServiceUrl:
    process.env.COMPLIANCE_SERVICE_URL ||
    (process.env.NODE_ENV === 'production' ? 'https://compliance-ms.fly.dev' : 'http://localhost:3003'),
  fuspayModularEnabled: (process.env.FUSPAY_MODULAR_KYC_ENABLED || 'false').toLowerCase() === 'true',
  fuspayModularBaseUrl: process.env.FUSPAY_MODULAR_BASE_URL || 'https://kyc-verif-new.fly.dev',
  fuspayModularAppId: process.env.FUSPAY_MODULAR_APP_ID || '',
  fuspayModularApiKey: process.env.FUSPAY_MODULAR_API_KEY || '',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  logLevel: process.env.LOG_LEVEL || 'info',
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-key-for-development-purposes-only',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  },
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10)
  }
};