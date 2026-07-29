import dotenv from 'dotenv';
dotenv.config();

export interface Config {
  port: number;
  nodeEnv: string;
  /** MongoDB connection (MONGODB_URI for DigitalOcean, DATABASE_URL for docker-compose) */
  mongoUri: string;
  authServiceUrl: string;
  complianceServiceUrl: string;
  paymentServiceUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  /** Max request body size for JSON (e.g. '10mb') */
  requestBodyLimit: string;
  /** Legacy shared secret; prefer JWT_SECRET. Still accepted when set. */
  walletInternalToken: string;
  /** Shared secret wallet-ms sends to payment-ms internal ledger endpoint. */
  paymentInternalToken: string;
  /** create-app-ms base URL for app-scoped transaction mirroring. */
  createAppServiceUrl: string;
  /** product-ms base URL for loan charge on product-wallet → primary transfer. */
  productServiceUrl: string;
  /** notifications-ms base URL for payout alerts. */
  notificationsServiceUrl: string;
  /** Internal token for client-auth-ms service routes (falls back to JWT_SECRET). */
  clientAuthInternalToken: string;
  /** Public base URL of this wallet-ms (for receipt PDF download links in notifications). */
  walletPublicBaseUrl: string;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '4004', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/wallet_ms',
  authServiceUrl:
    process.env.CLIENT_AUTH_SERVICE_URL ||
    process.env.AUTH_SERVICE_URL ||
    'http://localhost:4000',
  complianceServiceUrl: process.env.COMPLIANCE_SERVICE_URL || 'http://localhost:4003',
  paymentServiceUrl: (process.env.PAYMENT_SERVICE_URL || '').replace(/\/$/, ''),
  jwtSecret: process.env.JWT_SECRET || 'wallet-service-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  requestBodyLimit: process.env.REQUEST_BODY_LIMIT || '10mb',
  walletInternalToken: (process.env.WALLET_INTERNAL_TOKEN || '').trim(),
  paymentInternalToken: (process.env.PAYMENT_INTERNAL_TOKEN || '').trim(),
  createAppServiceUrl: (process.env.CREATE_APP_SERVICE_URL || '').replace(/\/$/, ''),
  productServiceUrl: (
    process.env.PRODUCT_SERVICE_URL ||
    process.env.SERVER_PRODUCT_SERVICE_URL ||
    'http://localhost:4002'
  ).replace(/\/$/, ''),
  notificationsServiceUrl:
    process.env.NOTIFICATIONS_SERVICE_URL ||
    (process.env.NODE_ENV === 'production' ? 'https://springtd-notifications-ms.fly.dev' : 'http://localhost:4009'),
  clientAuthInternalToken: (process.env.CLIENT_AUTH_INTERNAL_TOKEN || '').trim(),
  walletPublicBaseUrl: (
    process.env.WALLET_PUBLIC_BASE_URL ||
    (process.env.NODE_ENV === 'production' ? 'https://wallet-ms.fly.dev' : 'http://localhost:4004')
  ).replace(/\/$/, '')
};