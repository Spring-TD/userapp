import dotenv from 'dotenv';

dotenv.config();

interface EnvironmentConfig {
  port: number;
  nodeEnv: string;
  corsOrigins: string[];
  logLevel: string;
  serverProductServiceUrl: string;
}

export const config: EnvironmentConfig = {
  port: parseInt(process.env.PORT || '3005', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:4001'],
  logLevel: process.env.LOG_LEVEL || 'info',
  serverProductServiceUrl: process.env.SERVER_PRODUCT_SERVICE_URL || 'http://localhost:3005'
};