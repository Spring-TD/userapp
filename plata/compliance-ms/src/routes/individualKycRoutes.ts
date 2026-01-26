// src/routes/individualKycRoutes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { 
  requireIndividualCustomer, 
  validateDocumentRequirements,
  requireHighRiskApproval 
} from '../middleware/complianceMiddleware';
import { KYCController } from '../controllers/kycController';

const router = Router();

// Apply common middleware
router.use(auditLog);
router.use(authenticate);
router.use(requireIndividualCustomer);

// Individual KYC routes
router.post('/submit', validateDocumentRequirements, KYCController.submitIndividualKYC);
router.get('/status', KYCController.getKYCStatus);
router.get('/documents', KYCController.getAllKYCDocuments);
router.get('/document/:documentId', KYCController.getKYCDocument);
router.get('/risk-assessment', KYCController.getIndividualRiskAssessment);
router.put('/personal-info', KYCController.updatePersonalInfo);

// High-risk individual specific routes
router.get('/enhanced-verification', requireHighRiskApproval, KYCController.getEnhancedVerificationStatus);

export { router as individualKycRoutes };