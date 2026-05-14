import dotenv from 'dotenv';
dotenv.config();

export interface Config {
  port: number;
  nodeEnv: string;
  /** MongoDB connection (MONGODB_URI for DigitalOcean, DATABASE_URL for docker-compose) */
  mongoUri: string;
  authServiceUrl: string;
  complianceServiceUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  /** Max request body size for JSON (e.g. '10mb') */
  requestBodyLimit: string;
  /** Shared secret for POST /api/v1/internal/wallets/* (e.g. client-auth-ms signup). Header: X-Internal-Token */
  walletInternalToken: string;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '4004', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/wallet_ms',
  authServiceUrl:
    process.env.CLIENT_AUTH_SERVICE_URL ||
    process.env.AUTH_SERVICE_URL ||
    'http://localhost:4000',
  complianceServiceUrl: process.env.COMPLIANCE_SERVICE_URL || 'http://localhost:4003',
  jwtSecret: process.env.JWT_SECRET || 'wallet-service-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  requestBodyLimit: process.env.REQUEST_BODY_LIMIT || '10mb',
  walletInternalToken: (process.env.WALLET_INTERNAL_TOKEN || '').trim()
};