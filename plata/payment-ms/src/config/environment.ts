import dotenv from 'dotenv';

dotenv.config();

interface EnvironmentConfig {
  port: number;
  nodeEnv: string;
  mongoUri: string;
  serviceAuthUrl: string;
  billingServiceUrl: string;
  walletServiceUrl: string;
  corsOrigins: string[];
  logLevel: string;
  jwtSecret: string;
  paymentGateway: {
    apiKey: string;
    secret: string;
    webhookSecret: string;
  };
}

export const config: EnvironmentConfig = {
  port: parseInt(process.env.PORT || '3007', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/payment_ms',
  serviceAuthUrl: process.env.SERVICE_AUTH_URL || 'http://localhost:3000',
  billingServiceUrl: process.env.BILLING_SERVICE_URL || 'http://localhost:3006',
  walletServiceUrl: process.env.WALLET_SERVICE_URL || 'http://localhost:3004',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  logLevel: process.env.LOG_LEVEL || 'info',
  jwtSecret: process.env.JWT_SECRET || 'payment-secret-key',
  paymentGateway: {
    apiKey: process.env.PAYMENT_GATEWAY_API_KEY || '',
    secret: process.env.PAYMENT_GATEWAY_SECRET || '',
    webhookSecret: process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET || ''
  }
};
