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

      const result = await kycService.getKYCStatus(req.user.userId, req.user.userId);
      
      if (!result.success) {
        return res.status(403).json({
          success: false,
          error: 'Business KYC verification required'
        });
      }

      const businessInfo = (result.data as any)?.businessInfo;
      if (!businessInfo || !allowedTypes.includes(businessInfo.businessType)) {
        logger.warn('Business type access denied', {
          userId: req.user.userId,
          businessType: businessInfo?.businessType,
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
    const { userType, documents } = req.body;
    
    if (!userType || !documents) {
      return res.status(400).json({
        success: false,
        error: 'User type and documents are required'
      });
    }

    const documentTypes = documents.map((doc: any) => doc.type);
    
    if (userType === UserType.INDIVIDUAL) {
      // Check individual required documents
      const requiredDocs = ['identity', 'address'];
      const missingDocs = requiredDocs.filter(doc => !documentTypes.includes(doc));
      
      if (missingDocs.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Missing required documents for individual: ${missingDocs.join(', ')}`
        });
      }
    } else if (userType === UserType.MERCHANT) {
      // Check business required documents
      const requiredDocs = ['business_registration', 'beneficial_ownership', 'director_identification', 'bank'];
      const missingDocs = requiredDocs.filter(doc => !documentTypes.includes(doc));
      
      if (missingDocs.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Missing required documents for business: ${missingDocs.join(', ')}`
        });
      }
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
export const requireComplianceOfficer = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    // Check if user has compliance officer role
    // For now, we'll assume any authenticated user can be a compliance officer
    // In a real implementation, this would check user roles from a database
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