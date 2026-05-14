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
  baseDomain: string;
  serverIp: string;
  platformDomain: string;
  vercelApiToken?: string;
  vercelTeamId?: string;
  vercelDefaultProjectId?: string;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '4002', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  serviceAuthUrl: process.env.SERVICE_AUTH_URL || 'http://localhost:4000',
  productServiceUrl: process.env.PRODUCT_SERVICE_URL || 'http://localhost:4005',
  walletServiceUrl: process.env.WALLET_SERVICE_URL || 'http://localhost:4004',
  specialApiKey: process.env.SPECIAL_API_KEY || 'default-special-key',
  publicKey: process.env.PUBLIC_KEY || 'default-public-key',
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret_key',
  baseDomain: process.env.SUBDOMAIN_BASE_DOMAIN || 'springtd.com',
  serverIp: process.env.SERVER_IP || '',
  platformDomain: process.env.PLATFORM_DOMAIN || 'domain.useinclude.com',
  vercelApiToken: process.env.VERCEL_API_TOKEN,
  vercelTeamId: process.env.VERCEL_TEAM_ID,
  vercelDefaultProjectId: process.env.VERCEL_DEFAULT_PROJECT_ID
};