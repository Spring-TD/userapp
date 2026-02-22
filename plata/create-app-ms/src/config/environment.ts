import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  serviceAuthUrl: string;
  productServiceUrl: string;
  walletServiceUrl: string;
  specialApiKey: string;
  publicKey: string;
  jwtSecret: string;
  mongoUri: string;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3002', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  serviceAuthUrl: process.env.SERVICE_AUTH_URL || 'http://localhost:3000',
  productServiceUrl: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3005',
  walletServiceUrl: process.env.WALLET_SERVICE_URL || 'http://localhost:3004',
  specialApiKey: process.env.SPECIAL_API_KEY || 'default-special-key',
  publicKey: process.env.PUBLIC_KEY || 'default-public-key',
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret_key',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/create-app-ms'
};