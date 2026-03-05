import dotenv from 'dotenv';

dotenv.config();

interface EnvironmentConfig {
  port: number;
  nodeEnv: string;
  mongoUri: string;
  corsOrigins: string[];
  logLevel: string;
  /** Max request body size for JSON (e.g. '10mb') */
  requestBodyLimit: string;
  // Mailtrap SMTP configuration
  mailtrap: {
    host: string;
    port: number;
    user: string;
    password: string;
    fromEmail: string;
  };
  // Twilio SMS configuration
  twilio: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
  };
}

export const config: EnvironmentConfig = {
  port: parseInt(process.env.PORT || '4009', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  // Support MONGO_URI, MONGODB_URI, or DATABASE_URL (Digital Ocean / Atlas style)
  mongoUri: process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/notifications_db',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  logLevel: process.env.LOG_LEVEL || 'info',
  requestBodyLimit: process.env.REQUEST_BODY_LIMIT || '10mb',
  mailtrap: {
    host: process.env.MAILTRAP_HOST || 'smtp.mailtrap.io',
    port: parseInt(process.env.MAILTRAP_PORT || '2525', 10),
    user: process.env.MAILTRAP_USER || '',
    password: process.env.MAILTRAP_PASSWORD || '',
    fromEmail: process.env.MAILTRAP_FROM_EMAIL || 'noreply@springtd.com'
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || ''
  }
};

