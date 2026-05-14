import dotenv from 'dotenv';

dotenv.config();

interface EnvironmentConfig {
  port: number;
  nodeEnv: string;
  mongoUri: string;
  corsOrigins: string[];
  logLevel: string;
  /** Base URL for client-auth-ms (verify-token). Same host payment-ms often uses as SERVICE_AUTH_URL. */
  clientAuthUrl: string;
  /** Internal token for product-ms -> client-auth-ms mirror endpoint. */
  clientAuthInternalToken: string;
  /** Base URL for create-app-ms (transaction stats source). */
  createAppServiceUrl: string;
  /** notifications-ms — dual email + in-app */
  notificationsServiceUrl: string;
}

export const config: EnvironmentConfig = {
  port: parseInt(process.env.PORT || '3005', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/product_ms',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  logLevel: process.env.LOG_LEVEL || 'info',
  clientAuthUrl:
    process.env.CLIENT_AUTH_URL ||
    process.env.SERVICE_AUTH_URL ||
    'http://localhost:3001',
  clientAuthInternalToken:
    process.env.CLIENT_AUTH_INTERNAL_TOKEN ||
    process.env.SERVICE_AUTH_INTERNAL_TOKEN ||
    'internal-dev-token',
  createAppServiceUrl: process.env.CREATE_APP_SERVICE_URL || 'http://localhost:3002',
  notificationsServiceUrl:
    process.env.NOTIFICATIONS_SERVICE_URL ||
    (process.env.NODE_ENV === 'production' ? 'https://notifications-ms-plata.fly.dev' : 'http://localhost:4009')
};