import dotenv from 'dotenv';

dotenv.config();

interface EnvironmentConfig {
  port: number;
  nodeEnv: string;
  mongoUri: string;
  corsOrigins: string[];
  logLevel: string;
}

export const config: EnvironmentConfig = {
  port: parseInt(process.env.PORT || '3005', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/product_ms',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  logLevel: process.env.LOG_LEVEL || 'info'
};