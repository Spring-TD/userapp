/**
 * Compliance admin routes (mounted at /api/v1/kyc/admin). Requires compliance officer role.
 *
 * @openapi
 * /api/v1/kyc/admin/profiles:
 *   get:
 *     summary: Search KYC profiles
 *     tags: [KYC - Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile list
 * /api/v1/kyc/admin/profiles/pending-review:
 *   get:
 *     summary: Get pending reviews
 *     tags: [KYC - Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending list
 * /api/v1/kyc/admin/profiles/high-risk:
 *   get:
 *     summary: Get high-risk profiles
 *     tags: [KYC - Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: High-risk list
 * /api/v1/kyc/admin/check-sanctions:
 *   post:
 *     summary: Check sanctions
 *     tags: [KYC - Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sanctions check result
 * /api/v1/kyc/admin/individuals/{userId}:
 *   get:
 *     summary: Get individual profile
 *     tags: [KYC - Admin]
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
 *         description: Individual profile
 * /api/v1/kyc/admin/businesses/{userId}:
 *   get:
 *     summary: Get business profile
 *     tags: [KYC - Admin]
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
 *         description: Business profile
 * /api/v1/kyc/admin/document/{documentId}/status:
 *   put:
 *     summary: Update document status
 *     tags: [KYC - Admin]
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
 * /api/v1/kyc/admin/document/{documentId}/verify-aml:
 *   post:
 *     summary: Verify document via AML
 *     tags: [KYC - Admin]
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
 *         description: AML verification result
 * /api/v1/kyc/admin/reports/risk-summary:
 *   get:
 *     summary: Get risk summary report
 *     tags: [KYC - Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Risk summary
 * /api/v1/kyc/admin/reports/compliance-metrics:
 *   get:
 *     summary: Get compliance metrics
 *     tags: [KYC - Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Compliance metrics
 */
// src/routes/complianceAdminRoutes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { requireComplianceOfficer } from '../middleware/complianceMiddleware';
import { validateSanctionsCheck } from '../middleware/sanctionsValidation';
import { KYCController } from '../controllers/kycController';

const router = Router();

// Apply common middleware
router.use(auditLog);
router.use(authenticate);
router.use(requireComplianceOfficer);

// Compliance admin routes for all customer types
router.get('/profiles', KYCController.searchKYCProfiles);
router.get('/profiles/pending-review', KYCController.getPendingReviews);
router.get('/profiles/high-risk', KYCController.getHighRiskProfiles);
router.get('/users', KYCController.getAllUsers); // New route
router.get('/documents', KYCController.getAllComplianceDocuments); // New route

// Sanctions check route
router.post('/check-sanctions', validateSanctionsCheck, KYCController.checkSanctions);

// Individual customer admin routes
router.get('/individuals/:userId', KYCController.getIndividualProfile);
router.put('/individuals/:userId/risk-level', KYCController.updateIndividualRiskLevel);
router.post('/individuals/:userId/review', KYCController.reviewIndividualKYC);
router.post('/individuals/:userId/approve', KYCController.approveDisapproveUser); // New route
router.post('/individuals/:userId/message', KYCController.sendMessageToUser); // New route
router.post('/individuals/:userId/block', KYCController.blockUser); // New route
router.post('/individuals/:userId/unblock', KYCController.unblockUser); // New route

// Business customer admin routes
router.get('/businesses/:userId', KYCController.getBusinessProfile);
router.put('/businesses/:userId/risk-level', KYCController.updateBusinessRiskLevel);
router.post('/businesses/:userId/review', KYCController.reviewBusinessKYC);
router.get('/businesses/:userId/beneficial-owners', KYCController.getBusinessBeneficialOwners);
router.get('/businesses/:userId/corporate-structure', KYCController.getBusinessCorporateStructure);
router.post('/businesses/:userId/approve', KYCController.approveDisapproveUser); // New route
router.post('/businesses/:userId/message', KYCController.sendMessageToUser); // New route
router.post('/businesses/:userId/block', KYCController.blockUser); // New route
router.post('/businesses/:userId/unblock', KYCController.unblockUser); // New route
// CAC verification route
router.post('/businesses/:userId/verify-certificate', KYCController.verifyCertificateWithCAC);

// Document management routes
router.put('/document/:documentId/status', KYCController.updateKYCDocumentStatus);
router.get('/document/:documentId', KYCController.getKYCDocument);
// Approve document for Prembly verification (must be done before Prembly check)
router.post('/document/:documentId/approve', KYCController.approveDocumentForVerification);
// AML verification route (requires admin approval first)
router.post('/document/:documentId/verify-aml', KYCController.verifyAMLDocument);

// Workflow management routes
router.put('/workflow/:kycId/status', KYCController.updateWorkflowStatus);
router.get('/workflows/pending', KYCController.getPendingWorkflows);

// Reporting routes
router.get('/reports/risk-summary', KYCController.getRiskSummaryReport);
router.get('/reports/compliance-metrics', KYCController.getComplianceMetrics);
router.get('/reports/document-status', KYCController.getDocumentStatusReport);

export { router as complianceAdminRoutes };