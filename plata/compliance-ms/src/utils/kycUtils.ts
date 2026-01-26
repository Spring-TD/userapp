// src/utils/kycUtils.ts
import { UserType, DocumentType } from '../types/kycTypes';

// Validation schema for KYC submission
export const kycSubmissionSchema = (Joi: any) => Joi.object({
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
export const validateKYCSubmission = (data: any, Joi: any) => {
  const schema = kycSubmissionSchema(Joi);
  const { error, value } = schema.validate(data, { abortEarly: false });
  
  if (error) {
    // We can't use logger here because it would create a circular dependency
    console.warn('KYC submission validation failed', {
      error: error.details.map((detail: any) => detail.message)
    });
    return { error };
  }
  
  return { value };
};

// Audit logger - this should be imported from audit.ts instead
export const auditLogger = (action: string, user: string, details: Record<string, any>) => {
  console.info(`KYC Action: ${action} by ${user}`, {
    user,
    action,
    details,
    timestamp: new Date()
  });
};