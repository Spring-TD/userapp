// src/middleware/kycValidation.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { KYCStatus, DocumentType } from '../types/kycTypes';
import { validateKYCSubmission as validateKYCSubmissionUtil } from '../utils/validation';

// Middleware to validate KYC status
export const validateKYCStatus = (req: Request, res: Response, next: NextFunction): any => {
  try {
    // Get status from request
    const { status } = req.body;
    
    // Validate status
    if (!Object.values(KYCStatus).includes(status)) {
      logger.warn('KYC status validation failed', {
        error: `Invalid KYC status: ${status}`
      });
      return res.status(400).json({
        success: false,
        error: `Invalid KYC status: ${status}`
      });
    }
    
    return next();
  } catch (error) {
    logger.error('Error in KYC status validation', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Middleware to validate document type
export const validateDocumentType = (req: Request, res: Response, next: NextFunction): any => {
  try {
    // Get document type from request
    const { type } = req.body;
    
    // Validate document type
    if (!Object.values(DocumentType).includes(type)) {
      logger.warn('Document type validation failed', {
        error: `Invalid document type: ${type}`
      });
      return res.status(400).json({
        success: false,
        error: `Invalid document type: ${type}`
      });
    }
    
    return next();
  } catch (error) {
    logger.error('Error in document type validation', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Middleware to validate KYC submission
export const validateKYCSubmission = (req: Request, res: Response, next: NextFunction): any => {
  try {
    // Validate KYC submission data
    const { error, value } = validateKYCSubmissionUtil(req.body);
    
    if (error) {
      logger.warn('KYC submission validation failed', {
        error: (error as any).details?.map((detail: any) => detail.message)
      });
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: (error as any).details?.map((detail: any) => detail.message)
      });
    }
    
    // Attach validated data to request
    req.body = value;
    
    return next();
  } catch (error) {
    logger.error('Error in KYC submission validation', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};