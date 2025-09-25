// src/routes/complianceAdminRoutes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { requireComplianceOfficer } from '../middleware/complianceMiddleware';
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

// Workflow management routes
router.put('/workflow/:kycId/status', KYCController.updateWorkflowStatus);
router.get('/workflows/pending', KYCController.getPendingWorkflows);

// Reporting routes
router.get('/reports/risk-summary', KYCController.getRiskSummaryReport);
router.get('/reports/compliance-metrics', KYCController.getComplianceMetrics);
router.get('/reports/document-status', KYCController.getDocumentStatusReport);

export { router as complianceAdminRoutes };