import dotenv from 'dotenv';

dotenv.config();

interface EnvironmentConfig {
  port: number;
  nodeEnv: string;
  mongoUri: string;
  corsOrigins: string[];
  logLevel: string;
  // Mailtrap: Email API (HTTP) or SMTP
  mailtrap: {
    apiToken: string;  // Mailtrap Email API token → uses POST send.api.mailtrap.io
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    fromEmail: string;
    fromName: string;
  };
  // Twilio SMS configuration
  twilio: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
  };
  /** Same secret client-auth-ms uses to sign access tokens (inbox auth + WebSocket). */
  jwtSecret: string;
  /** Web Push (VAPID + web-push library) */
  vapid: {
    publicKey: string;
    privateKey: string;
    subject: string;
  };
}

export const config: EnvironmentConfig = {
  port: parseInt(process.env.PORT || '4009', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri:
    process.env.MONGODB_URI?.trim() ||
    process.env.MONGO_URI?.trim() ||
    'mongodb://localhost:27017/notifications_db',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  logLevel: process.env.LOG_LEVEL || 'info',
  mailtrap: {
    apiToken: process.env.MAILTRAP_API_TOKEN || process.env.MAILTRAP_PASSWORD || '',
    host: process.env.MAILTRAP_HOST || 'smtp.mailtrap.io',
    port: parseInt(process.env.MAILTRAP_PORT || '2525', 10),
    secure: process.env.MAILTRAP_SECURE === 'true',
    user: process.env.MAILTRAP_USER || '',
    password: process.env.MAILTRAP_PASSWORD || '',
    fromEmail: process.env.MAILTRAP_FROM_EMAIL || 'noreply@springtd.com',
    fromName: process.env.MAILTRAP_FROM_NAME || 'SpringTD'
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || ''
  },
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-key-for-development-purposes-only',
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY?.trim() || '',
    privateKey: process.env.VAPID_PRIVATE_KEY?.trim() || '',
    subject: process.env.VAPID_SUBJECT?.trim() || 'mailto:noreply@springtd.com'
  }
};
