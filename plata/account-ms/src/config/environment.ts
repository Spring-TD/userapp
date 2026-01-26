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
}

export const config: EnvironmentConfig = {
  port: parseInt(process.env.PORT || '3008', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/account_db',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  logLevel: process.env.LOG_LEVEL || 'info',
  complianceServiceUrl: process.env.COMPLIANCE_SERVICE_URL || 'http://localhost:3003',
  billingServiceUrl: process.env.BILLING_SERVICE_URL || 'http://localhost:3006',
  walletServiceUrl: process.env.WALLET_SERVICE_URL || 'http://localhost:3004',
  serviceAuthUrl: process.env.SERVICE_AUTH_URL || 'http://localhost:3000',
  clientAuthServiceUrl: process.env.CLIENT_AUTH_SERVICE_URL || 'http://localhost:3001',
  createAppServiceUrl: process.env.CREATE_APP_SERVICE_URL || 'http://localhost:3002',
  productServiceUrl: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3005',
  paymentServiceUrl: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3007'
};