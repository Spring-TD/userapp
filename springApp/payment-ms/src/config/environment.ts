import dotenv from 'dotenv';

dotenv.config();

interface EnvironmentConfig {
  port: number;
  nodeEnv: string;
  /** MongoDB connection (MONGODB_URI for Digital Ocean, DATABASE_URL for docker-compose) */
  mongoUri: string;
  serviceAuthUrl: string;
  billingServiceUrl: string;
  walletServiceUrl: string;
  /** Shared secret for wallet-ms -> payment-ms internal ledger calls. */
  paymentInternalToken: string;
  corsOrigins: string[];
  logLevel: string;
  jwtSecret: string;
  /** Max request body size for JSON (e.g. '10mb') */
  requestBodyLimit: string;
  paymentGateway: {
    apiKey: string;
    secret: string;
    webhookSecret: string;
  };
}

export const config: EnvironmentConfig = {
  port: parseInt(process.env.PORT || '4007', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/payment_db',
  serviceAuthUrl: process.env.SERVICE_AUTH_URL || 'http://localhost:4000',
  billingServiceUrl: process.env.BILLING_SERVICE_URL || 'http://localhost:4006',
  walletServiceUrl: process.env.WALLET_SERVICE_URL || 'http://localhost:4004',
  paymentInternalToken: (process.env.PAYMENT_INTERNAL_TOKEN || '').trim(),
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:4001'],
  logLevel: process.env.LOG_LEVEL || 'info',
  jwtSecret: process.env.JWT_SECRET || 'payment-secret-key',
  requestBodyLimit: process.env.REQUEST_BODY_LIMIT || '10mb',
  paymentGateway: {
    apiKey: process.env.PAYMENT_GATEWAY_API_KEY || '',
    secret: process.env.PAYMENT_GATEWAY_SECRET || '',
    webhookSecret: process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET || ''
  }
};
