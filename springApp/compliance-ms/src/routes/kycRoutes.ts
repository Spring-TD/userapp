/**
 * KYC routes (mounted at /api/v1/kyc). Includes legacy routes and sub-routers for individual, business, admin, and liveness.
 *
 * @openapi
 * /api/v1/kyc/submit:
 *   post:
 *     summary: Submit KYC (legacy)
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KYC submitted
 * /api/v1/kyc/status/{userId}:
 *   get:
 *     summary: Get KYC status by user
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: KYC status
 * /api/v1/kyc/profile/{userId}:
 *   post:
 *     summary: Create minimal KYC profile
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Profile created
 * /api/v1/kyc/documents/{userId}:
 *   get:
 *     summary: Get all KYC documents for user
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of documents
 * /api/v1/kyc/document/{documentId}:
 *   get:
 *     summary: Get KYC document by ID
 *     tags: [KYC]
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
 *   put:
 *     summary: Update document status
 *     tags: [KYC]
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
 *         description: Status updated
 * /api/v1/kyc/review/{kycId}:
 *   post:
 *     summary: Review KYC submission
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: kycId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review recorded
 * /api/v1/kyc/search:
 *   get:
 *     summary: Search KYC profiles
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Search results
 * /api/v1/kyc/business/{merchantId}/shareholders/create:
 *   post:
 *     summary: Create shareholder data
 *     tags: [KYC - Business]
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Shareholder created
 * /api/v1/kyc/business/{merchantId}/shareholders:
 *   get:
 *     summary: Get shareholder data
 *     tags: [KYC - Business]
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Shareholder data
 *   put:
 *     summary: Update shareholder data
 *     tags: [KYC - Business]
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Shareholder updated
 */
// src/routes/kycRoutes.ts
import { Router } from 'express';
import multer from 'multer';
import { validateKYCSubmission } from '../middleware/kycValidation';
import { authenticate } from '../middleware/auth';
import { authenticateService } from '../middleware/serviceAuth';
import { auditLog } from '../middleware/audit';
import { KYCController } from '../controllers/kycController';
import { getMaxUploadSizeBytes } from '../services/spacesService';
import { individualKycRoutes } from './individualKycRoutes';
import { businessKycRoutes } from './businessKycRoutes';
import { complianceAdminRoutes } from './complianceAdminRoutes';
import { livenessRoutes } from './livenessRoutes';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: getMaxUploadSizeBytes() }
});

// Apply audit logging middleware to all routes
router.use(auditLog);

// Apply service authentication middleware to allow service-to-service requests
router.use(authenticateService);

// Separate routes for different customer types
router.use('/individual', individualKycRoutes);
router.use('/business', businessKycRoutes);
router.use('/admin', complianceAdminRoutes);
router.use('/liveness', livenessRoutes);

// KYC document upload (Spaces) – single file in field "file"
router.post('/upload', authenticate, upload.single('file'), KYCController.uploadKycDocument);

// Legacy/Generic KYC routes (for backward compatibility)
router.post('/submit', authenticate, validateKYCSubmission, KYCController.submitKYC);
router.get('/status/:userId', authenticate, KYCController.getKYCStatus);
router.post('/profile/:userId', authenticate, KYCController.createMinimalKYCProfile);
router.get('/documents/:userId', authenticate, KYCController.getAllKYCDocuments);
router.get('/document/:documentId', authenticate, KYCController.getKYCDocument);
router.put('/document/:documentId/status', authenticate, KYCController.updateKYCDocumentStatus);
router.post('/review/:kycId', authenticate, KYCController.reviewKYCSubmission);
router.get('/search', authenticate, KYCController.searchKYCProfiles);

// Fuspay Modular KYC routes
router.post('/modular/webhook', KYCController.handleFuspayModularWebhook);
router.post('/modular/verification', authenticate, KYCController.createFuspayVerification);
router.get('/modular/verification-url', authenticate, KYCController.getMyFuspayVerification);
router.post('/modular/submit/:verificationId', authenticate, KYCController.submitFuspayVerification);
router.get('/modular/status/:verificationId', authenticate, KYCController.getFuspayVerificationStatus);
router.post('/modular/complete/:verificationId', authenticate, KYCController.completeFuspayVerification);

router.post('/business/:merchantId/shareholders/create', KYCController.createShareholderData);
router.get('/business/:merchantId/shareholders', KYCController.getShareholderData);
router.put('/business/:merchantId/shareholders', KYCController.updateShareholderData);

export { router as kycRoutes };