// src/utils/validation.ts
import Joi from 'joi';
import { KYCSubmissionRequest } from '../types/kycTypes';
import { logger } from './logger';

// Validation schema for KYC submission
export const kycSubmissionSchema = Joi.object({
  userId: Joi.string().required(),
  userType: Joi.string().valid('individual', 'merchant').required(),
  documents: Joi.array().items(Joi.object({
    type: Joi.string().valid('identity', 'address', 'business', 'tax', 'bank').required(),
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