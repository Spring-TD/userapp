// src/routes/businessKycRoutes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { 
  requireBusinessCustomer, 
  validateDocumentRequirements,
  validateBusinessType,
  requireHighRiskApproval 
} from '../middleware/complianceMiddleware';
import { BusinessType } from '../types/kycTypes';
import { KYCController } from '../controllers/kycController';

const router = Router();

// Apply common middleware
router.use(auditLog);
router.use(authenticate);
router.use(requireBusinessCustomer);

// Business KYC routes
router.post('/submit', validateDocumentRequirements, KYCController.submitBusinessKYC);
router.get('/status', KYCController.getKYCStatus);
router.get('/documents', KYCController.getAllKYCDocuments);
router.get('/document/:documentId', KYCController.getKYCDocument);
router.get('/business-info', KYCController.getBusinessInfo);
router.get('/business-survey', KYCController.getBusinessSurvey);
router.get('/beneficial-owners', KYCController.getBeneficialOwners);
router.get('/risk-assessment', KYCController.getBusinessRiskAssessment);

// Business information updates
router.put('/business-info', KYCController.updateBusinessInfo);
router.put('/business-survey', KYCController.updateBusinessSurvey);
router.put('/beneficial-owners', KYCController.updateBeneficialOwners);

// High-risk business specific routes
router.get('/enhanced-due-diligence', requireHighRiskApproval, KYCController.getEnhancedDueDiligence);

// Business type specific routes
router.get('/corporate-structure', 
  validateBusinessType([
    BusinessType.CORPORATION, 
    BusinessType.LIMITED_LIABILITY_COMPANY
  ]), 
  KYCController.getCorporateStructure
);

router.get('/non-profit-verification', 
  validateBusinessType([BusinessType.NON_PROFIT]), 
  KYCController.getNonProfitVerification
);

router.get('/government-verification', 
  validateBusinessType([BusinessType.GOVERNMENT_ENTITY]), 
  KYCController.getGovernmentVerification
);

export { router as businessKycRoutes };