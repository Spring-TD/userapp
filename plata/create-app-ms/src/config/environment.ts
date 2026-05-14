import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  serviceAuthUrl: string;
  productServiceUrl: string;
  walletServiceUrl: string;
  /** notifications-ms base URL (email + in-app via /api/v1/notifications/send-dual) */
  notificationsServiceUrl: string;
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
  notificationsServiceUrl:
    process.env.NOTIFICATIONS_SERVICE_URL ||
    (process.env.NODE_ENV === 'production' ? 'https://notifications-ms-plata.fly.dev' : 'http://localhost:4009'),
  specialApiKey: process.env.SPECIAL_API_KEY || 'default-special-key',
  publicKey: process.env.PUBLIC_KEY || 'default-public-key',
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-key-for-development-purposes-only',
  // Accept both names because Fly and other services in this repo use both conventions.
  mongoUri: process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/create-app-ms'
};