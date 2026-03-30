import dotenv from 'dotenv';

dotenv.config();

interface EnvironmentConfig {
  port: number;
  nodeEnv: string;
  /** MongoDB connection (MONGODB_URI for DigitalOcean, DATABASE_URL for docker-compose) */
  mongoUri: string;
  corsOrigins: string[];
  logLevel: string;
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
  serverProductServiceUrl: process.env.SERVER_PRODUCT_SERVICE_URL || 'http://localhost:3005',
  plataPublicKey: process.env.PLATA_PUBLIC_KEY || '',
  plataSecretKey: process.env.PLATA_SECRET_KEY || '',
  requestBodyLimit: process.env.REQUEST_BODY_LIMIT || '10mb',
};