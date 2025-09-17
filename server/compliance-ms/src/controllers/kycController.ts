// src/controllers/kycController.ts
import { Request, Response, NextFunction } from 'express';
import { kycService } from '../services/kycService';
import { logger } from '../utils/logger';
import { KYCStatus } from '../types/kycTypes';

// KYC controller
export class KYCController {
  // Submit KYC for individual user
  static async submitKYC(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = await kycService.submitKYC(req.body, req.user?.userId);
      
      if (error) {
        logger.warn('KYC submission failed', {
          userId: req.user?.userId,
          error: error.message
        });
        
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }
      
      logger.info('KYC submitted successfully', {
        userId: req.user?.userId,
        documentCount: value.data.documents.length
      });
      
      return res.status(201).json(value);
    } catch (error) {
      next(error);
    }
  }

  // Get KYC status for a user
  static async getKYCStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = await kycService.getKYCStatus(req.params.userId, req.user?.userId);
      
      if (error) {
        logger.warn('KYC status retrieval failed', {
          userId: req.params.userId,
          error: error.message
        });
        
        return res.status(404).json(error);
      }
      
      logger.info('KYC status retrieved successfully', {
        userId: req.params.userId,
        status: value.data.status
      });
      
      return res.status(200).json(value);
    } catch (error) {
      next(error);
    }
  }

  // Update KYC document status
  static async updateKYCDocumentStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { documentId } = req.params;
      const { status, rejectionReason } = req.body;
      const { error, value } = await kycService.updateKYCDocumentStatus(documentId, status as KYCStatus, rejectionReason);
      
      if (error) {
        logger.warn('KYC document status update failed', {
          documentId,
          error: error.message
        });
        
        return res.status(404).json(error);
      }
      
      logger.info('KYC document status updated successfully', {
        documentId,
        newStatus: status
      });
      
      return res.status(200).json(value);
    } catch (error) {
      next(error);
    }
  }

  // Get KYC document by ID
  static async getKYCDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = await kycService.getKYCDocument(req.params.documentId);
      
      if (error) {
        logger.warn('KYC document retrieval failed', {
          documentId: req.params.documentId,
          error: error.message
        });
        
        return res.status(404).json(error);
      }
      
      logger.info('KYC document retrieved successfully', {
        documentId: req.params.documentId,
        documentType: value.data.type
      });
      
      return res.status(200).json(value);
    } catch (error) {
      next(error);
    }
  }

  // Get all KYC documents for a user
  static async getAllKYCDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = await kycService.getAllKYCDocuments(req.params.userId);
      
      if (error) {
        logger.warn('KYC document retrieval failed', {
          userId: req.params.userId,
          error: error.message
        });
        
        return res.status(404).json(error);
      }
      
      logger.info('KYC documents retrieved successfully', {
        userId: req.params.userId,
        documentCount: value.data.length
      });
      
      return res.status(200).json(value);
    } catch (error) {
      next(error);
    }
  }

  // Search KYC profiles
  static async searchKYCProfiles(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = await kycService.searchKYCProfiles(req.query);
      
      if (error) {
        logger.warn('KYC profile search failed', {
          error: error.message
        });
        
        return res.status(400).json(error);
      }
      
      logger.info('KYC profiles retrieved successfully', {
        count: value.data.length
      });
      
      return res.status(200).json(value);
    } catch (error) {
      next(error);
    }
  }

  // Validate KYC submission
  static async validateKYCSubmission(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = await kycService.validateKYC(req.body, req.user?.userId);
      
      if (error) {
        logger.warn('KYC validation failed', {
          userId: req.user?.userId,
          error: error.message
        });
        
        return res.status(400).json(error);
      }
      
      req.body = value;
      logger.info('KYC submission validated successfully', {
        userId: req.user?.userId,
        validationDate: value.data.validationDate
      });
      
      next();
    } catch (error) {
      next(error);
    }
  }

  // Review KYC submission
  static async reviewKYCSubmission(req: Request, res: Response, next: NextFunction) {
    try {
      const { kycId } = req.params;
      const { status, rejectionReason } = req.body;
      const { error, value } = await kycService.reviewKYC(kycId, status as KYCStatus, rejectionReason, req.user?.userId);
      
      if (error) {
        logger.warn('KYC review failed', {
          kycId,
          error: error.message
        });
        
        return res.status(400).json(error);
      }
      
      logger.info('KYC submission reviewed successfully', {
        kycId,
        newStatus: status,
        reviewedBy: req.user?.userId
      });
      
      return res.status(200).json(value);
    } catch (error) {
      next(error);
    }
  }
}

export default KYCController;
