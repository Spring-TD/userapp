import dotenv from 'dotenv';

dotenv.config();

interface EnvironmentConfig {
  port: number;
  nodeEnv: string;
  serviceAuthUrl: string;
  corsOrigins: string[];
  logLevel: string;
  /** MongoDB connection (use MONGODB_URI for DigitalOcean, DATABASE_URL for docker-compose) */
  mongoUri: string;
  jwtSecret: string;
  /** Max request body size for JSON (e.g. '10mb') */
  requestBodyLimit: string;
}

export const config: EnvironmentConfig = {
  port: parseInt(process.env.PORT || '3006', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  serviceAuthUrl: process.env.SERVICE_AUTH_URL || 'http://localhost:3000',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  logLevel: process.env.LOG_LEVEL || 'info',
  mongoUri: process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/billing_db',
  jwtSecret: process.env.JWT_SECRET || 'billing-secret-key',
  requestBodyLimit: process.env.REQUEST_BODY_LIMIT || '10mb',
};