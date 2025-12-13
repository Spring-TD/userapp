import dotenv from 'dotenv';
import Joi from 'joi';

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),

  // MongoDB
  MONGODB_URI: Joi.string().required(),

  // Redis
  REDIS_URL: Joi.string().required(),
  REDIS_PASSWORD: Joi.string().allow('').optional(),

  // JWT
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Password
  BCRYPT_ROUNDS: Joi.number().min(10).max(15).default(12),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),

  // OTP
  OTP_EXPIRES_IN: Joi.number().default(300), // 5 minutes
  OTP_MAX_ATTEMPTS: Joi.number().default(3),
  OTP_LOCKOUT_DURATION: Joi.number().default(900), // 15 minutes

  // Email
  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().required(),
  SMTP_PASS: Joi.string().required(),
  FROM_EMAIL: Joi.string().email().required(),

  // SMS (Twilio)
  TWILIO_ACCOUNT_SID: Joi.string().optional(),
  TWILIO_AUTH_TOKEN: Joi.string().optional(),
  TWILIO_PHONE_NUMBER: Joi.string().optional(),

  // CORS
  CORS_ALLOWED_ORIGINS: Joi.string().default('http://localhost:3000'),

  // Security
  ACCOUNT_LOCKOUT_ATTEMPTS: Joi.number().default(5),
  ACCOUNT_LOCKOUT_DURATION: Joi.number().default(1800), // 30 minutes

  // Verification
  EMAIL_VERIFICATION_EXPIRES_IN: Joi.number().default(86400), // 24 hours
  PASSWORD_RESET_EXPIRES_IN: Joi.number().default(3600), // 1 hour

  // Compliance Service
  COMPLIANCE_SERVICE_URL: Joi.string().default('http://localhost:3003'),
  COMPLIANCE_SERVICE_CREDENTIAL: Joi.string().optional(),

  // Payment Service
  PAYMENT_SERVICE_URL: Joi.string().default('http://localhost:3007'),
  BILLING_SERVICE_URL: Joi.string().default('http://localhost:3006')
}).unknown();

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const config = {
  env: envVars.NODE_ENV,
  server: {
    port: envVars.PORT,
  },
  mongodb: {
    uri: envVars.MONGODB_URI,
  },
  redis: {
    url: envVars.REDIS_URL,
    password: envVars.REDIS_PASSWORD,
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN,
    refreshExpiresIn: envVars.JWT_REFRESH_EXPIRES_IN,
  },
  password: {
    bcryptRounds: envVars.BCRYPT_ROUNDS,
  },
  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS,
    maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS,
  },
  otp: {
    expiresIn: envVars.OTP_EXPIRES_IN,
    maxAttempts: envVars.OTP_MAX_ATTEMPTS,
    lockoutDuration: envVars.OTP_LOCKOUT_DURATION,
  },
  email: {
    smtp: {
      host: envVars.SMTP_HOST,
      port: envVars.SMTP_PORT,
      secure: envVars.SMTP_SECURE,
      auth: {
        user: envVars.SMTP_USER,
        pass: envVars.SMTP_PASS,
      },
    },
    from: envVars.FROM_EMAIL,
  },
  sms: {
    twilio: {
      accountSid: envVars.TWILIO_ACCOUNT_SID,
      authToken: envVars.TWILIO_AUTH_TOKEN,
      phoneNumber: envVars.TWILIO_PHONE_NUMBER,
    },
  },
  cors: {
    allowedOrigins: envVars.CORS_ALLOWED_ORIGINS.split(','),
  },
  security: {
    accountLockoutAttempts: envVars.ACCOUNT_LOCKOUT_ATTEMPTS,
    accountLockoutDuration: envVars.ACCOUNT_LOCKOUT_DURATION,
  },
  verification: {
    emailExpiresIn: envVars.EMAIL_VERIFICATION_EXPIRES_IN,
    passwordResetExpiresIn: envVars.PASSWORD_RESET_EXPIRES_IN,
  },
  compliance: {
    serviceUrl: envVars.COMPLIANCE_SERVICE_URL,
    serviceCredential: envVars.COMPLIANCE_SERVICE_CREDENTIAL,
  },
  payment: {
    serviceUrl: envVars.PAYMENT_SERVICE_URL,
  },
  billing: {
    serviceUrl: envVars.BILLING_SERVICE_URL,
  }
};