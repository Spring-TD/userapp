// src/controllers/kycController.ts
import { Request, Response, NextFunction } from 'express';
import { kycService } from '../services/kycService';
import { logger } from '../utils/logger';
import { KYCStatus, UserType, RiskLevel, BusinessType, ComplianceWorkflowStatus } from '../types/kycTypes';
import { livenessService } from '../services/livenessService';
import { amlVerificationService, AMLVerificationResult } from '../services/amlVerificationService';
import { sanctionsService, SanctionsCheckRequest } from '../services/sanctionsService';

// Enhanced KYC controller with separated individual and business methods
export class KYCController {
  // Submit Individual KYC
  static async submitIndividualKYC(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await kycService.submitIndividualKYC(req.body, req.user?.userId);
      
      if (!result.success) {
        logger.warn('Individual KYC submission failed', {
          userId: req.user?.userId,
          error: result.error
        });
        
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }
      
      logger.info('Individual KYC submitted successfully', {
        userId: req.user?.userId,
        kycId: result.data?.kycId,
        riskLevel: result.data?.riskLevel
      });
      
      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Submit Business KYC
  static async submitBusinessKYC(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await kycService.submitBusinessKYC(req.body, req.user?.userId);
      
      if (!result.success) {
        logger.warn('Business KYC submission failed', {
          userId: req.user?.userId,
          error: result.error
        });
        
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }
      
      logger.info('Business KYC submitted successfully', {
        userId: req.user?.userId,
        kycId: result.data?.kycId,
        riskLevel: result.data?.riskLevel,
        shareholderCount: result.data?.shareholderCount
      });
      
      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get KYC status for a user
  static async getKYCStatus(req: Request, res: Response, next: NextFunction) {
    try {
      // For service-to-service requests, use the target user ID for both params
      // For user requests, use the authenticated user ID as the requester
      const requesterId = req.service ? req.params.userId : req.user?.userId;
      const result = await kycService.getKYCStatus(req.params.userId, requesterId);
      
      if (!result.success) {
        logger.warn('KYC status retrieval failed', {
          userId: req.params.userId,
          error: result.error
        });
        
        return res.status(404).json(result);
      }
      
      logger.info('KYC status retrieved successfully', {
        userId: req.params.userId,
        status: result.data?.status
      });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Create a minimal KYC profile for a user
  static async createMinimalKYCProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { userType } = req.body;
      
      // For service-to-service requests, use the service as the requester
      // For user requests, use the authenticated user ID as the requester
      const requesterId = req.service ? 'service' : req.user?.userId;
      
      const result = await kycService.createMinimalKYCProfile(userId, userType, requesterId);
      
      if (!result.success) {
        logger.warn('Failed to create minimal KYC profile', {
          userId,
          error: result.error
        });
        
        return res.status(400).json(result);
      }
      
      logger.info('Minimal KYC profile created successfully', {
        userId,
        userType,
        status: result.data?.status
      });
      
      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Update KYC document status
  static async updateKYCDocumentStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { documentId } = req.params;
      const { status, rejectionReason } = req.body;
      const result = await kycService.updateKYCDocumentStatus(documentId, status as KYCStatus, rejectionReason);
      
      if (!result.success) {
        logger.warn('KYC document status update failed', {
          documentId,
          error: result.error
        });
        
        return res.status(404).json(result);
      }
      
      logger.info('KYC document status updated successfully', {
        documentId,
        newStatus: status
      });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get KYC document by ID
  static async getKYCDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await kycService.getKYCDocument(req.params.documentId);
      
      if (!result.success) {
        logger.warn('KYC document retrieval failed', {
          documentId: req.params.documentId,
          error: result.error
        });
        
        return res.status(404).json(result);
      }
      
      logger.info('KYC document retrieved successfully', {
        documentId: req.params.documentId,
        documentType: result.data?.type
      });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get all KYC documents for a user
  static async getAllKYCDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await kycService.getAllKYCDocuments(req.params.userId);
      
      if (!result.success) {
        logger.warn('KYC document retrieval failed', {
          userId: req.params.userId,
          error: result.error
        });
        
        return res.status(404).json(result);
      }
      
      logger.info('KYC documents retrieved successfully', {
        userId: req.params.userId,
        documentCount: result.data?.length
      });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Search KYC profiles
  static async searchKYCProfiles(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await kycService.searchKYCProfiles(req.query);
      
      if (!result.success) {
        logger.warn('KYC profile search failed', {
          error: result.error
        });
        
        return res.status(400).json(result);
      }
      
      logger.info('KYC profiles retrieved successfully', {
        count: result.data?.length
      });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Validate KYC submission
  static async validateKYCSubmission(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await kycService.validateKYC(req.body, req.user?.userId);
      
      if ('error' in result && result.error) {
        logger.warn('KYC validation failed', {
          userId: req.user?.userId,
          error: result.error.message
        });
        
        return res.status(400).json({
          success: false,
          error: result.error.message
        });
      }
      
      req.body = result.data;
      logger.info('KYC submission validated successfully', {
        userId: req.user?.userId,
        validationDate: result.data?.validationDate
      });
      
      next();
    } catch (error) {
      next(error);
    }
  }

  // Verify AML document using third-party provider
  static async verifyAMLDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { documentId, provider } = req.body;
      
      // Get the document by ID
      const documentResult = await kycService.getKYCDocument(documentId);
      
      if (!documentResult.success) {
        logger.warn('AML document verification failed - document not found', {
          documentId,
          error: documentResult.error
        });
        
        return res.status(404).json({
          success: false,
          error: documentResult.error || 'Document not found'
        });
      }
      
      const document = documentResult.data;
      
      // Verify the document using the AML provider
      const verificationResult: AMLVerificationResult = await amlVerificationService.verifyDocument(document, provider);
      
      // Update document status based on verification result
      const updateSuccess = await amlVerificationService.updateDocumentStatusBasedOnVerification(documentId, verificationResult);
      
      if (!updateSuccess) {
        logger.error('Failed to update document status after AML verification', {
          documentId,
          verificationId: verificationResult.verificationId
        });
        
        return res.status(500).json({
          success: false,
          error: 'Failed to update document status after verification'
        });
      }
      
      logger.info('AML document verification completed', {
        documentId,
        provider: verificationResult.providerId,
        approved: verificationResult.overallApproved,
        suspicious: verificationResult.suspicious
      });
      
      // If the document is suspicious, return a special response
      if (verificationResult.suspicious) {
        return res.status(200).json({
          success: true,
          message: 'Document verification completed but requires manual review',
          data: {
            documentId,
            verificationResult,
            status: KYCStatus.REVIEW,
            message: 'Document flagged for manual review'
          }
        });
      }
      
      // If the document is rejected
      if (!verificationResult.overallApproved) {
        return res.status(200).json({
          success: true,
          message: 'Document verification completed but rejected',
          data: {
            documentId,
            verificationResult,
            status: KYCStatus.REJECTED,
            message: verificationResult.reason || 'Document did not pass verification'
          }
        });
      }
      
      // Document approved
      return res.status(200).json({
        success: true,
        message: 'Document verification completed and approved',
        data: {
          documentId,
          verificationResult,
          status: KYCStatus.APPROVED,
          message: 'Document approved'
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Review KYC submission
  static async reviewKYCSubmission(req: Request, res: Response, next: NextFunction) {
    try {
      const { kycId } = req.params;
      const { status, rejectionReason } = req.body;
      const result = await kycService.reviewKYC(kycId, status as KYCStatus, rejectionReason, req.user?.userId);
      
      if (!result.success) {
        logger.warn('KYC review failed', {
          kycId,
          error: result.error
        });
        
        return res.status(400).json(result);
      }
      
      logger.info('KYC submission reviewed successfully', {
        kycId,
        newStatus: status,
        reviewedBy: req.user?.userId
      });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Submit KYC for backward compatibility
  static async submitKYC(req: Request, res: Response, next: NextFunction) {
    try {
      const result: any = await kycService.submitKYC(req.body, req.user?.userId);
      
      if (!result.success) {
        logger.warn('KYC submission failed', {
          userId: req.user?.userId,
          error: result.error || 'Unknown error'
        });
        
        return res.status(400).json({
          success: false,
          error: result.error || 'Unknown error'
        });
      }
      
      logger.info('KYC submitted successfully', {
        userId: req.user?.userId,
        documentCount: result.data?.documents?.length
      });
      
      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get business information for a user
  static async getBusinessInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }
      
      const result = await kycService.getBusinessInfo(userId);
      
      if (!result.success) {
        logger.warn('Business info retrieval failed', {
          userId,
          error: result.error
        });
        
        return res.status(404).json(result);
      }
      
      logger.info('Business info retrieved successfully', {
        userId
      });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get business survey data for a user
  static async getBusinessSurvey(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }
      
      const result = await kycService.getBusinessSurvey(userId);
      
      if (!result.success) {
        logger.warn('Business survey retrieval failed', {
          userId,
          error: result.error
        });
        
        return res.status(404).json(result);
      }
      
      logger.info('Business survey retrieved successfully', {
        userId
      });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get shareholders (beneficial owners) for a user
  static async getBeneficialOwners(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }
      
      const result = await kycService.getShareholders(userId);
      
      if (!result.success) {
        logger.warn('Shareholders retrieval failed', {
          userId,
          error: result.error
        });
        
        return res.status(404).json(result);
      }
      
      logger.info('Shareholders retrieved successfully', {
        userId,
        shareholderCount: result.data?.length
      });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get business risk assessment for a user
  static async getBusinessRiskAssessment(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }
      
      const result = await kycService.getBusinessRiskAssessment(userId);
      
      if (!result.success) {
        logger.warn('Business risk assessment retrieval failed', {
          userId,
          error: result.error
        });
        
        return res.status(404).json(result);
      }
      
      logger.info('Business risk assessment retrieved successfully', {
        userId
      });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Update business information for a user
  static async updateBusinessInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }
      
      const result = await kycService.updateBusinessInfo(userId, req.body);
      
      if (!result.success) {
        logger.warn('Business info update failed', {
          userId,
          error: result.error
        });
        
        return res.status(400).json(result);
      }
      
      logger.info('Business info updated successfully', {
        userId
      });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Update business survey data for a user
  static async updateBusinessSurvey(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }
      
      const result = await kycService.updateBusinessSurvey(userId, req.body);
      
      if (!result.success) {
        logger.warn('Business survey update failed', {
          userId,
          error: result.error
        });
        
        return res.status(400).json(result);
      }
      
      logger.info('Business survey updated successfully', {
        userId
      });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Update shareholders (beneficial owners) for a user
  static async updateBeneficialOwners(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }
      
      const result = await kycService.updateShareholders(userId, req.body);
      
      if (!result.success) {
        logger.warn('Shareholders update failed', {
          userId,
          error: result.error
        });
        
        return res.status(400).json(result);
      }
      
      logger.info('Shareholders updated successfully', {
        userId
      });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get enhanced due diligence data for high-risk businesses
  static async getEnhancedDueDiligence(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }
      
      const result = await kycService.getEnhancedDueDiligence(userId);
      
      if (!result.success) {
        logger.warn('Enhanced due diligence retrieval failed', {
          userId,
          error: result.error
        });
        
        return res.status(404).json(result);
      }
      
      logger.info('Enhanced due diligence retrieved successfully', {
        userId
      });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get corporate structure information for corporations and LLCs
  static async getCorporateStructure(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }
      
      const result = await kycService.getCorporateStructure(userId);
      
      if (!result.success) {
        logger.warn('Corporate structure retrieval failed', {
          userId,
          error: result.error
        });
        
        return res.status(404).json(result);
      }
      
      logger.info('Corporate structure retrieved successfully', {
        userId
      });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get non-profit verification information
  static async getNonProfitVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }
      
      const result = await kycService.getNonProfitVerification(userId);
      
      if (!result.success) {
        logger.warn('Non-profit verification retrieval failed', {
          userId,
          error: result.error
        });
        
        return res.status(404).json(result);
      }
      
      logger.info('Non-profit verification retrieved successfully', {
        userId
      });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get government verification information
  static async getGovernmentVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }
      
      const result = await kycService.getGovernmentVerification(userId);
      
      if (!result.success) {
        logger.warn('Government verification retrieval failed', {
          userId,
          error: result.error
        });
        
        return res.status(404).json(result);
      }
      
      logger.info('Government verification retrieved successfully', {
        userId
      });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get individual profile
  static async getIndividualProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId || req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Get current KYC profile
      const result = await kycService.getKYCStatus(userId, req.user?.userId);
      
      if (!result.success) {
        return res.status(404).json(result);
      }

      if (result.data?.userType !== UserType.INDIVIDUAL) {
        return res.status(400).json({
          success: false,
          error: 'User is not an individual customer'
        });
      }

      // Return individual profile information
      return res.status(200).json({
        success: true,
        data: {
          userId,
          personalInfo: (result.data as any).personalInfo,
          riskLevel: result.data?.riskLevel,
          riskAssessment: (result.data as any).riskAssessment,
          documents: (result.data as any).documents,
          status: result.data?.status,
          submittedAt: result.data?.submittedAt,
          completedAt: result.data?.completedAt
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get business profile
  static async getBusinessProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId || req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Get current KYC profile
      const result = await kycService.getKYCStatus(userId, req.user?.userId);
      
      if (!result.success) {
        return res.status(404).json(result);
      }

      if (result.data?.userType !== UserType.MERCHANT) {
        return res.status(400).json({
          success: false,
          error: 'User is not a business customer'
        });
      }

      // Return business profile information
      return res.status(200).json({
        success: true,
        data: {
          userId,
          businessInfo: (result.data as any).businessInfo,
          beneficialOwners: (result.data as any).beneficialOwners,
          directors: (result.data as any).directors,
          riskLevel: result.data?.riskLevel,
          riskAssessment: (result.data as any).riskAssessment,
          documents: (result.data as any).documents,
          status: result.data?.status,
          submittedAt: result.data?.submittedAt,
          completedAt: result.data?.completedAt
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Update individual risk level
  static async updateIndividualRiskLevel(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId;
      const { riskLevel, notes } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      if (!riskLevel || !Object.values(RiskLevel).includes(riskLevel as RiskLevel)) {
        return res.status(400).json({
          success: false,
          error: 'Valid risk level is required'
        });
      }

      // Update risk level in the profile
      // This would typically involve updating the database
      logger.info('Individual risk level updated', {
        userId,
        newRiskLevel: riskLevel,
        updatedBy: req.user?.userId
      });

      return res.status(200).json({
        success: true,
        message: 'Individual risk level updated successfully',
        data: {
          userId,
          riskLevel
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Update business risk level
  static async updateBusinessRiskLevel(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId;
      const { riskLevel, notes } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      if (!riskLevel || !Object.values(RiskLevel).includes(riskLevel as RiskLevel)) {
        return res.status(400).json({
          success: false,
          error: 'Valid risk level is required'
        });
      }

      // Update risk level in the profile
      // This would typically involve updating the database
      logger.info('Business risk level updated', {
        userId,
        newRiskLevel: riskLevel,
        updatedBy: req.user?.userId
      });

      return res.status(200).json({
        success: true,
        message: 'Business risk level updated successfully',
        data: {
          userId,
          riskLevel
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Review individual KYC
  static async reviewIndividualKYC(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId;
      const { status, rejectionReason, notes } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      if (!status || !Object.values(KYCStatus).includes(status as KYCStatus)) {
        return res.status(400).json({
          success: false,
          error: 'Valid KYC status is required'
        });
      }

      // Review individual KYC
      // This would typically involve updating the database
      logger.info('Individual KYC reviewed', {
        userId,
        newStatus: status,
        reviewedBy: req.user?.userId
      });

      return res.status(200).json({
        success: true,
        message: 'Individual KYC reviewed successfully',
        data: {
          userId,
          status,
          reviewedBy: req.user?.userId,
          reviewDate: new Date()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Review business KYC
  static async reviewBusinessKYC(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId;
      const { status, rejectionReason, notes } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      if (!status || !Object.values(KYCStatus).includes(status as KYCStatus)) {
        return res.status(400).json({
          success: false,
          error: 'Valid KYC status is required'
        });
      }

      // Review business KYC
      // This would typically involve updating the database
      logger.info('Business KYC reviewed', {
        userId,
        newStatus: status,
        reviewedBy: req.user?.userId
      });

      return res.status(200).json({
        success: true,
        message: 'Business KYC reviewed successfully',
        data: {
          userId,
          status,
          reviewedBy: req.user?.userId,
          reviewDate: new Date()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get business beneficial owners
  static async getBusinessBeneficialOwners(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId || req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Get current KYC profile
      const result = await kycService.getKYCStatus(userId, req.user?.userId);
      
      if (!result.success) {
        return res.status(404).json(result);
      }

      if (result.data?.userType !== UserType.MERCHANT) {
        return res.status(400).json({
          success: false,
          error: 'User is not a business customer'
        });
      }

      // Return beneficial owners information
      return res.status(200).json({
        success: true,
        data: {
          userId,
          beneficialOwners: (result.data as any).beneficialOwners,
          totalOwnership: (result.data as any).beneficialOwners.reduce(
            (sum: number, owner: any) => sum + (owner.ownershipPercentage || 0), 
            0
          )
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get business corporate structure
  static async getBusinessCorporateStructure(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId || req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Get current KYC profile
      const result = await kycService.getKYCStatus(userId, req.user?.userId);
      
      if (!result.success) {
        return res.status(404).json(result);
      }

      if (result.data?.userType !== UserType.MERCHANT) {
        return res.status(400).json({
          success: false,
          error: 'User is not a business customer'
        });
      }

      // Return corporate structure information
      return res.status(200).json({
        success: true,
        data: {
          userId,
          businessInfo: (result.data as any).businessInfo,
          beneficialOwners: (result.data as any).beneficialOwners,
          directors: (result.data as any).directors,
          corporateDocuments: (result.data as any).documents.filter(
            (doc: any) => doc.type === 'corporate_structure' || doc.type === 'articles_of_incorporation'
          )
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Update workflow status
  static async updateWorkflowStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const kycId = req.params.kycId;
      const { workflowStatus, notes } = req.body;
      
      if (!kycId) {
        return res.status(400).json({
          success: false,
          error: 'KYC ID is required'
        });
      }

      if (!workflowStatus || !Object.values(ComplianceWorkflowStatus).includes(workflowStatus as ComplianceWorkflowStatus)) {
        return res.status(400).json({
          success: false,
          error: 'Valid workflow status is required'
        });
      }

      // Update workflow status
      const result = await kycService.updateWorkflowStatus(kycId, workflowStatus as ComplianceWorkflowStatus, req.user?.userId);
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get pending workflows
  static async getPendingWorkflows(req: Request, res: Response, next: NextFunction) {
    try {
      // Get pending workflows
      const result = await kycService.getPendingWorkflows();
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get pending reviews
  static async getPendingReviews(req: Request, res: Response, next: NextFunction) {
    try {
      // Get pending reviews
      const result = await kycService.getPendingReviews();
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get high risk profiles
  static async getHighRiskProfiles(req: Request, res: Response, next: NextFunction) {
    try {
      // Get high risk profiles
      const result = await kycService.getHighRiskProfiles();
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get risk summary report
  static async getRiskSummaryReport(req: Request, res: Response, next: NextFunction) {
    try {
      // Get risk summary report
      const result = await kycService.getRiskSummaryReport();
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get compliance metrics
  static async getComplianceMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      // Get compliance metrics
      const result = await kycService.getComplianceMetrics();
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get document status report
  static async getDocumentStatusReport(req: Request, res: Response, next: NextFunction) {
    try {
      // Get document status report
      const result = await kycService.getDocumentStatusReport();
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get all registered users (new admin function)
  static async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await kycService.getAllUsers();
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get all compliance documents (new admin function)
  static async getAllComplianceDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await kycService.getAllComplianceDocuments();
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Approve/Disapprove with note (new admin function)
  static async approveDisapproveUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { status, note } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      if (!status || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Valid status (approved/rejected) is required'
        });
      }

      const result = await kycService.approveDisapproveUser(userId, status as 'approved' | 'rejected', note, req.user?.userId);
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Send message to user (new admin function)
  static async sendMessageToUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { message } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      if (!message) {
        return res.status(400).json({
          success: false,
          error: 'Message is required'
        });
      }

      const result = await kycService.sendMessageToUser(userId, message, req.user?.userId);
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Block user (new admin function)
  static async blockUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { reason } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const result = await kycService.blockUser(userId, reason, req.user?.userId);
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Unblock user (new admin function)
  static async unblockUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const result = await kycService.unblockUser(userId, req.user?.userId);
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Verify Certificate of Incorporation with CAC (new admin function)
  static async verifyCertificateWithCAC(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { registrationNumber, companyName } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      if (!registrationNumber || !companyName) {
        return res.status(400).json({
          success: false,
          error: 'Registration number and company name are required'
        });
      }

      const result = await kycService.verifyCertificateWithCAC(
        userId, 
        registrationNumber, 
        companyName, 
        req.user?.userId
      );
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Check sanctions for an individual or business
  static async checkSanctions(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, companyId, country } = req.body;
      
      // Validate input
      if (!name) {
        logger.warn('Sanctions check failed: name is required');
        return res.status(400).json({
          success: false,
          error: 'Name is required for sanctions check'
        });
      }
      
      // Prepare the request
      const sanctionsRequest: SanctionsCheckRequest = {
        name,
        companyId,
        country
      };
      
      // Perform the sanctions check
      const result = await sanctionsService.checkSanctions(sanctionsRequest);
      
      logger.info('Sanctions check completed', {
        name,
        companyId,
        country,
        flagged: result.flagged,
        matchCount: result.matches.length
      });
      
      // Return the result
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error during sanctions check', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return res.status(500).json({
        success: false,
        error: 'Internal server error during sanctions check'
      });
    }
  }

  // Get individual risk assessment
  static async getIndividualRiskAssessment(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }
      
      // Get KYC status which includes risk assessment
      const result = await kycService.getKYCStatus(userId, userId);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      return res.status(200).json({
        success: true,
        data: {
          riskLevel: result.data?.riskLevel,
          riskAssessment: (result.data as any).riskAssessment
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Update personal info for individual
  static async updatePersonalInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }
      
      const result = await kycService.updatePersonalInfo(userId, req.body);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      logger.info('Personal info updated successfully', { userId });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get enhanced verification status
  static async getEnhancedVerificationStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }
      
      const result = await kycService.getEnhancedDueDiligence(userId);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Create shareholder data (legacy endpoint - use updateBeneficialOwners instead)
  static async createShareholderData(req: Request, res: Response, next: NextFunction) {
    try {
      const { merchantId } = req.params;
      
      if (!merchantId) {
        return res.status(400).json({
          success: false,
          error: 'Merchant ID is required'
        });
      }
      
      return res.status(400).json({
        success: false,
        error: 'This endpoint is deprecated. Use PUT /beneficial-owners to update shareholders.'
      });
    } catch (error) {
      next(error);
    }
  }

  // Get shareholder data
  static async getShareholderData(req: Request, res: Response, next: NextFunction) {
    try {
      const { merchantId } = req.params;
      
      if (!merchantId) {
        return res.status(400).json({
          success: false,
          error: 'Merchant ID is required'
        });
      }
      
      const result = await kycService.getShareholders(merchantId);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Update shareholder data
  static async updateShareholderData(req: Request, res: Response, next: NextFunction) {
    try {
      const { merchantId } = req.params;
      
      if (!merchantId) {
        return res.status(400).json({
          success: false,
          error: 'Merchant ID is required'
        });
      }
      
      const result = await kycService.updateShareholders(merchantId, req.body);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      logger.info('Shareholder data updated successfully', { merchantId });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default KYCController;