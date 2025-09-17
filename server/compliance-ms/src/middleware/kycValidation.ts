// src/middleware/kycValidation.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { KYCStatus } from '../types/kycTypes';

// Middleware to validate KYC status
export const validateKYCStatus = (req: Request, res: Response, next: NextFunction) => {
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
    
    next();
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
export const validateDocumentType = (req: Request, res: Response, next: NextFunction) => {
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
    
    next();
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
export const validateKYCSubmission = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate KYC submission data
    const { error, value } = validateKYCSubmission(req.body);
    
    if (error) {
      logger.warn('KYC submission validation failed', {
        error: error.details.map(detail => detail.message)
      });
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(detail => detail.message)
      });
    }
    
    // Attach validated data to request
    req.body = value;
    
    next();
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