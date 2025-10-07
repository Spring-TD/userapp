// src/routes/kycRoutes.ts
import { Router } from 'express';
import { validateKYCSubmission } from '../middleware/kycValidation';
import { authenticate } from '../middleware/auth';
import { authenticateService } from '../middleware/serviceAuth';
import { auditLog } from '../middleware/audit';
import { KYCController } from '../controllers/kycController';
import { individualKycRoutes } from './individualKycRoutes';
import { businessKycRoutes } from './businessKycRoutes';
import { complianceAdminRoutes } from './complianceAdminRoutes';
import { livenessRoutes } from './livenessRoutes';

const router = Router();

// Apply audit logging middleware to all routes
router.use(auditLog);

// Apply service authentication middleware to allow service-to-service requests
router.use(authenticateService);

// Separate routes for different customer types
router.use('/individual', individualKycRoutes);
router.use('/business', businessKycRoutes);
router.use('/admin', complianceAdminRoutes);
router.use('/liveness', livenessRoutes);

// Legacy/Generic KYC routes (for backward compatibility)
router.post('/submit', authenticate, validateKYCSubmission, KYCController.submitKYC);
router.get('/status/:userId', authenticate, KYCController.getKYCStatus);
router.post('/profile/:userId', authenticate, KYCController.createMinimalKYCProfile);
router.get('/documents/:userId', authenticate, KYCController.getAllKYCDocuments);
router.get('/document/:documentId', authenticate, KYCController.getKYCDocument);
router.put('/document/:documentId/status', authenticate, KYCController.updateKYCDocumentStatus);
router.post('/review/:kycId', authenticate, KYCController.reviewKYCSubmission);
router.get('/search', authenticate, KYCController.searchKYCProfiles);

router.post('/business/:merchantId/shareholders/create', KYCController.createShareholderData);
router.get('/business/:merchantId/shareholders', KYCController.getShareholderData);
router.put('/business/:merchantId/shareholders', KYCController.updateShareholderData);

export { router as kycRoutes };