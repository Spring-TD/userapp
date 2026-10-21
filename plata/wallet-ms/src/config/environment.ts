import dotenv from 'dotenv';

// Load .env before reading process.env so config gets values from .env (imports run before index.ts body)
dotenv.config();

export interface Config {
  port: number;
  nodeEnv: string;
  mongoUri: string;
  authServiceUrl: string;
  complianceServiceUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3004', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/wallet_ms',
  // Merchant/user bearer tokens come from client-auth-ms.
  authServiceUrl:
    process.env.CLIENT_AUTH_SERVICE_URL ||
    process.env.AUTH_SERVICE_URL ||
    'http://localhost:3001',
  complianceServiceUrl: process.env.COMPLIANCE_SERVICE_URL || 'http://localhost:3003',
  jwtSecret: process.env.JWT_SECRET || 'wallet-service-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h'
};