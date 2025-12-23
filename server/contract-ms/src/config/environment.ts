import dotenv from 'dotenv';

dotenv.config();

interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
}

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

interface EnvironmentConfig {
  port: number;
  nodeEnv: string;
  serviceAuthUrl: string;
  contractBaseUrl: string;
  callbackTimeout: number;
  corsOrigins: string[];
  logLevel: string;
  mongoUri: string;
  jwtSecret: string;
  smtp: SMTPConfig;
  twilio: TwilioConfig;
}

export const config: EnvironmentConfig = {
  port: parseInt(process.env.PORT || '3009', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  serviceAuthUrl: process.env.SERVICE_AUTH_URL || 'http://localhost:3000',
  contractBaseUrl: process.env.CONTRACT_BASE_URL || 'http://localhost:3009',
  callbackTimeout: parseInt(process.env.CALLBACK_TIMEOUT || '5000', 10),
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  logLevel: process.env.LOG_LEVEL || 'info',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/contract_db',
  jwtSecret: process.env.JWT_SECRET || 'contract-secret-key',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.SMTP_FROM || 'noreply@contract-service.com'
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || ''
  }
};
