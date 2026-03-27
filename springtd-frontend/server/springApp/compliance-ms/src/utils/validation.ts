// src/utils/validation.ts
import Joi from 'joi';
import { 
  DocumentType, 
  UserType, 
  BusinessType, 
  RiskLevel,
  BusinessDocumentType,
  KYCStatus,
  INDIVIDUAL_REQUIRED_DOCUMENTS,
  INDIVIDUAL_OPTIONAL_DOCUMENTS,
  BUSINESS_OPTIONAL_DOCUMENTS
} from '../types/kycTypes';
import { logger } from './logger';

// Individual KYC submission validation schema
export const individualKYCSubmissionSchema = Joi.object({
  userId: Joi.string().required(),
  userType: Joi.string().valid(UserType.INDIVIDUAL).required(),
  personalInfo: Joi.object({
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    dateOfBirth: Joi.date().max('now').required(),
    nationality: Joi.string().min(2).max(3).required(),
    occupation: Joi.string().min(2).max(100).required(),
    sourceOfFunds: Joi.string().min(5).max(200).required()
  }).required(),
  documents: Joi.array().items(
    Joi.object({
      type: Joi.string().valid(
        DocumentType.IDENTITY,
        DocumentType.ADDRESS,
        DocumentType.INCOME_PROOF,
        DocumentType.BANK
      ).required(),
      fileName: Joi.string().required(),
      fileType: Joi.string().required(),
      fileSize: Joi.number().positive().max(10 * 1024 * 1024).required(),
      fileUrl: Joi.string().uri().required()
    })
  ).min(2).required(), // At least identity and address
  riskAssessment: Joi.object({
    politicallyExposed: Joi.boolean().required(),
    sanctionListCheck: Joi.boolean().required()
  }).optional()
});

// Business Document validation schema for the 8 required documents
export const businessDocumentSchema = Joi.object({
  type: Joi.string().valid(...Object.values(BusinessDocumentType)).required(),
  fileName: Joi.string().required(),
  fileType: Joi.string().valid('application/pdf').required(), // Must be PDF
  fileSize: Joi.number().positive().max(5 * 1024 * 1024).required(), // Max 5MB
  fileUrl: Joi.string().uri().required(),
  uploadedAt: Joi.date().required(),
  status: Joi.string().valid(...Object.values(RiskLevel)).required()
});

// Business KYC submission validation schema with dedicated business documents
export const businessKYCSubmissionSchema = Joi.object({
  userId: Joi.string().required(),
  userType: Joi.string().valid(UserType.MERCHANT).required(),
  businessInfo: Joi.object({
    companyName: Joi.string().min(2).max(100).required(),
    industry: Joi.string().min(2).max(50).required(),
    businessDescription: Joi.string().min(10).max(500).required(),
    countryOfIncorporation: Joi.string().min(2).max(50).required(),
    website: Joi.string().uri().required(),
    companyRegId: Joi.string().min(5).max(50).required(),
    companyLogoUrl: Joi.string().uri().required()
  }).required(),
  businessSurvey: Joi.object({
    // 1. business type i.e  loan product, investment product, savings products
    businessType: Joi.string().min(2).max(100).required(),
    
    // 2. country
    country: Joi.string().min(2).max(50).required(),
    
    // 3. business model i.e B2B, B2C, B2B2C, etc
    businessModel: Joi.string().min(2).max(20).required(),
    
    // 4. Monthly processed volume
    monthlyProcessedVolume: Joi.number().min(0).required()
  }).required(),
  shareholders: Joi.array().items(
    Joi.object({
      fullName: Joi.string().min(2).max(100).required(),
      email: Joi.string().email().optional(),
      phoneNumber: Joi.string().min(10).max(20).optional(),
      bvn: Joi.string().min(11).max(11).optional(), // BVN is 11 digits in Nigeria
      bankAccount: Joi.string().min(10).max(20).optional(),
      ownershipPercentage: Joi.number().min(0).max(100).required(),
      submittedAt: Joi.date().optional(),       
      uboDocument: Joi.object({
        fileName: Joi.string().required(),
        fileType: Joi.string().required(),
        fileSize: Joi.number().positive().max(5 * 1024 * 1024).required(), // Max 5MB
        fileUrl: Joi.string().uri().required(),
        uploadDate: Joi.date().required()
      }).optional(),       
      bankStatement: Joi.object({
        fileName: Joi.string().required(),
        fileType: Joi.string().required(),
        fileSize: Joi.number().positive().max(5 * 1024 * 1024).required(), // Max 5MB
        fileUrl: Joi.string().uri().required(),
        uploadDate: Joi.date().required()
      }).required(),
      status: Joi.string().valid(...Object.values(KYCStatus)).required(), // Status must be one of the KYCStatus values
      // Enhanced kyc field for liveness test link
      kyc: Joi.object({
        url: Joi.string().uri().required(), // The URL for the liveness test
        expiresAt: Joi.date().required(), // When the link expires
        status: Joi.string().valid('pending', 'active', 'expired', 'completed', 'failed').required(), // Current status of the link
        providerReference: Joi.string().optional(), // Reference ID from the 3rd party provider
        result: Joi.object({
          success: Joi.boolean().required(),
          score: Joi.number().min(0).max(100).optional(),
          details: Joi.string().optional(),
          completedAt: Joi.date().optional()
        }).optional()
      }).required() // Make the kyc field required
    }).required()
  ).min(1).required(),
  businessDocuments: Joi.array().items(businessDocumentSchema).min(8).required(), // Must have all 8 documents
  riskAssessment: Joi.object({
    annualTurnover: Joi.number().min(0).required(),
    expectedTransactionVolume: Joi.number().min(0).required(),
    highRiskJurisdiction: Joi.boolean().required(),
    sanctionListCheck: Joi.boolean().required(),
    adverseMediaCheck: Joi.boolean().required()
  }).required()
});

