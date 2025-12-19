import dotenv from 'dotenv';

dotenv.config();

interface EnvironmentConfig {
  port: number;
  nodeEnv: string;
  serviceAuthUrl: string;
  corsOrigins: string[];
  logLevel: string;
  mongoUri: string;
  jwtSecret: string;
}

export const config: EnvironmentConfig = {
  port: parseInt(process.env.PORT || '3009', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  serviceAuthUrl: process.env.SERVICE_AUTH_URL || 'http://localhost:3000',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  logLevel: process.env.LOG_LEVEL || 'info',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/contract_db',
  jwtSecret: process.env.JWT_SECRET || 'contract-secret-key'
};
