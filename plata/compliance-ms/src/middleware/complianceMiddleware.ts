// src/middleware/complianceMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { UserType, RiskLevel, BusinessType, KYCStatus } from '../types/kycTypes';
import { kycService } from '../services/kycService';

// Enhanced middleware for individual customer compliance
export const requireIndividualCustomer = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      logger.warn('Individual compliance access denied - User not authenticated');
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    // Check if user type is individual
    if (req.user.userType !== UserType.INDIVIDUAL) {
      logger.warn('Individual compliance access denied', {
        userId: req.user.userId,
        userType: req.user.userType
      });
      
      return res.status(403).json({
        success: false,
        error: 'Individual customer access required'
      });
    }
    
    logger.info('Individual compliance access granted', {
      userId: req.user.userId
    });
    
    next();
  } catch (error) {
    logger.error('Error in individual compliance middleware', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Enhanced middleware for business customer compliance
export const requireBusinessCustomer = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      logger.warn('Business compliance access denied - User not authenticated');
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    // Check if user type is merchant/business
    if (req.user.userType !== UserType.MERCHANT) {
      logger.warn('Business compliance access denied', {
        userId: req.user.userId,
        userType: req.user.userType
      });
      
      return res.status(403).json({
        success: false,
        error: 'Business customer access required'
      });
    }
    
    logger.info('Business compliance access granted', {
      userId: req.user.userId
    });
    
    next();
  } catch (error) {
    logger.error('Error in business compliance middleware', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Middleware to check high-risk customer access (enhanced due diligence required)
export const requireHighRiskApproval = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Get KYC status for the user
    const result = await kycService.getKYCStatus(req.user.userId, req.user.userId);
    
    if (!result.success) {
      logger.warn('High-risk check failed - KYC status not found', {
        userId: req.user.userId
      });
      
      return res.status(403).json({
        success: false,
        error: 'KYC verification required'
      });
    }

    // Check if user has high risk and requires enhanced approval
    const riskLevel = result.data?.riskLevel;
    if (riskLevel === RiskLevel.HIGH || riskLevel === RiskLevel.VERY_HIGH) {
      // Check if enhanced due diligence is completed
      if (result.data?.status !== KYCStatus.APPROVED) {
        logger.warn('High-risk customer access denied - Enhanced due diligence required', {
          userId: req.user.userId,
          riskLevel
        });
        
        return res.status(403).json({
          success: false,
          error: 'Enhanced due diligence approval required for high-risk customers'
        });
      }
    }
    
    next();
  } catch (error) {
    logger.error('Error in high-risk approval middleware', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Middleware for business type specific validation
export const validateBusinessType = (allowedTypes: BusinessType[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || req.user.userType !== UserType.MERCHANT) {
        return res.status(403).json({
          success: false,
          error: 'Business customer access required'
        });
      }

      const surveyResult = await kycService.getBusinessSurvey(req.user.userId);
      if (!surveyResult.success || !surveyResult.data) {
        return res.status(403).json({
          success: false,
          error: 'Business survey required for this action'
        });
      }

      const businessType = (surveyResult.data as any)?.businessType;
      if (!businessType || !allowedTypes.includes(businessType as any)) {
        logger.warn('Business type access denied', {
          userId: req.user.userId,
          businessType: businessType,
          allowedTypes
        });
        
        return res.status(403).json({
          success: false,
          error: `Access restricted to: ${allowedTypes.join(', ')}`
        });
      }
      
      next();
    } catch (error) {
      logger.error('Error in business type validation middleware', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
};

// Middleware to validate document submission requirements
export const validateDocumentRequirements = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userType, documents, businessDocuments } = req.body;
    // Business submit sends businessDocuments; individual/legacy sends documents
    const documentsToCheck = documents ?? businessDocuments;

    if (!userType) {
      return res.status(400).json({
        success: false,
        error: 'User type is required'
      });
    }

    if (userType === UserType.INDIVIDUAL) {
      if (!documentsToCheck || !Array.isArray(documentsToCheck) || documentsToCheck.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'User type and documents are required'
        });
      }

      const documentTypes = documentsToCheck.map((doc: any) => doc.type);
      const requiredDocs = ['identity', 'address'];
      const missingDocs = requiredDocs.filter(doc => !documentTypes.includes(doc));

      if (missingDocs.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Missing required documents for individual: ${missingDocs.join(', ')}`
        });
      }
    } else if (userType === UserType.MERCHANT) {
      // Business KYC: documents are optional on submit; merchants may upload the rest later (PUT /business/documents).
      if (
        documentsToCheck !== undefined &&
        documentsToCheck !== null &&
        !Array.isArray(documentsToCheck)
      ) {
        return res.status(400).json({
          success: false,
          error: 'businessDocuments must be an array when provided'
        });
      }
    } else if (!documentsToCheck || !Array.isArray(documentsToCheck) || documentsToCheck.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'User type and documents are required'
      });
    }

    next();
  } catch (error) {
    logger.error('Error in document requirements validation', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Middleware for compliance officer role verification
// Compliance officer = admin from client-auth-ms (JWT must have userType === 'admin')
export const requireComplianceOfficer = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (req.user.userType !== UserType.ADMIN) {
      logger.warn('Compliance officer access denied - admin role required', {
        userId: req.user.userId,
        userType: req.user.userType
      });
      return res.status(403).json({
        success: false,
        error: 'Compliance officer access required (admin role from client-auth-ms)'
      });
    }

    next();
  } catch (error) {
    logger.error('Error in compliance officer middleware', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};