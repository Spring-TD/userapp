// src/utils/db.ts
import mongoose from 'mongoose';
import { logger } from './logger';

// MongoDB connection
export const connectDB = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/compliance_db';
    
    // MongoDB connection options
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(MONGODB_URI, options);
    logger.info('MongoDB connected for Compliance Service');
  } catch (error) {
    logger.error('MongoDB connection error for Compliance Service', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    process.exit(1);
  }
};

// src/utils/seed.ts
export const seedData = async () => {
  // Development only: Seed test data if needed
  // This will be expanded later with actual seed data
  logger.info('Seeding compliance data (development only)');
};

// src/utils/logger.ts
import winston from 'winston';
import { format, transports } from 'winston';
import { KYC_LOG_LEVEL } from '../config/environment';

const { combine, timestamp, printf } = format;

// Custom log format
const kycLogFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

// Create logger instance
export const logger = winston.createLogger({
  level: KYC_LOG_LEVEL,
  format: combine(
    timestamp(),
    kycLogFormat
  ),
  transports: [
    new transports.Console(),
    // In production, you might want to add a file transport
  ],
  exitOnError: false,
});

// src/utils/validation.ts
import Joi from 'joi';
import { KYCSubmissionRequest } from '../types/kycTypes';

// Validation schema for KYC submission
export const kycSubmissionSchema = Joi.object({
  userId: Joi.string().required(),
  userType: Joi.string().valid(...Object.values(UserType)).required(),
  documents: Joi.array().items(Joi.object({
    type: Joi.string().valid(...Object.values(DocumentType)).required(),
    fileName: Joi.string().required(),
    fileType: Joi.string().required(),
    fileSize: Joi.number().positive().required(),
    fileUrl: Joi.string().uri().required()
  })).min(1).required(),
  additionalInfo: Joi.object().optional()
});

// Validate KYC submission data
export const validateKYCSubmission = (data: KYCSubmissionRequest) => {
  const { error, value } = kycSubmissionSchema.validate(data, { abortEarly: false });
  
  if (error) {
    logger.warn('KYC submission validation failed', {
      error: error.details.map(detail => detail.message)
    });
    return { error };
  }
  
  return { value };
};

// src/utils/audit.ts
export const auditLogger = (action: string, user: string, details: Record<string, any>) => {
  logger.info(`KYC Action: ${action} by ${user}`, {
    user,
    action,
    details,
    timestamp: new Date()
  });
};