// Generic KYC submission validation schema (for backward compatibility)
export const kycSubmissionSchema = Joi.object({
  userId: Joi.string().required(),
  userType: Joi.string().valid(...Object.values(UserType)).required(),
  documents: Joi.array().items(
    Joi.object({
      type: Joi.string().valid(...Object.values(DocumentType)).required(),
      fileName: Joi.string().required(),
      fileType: Joi.string().required(),
      fileSize: Joi.number().positive().max(10 * 1024 * 1024).required(),
      fileUrl: Joi.string().uri().required()
    })
  ).min(1).required(),
  additionalInfo: Joi.object().optional()
});

// KYC status update validation schema
export const kycStatusUpdateSchema = Joi.object({
  status: Joi.string().valid('pending', 'in_progress', 'completed', 'failed', 'review', 'admin_approved', 'approved', 'rejected').required(),
  rejectionReason: Joi.string().when('status', {
    is: 'rejected',
    then: Joi.required(),
    otherwise: Joi.optional()
  })
});

// Document upload validation schema
export const documentUploadSchema = Joi.object({
  type: Joi.string().valid(...Object.values(DocumentType)).required(),
  fileName: Joi.string().required(),
  fileType: Joi.string().required(),
  fileSize: Joi.number().positive().max(10 * 1024 * 1024).required(),
  fileUrl: Joi.string().uri().required()
});

// Enhanced validation functions
export const validateIndividualKYCSubmission = (data: any) => {
  const { error, value } = individualKYCSubmissionSchema.validate(data, { abortEarly: false });
  
  if (error) {
    logger.warn('Individual KYC submission validation failed', {
      error: error.details.map(detail => detail.message)
    });
    return { error };
  }
  
  // Additional validation for required documents
  const documentTypes = value.documents.map((doc: any) => doc.type);
  const hasRequiredDocs = INDIVIDUAL_REQUIRED_DOCUMENTS.every(reqType => 
    documentTypes.includes(reqType)
  );
  
  if (!hasRequiredDocs) {
    const missing = INDIVIDUAL_REQUIRED_DOCUMENTS.filter(reqType => 
      !documentTypes.includes(reqType)
    );
    logger.warn('Individual KYC missing required documents', { missing });
    return { 
      error: { 
        message: `Missing required documents: ${missing.join(', ')}` 
      } 
    };
  }
  
  return { value };
};

// validation functions for business documents
export const validateBusinessKYCSubmission = (data: any) => {
  const { error, value } = businessKYCSubmissionSchema.validate(data, { abortEarly: false });
  
  if (error) {
    logger.warn('Business KYC submission validation failed', {
      error: error.details.map(detail => detail.message)
    });
    return { error };
  }
  
  // Validate that all 8 required business document types are present
  const documentTypes = value.businessDocuments.map((doc: any) => doc.type);
  const requiredDocumentTypes = Object.values(BusinessDocumentType);
  
  const missingDocuments = requiredDocumentTypes.filter(type => 
    !documentTypes.includes(type)
  );
  
  if (missingDocuments.length > 0) {
    logger.warn('Business KYC missing required business documents', { missingDocuments });
    return { 
      error: { 
        message: `Missing required business documents: ${missingDocuments.join(', ')}` 
      } 
    };
  }
  
  // Validate shareholder ownership total
  const totalOwnership = value.shareholders.reduce(
    (sum: number, shareholder: any) => sum + shareholder.ownershipPercentage, 
    0
  );
  
  if (totalOwnership > 100) {
    logger.warn('Business KYC shareholder ownership exceeds 100%', { totalOwnership });
    return { 
      error: { 
        message: 'Total shareholder ownership cannot exceed 100%' 
      } 
    };
  }
  
  return { value };
};

// Generic KYC submission validation (backward compatibility)
export const validateKYCSubmission = (data: any) => {
  if (data.userType === UserType.INDIVIDUAL) {
    return validateIndividualKYCSubmission(data);
  } else if (data.userType === UserType.MERCHANT) {
    return validateBusinessKYCSubmission(data);
  } else {
    // Fallback to generic validation
    const { error, value } = kycSubmissionSchema.validate(data, { abortEarly: false });
    
    if (error) {
      logger.warn('KYC submission validation failed', {
        error: error.details.map(detail => detail.message)
      });
      return { error };
    }
    
    return { value };
  }
};

export const validateKYCStatusUpdate = (data: any) => {
  return kycStatusUpdateSchema.validate(data, { abortEarly: false });
};

export const validateDocumentUpload = (data: any) => {
  return documentUploadSchema.validate(data, { abortEarly: false });
};