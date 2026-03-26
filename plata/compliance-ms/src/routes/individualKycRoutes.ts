/**
 * Individual KYC routes (mounted at /api/v1/kyc/individual).
 *
 * @openapi
 * /api/v1/kyc/individual/submit:
 *   post:
 *     summary: Submit individual KYC
 *     tags: [KYC - Individual]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KYC submitted
 * /api/v1/kyc/individual/status:
 *   get:
 *     summary: Get individual KYC status
 *     tags: [KYC - Individual]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KYC status
 * /api/v1/kyc/individual/documents:
 *   get:
 *     summary: Get individual KYC documents
 *     tags: [KYC - Individual]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of documents
 * /api/v1/kyc/individual/document/{documentId}:
 *   get:
 *     summary: Get document by ID
 *     tags: [KYC - Individual]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Document details
 * /api/v1/kyc/individual/risk-assessment:
 *   get:
 *     summary: Get individual risk assessment
 *     tags: [KYC - Individual]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Risk assessment
 * /api/v1/kyc/individual/personal-info:
 *   put:
 *     summary: Update personal info
 *     tags: [KYC - Individual]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Updated
 * /api/v1/kyc/individual/enhanced-verification:
 *   get:
 *     summary: Get enhanced verification status (high-risk)
 *     tags: [KYC - Individual]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Verification status
 */
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

// Compliance messaging (individual sends to admin; individual gets thread)
router.post('/message', KYCController.sendMessageToCompliance);
router.get('/messages', KYCController.getComplianceMessages);

// High-risk individual specific routes
router.get('/enhanced-verification', requireHighRiskApproval, KYCController.getEnhancedVerificationStatus);

export { router as individualKycRoutes };