/**
 * Business KYC routes (mounted at /api/v1/kyc/business).
 *
 * @openapi
 * /api/v1/kyc/business/submit:
 *   post:
 *     summary: Submit business KYC
 *     tags: [KYC - Business]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KYC submitted
 * /api/v1/kyc/business/status:
 *   get:
 *     summary: Get business KYC status
 *     tags: [KYC - Business]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KYC status
 * /api/v1/kyc/business/documents:
 *   put:
 *     summary: Upsert one or more business documents (add or replace by type)
 *     tags: [KYC - Business]
 *     security:
 *       - bearerAuth: []
 *   get:
 *     summary: Get business KYC documents
 *     tags: [KYC - Business]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of documents
 * /api/v1/kyc/business/document/{documentId}:
 *   get:
 *     summary: Get document by ID
 *     tags: [KYC - Business]
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
 * /api/v1/kyc/business/business-info:
 *   get:
 *     summary: Get business info
 *     tags: [KYC - Business]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Business info
 *   put:
 *     summary: Update business info
 *     tags: [KYC - Business]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Updated
 * /api/v1/kyc/business/business-survey:
 *   get:
 *     summary: Get business survey
 *     tags: [KYC - Business]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Survey data
 *   put:
 *     summary: Update business survey
 *     tags: [KYC - Business]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Updated
 * /api/v1/kyc/business/business-type-options:
 *   get:
 *     summary: Get business type options for dropdown
 *     description: Returns the list of allowed business types (industry/sector) for the "Select a Business Type" field. Frontend should use this to populate the dropdown when the merchant fills business info.
 *     tags: [KYC - Business]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of { value, label } options (e.g. E-commerce, SaaS, Marketplace, Financial Services, Healthcare, Education, Other)
 * /api/v1/kyc/business/industry-type-options:
 *   get:
 *     summary: Get industry type options for dropdown
 *     description: Returns the list of allowed industry types for the "Select Industry Type" field. Frontend should use this to populate the dropdown when the merchant fills business info.
 *     tags: [KYC - Business]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of { value, label } options (Technology, Finance, Healthcare, E-commerce, Education, Manufacturing, Other)
 * /api/v1/kyc/business/business-model-options:
 *   get:
 *     summary: Get business model options for dropdown
 *     description: Returns the list of allowed business models for the "Select a Business Model" field. Frontend should use this to populate the dropdown when the merchant fills business info.
 *     tags: [KYC - Business]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of { value, label } options (B2B, B2C, B2B2C, Marketplace, Subscription, Freemium, Other)
 * /api/v1/kyc/business/{merchantId}/beneficial-owners:
 *   get:
 *     summary: Get beneficial owners for a merchant
 *     tags: [KYC - Business]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Beneficial owners
 *       403:
 *         description: Can only fetch own shareholders
 *   put:
 *     summary: Update beneficial owners
 *     tags: [KYC - Business]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Updated
 * /api/v1/kyc/business/risk-assessment:
 *   get:
 *     summary: Get business risk assessment
 *     tags: [KYC - Business]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Risk assessment
 * /api/v1/kyc/business/enhanced-due-diligence:
 *   get:
 *     summary: Get enhanced due diligence (high-risk)
 *     tags: [KYC - Business]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: EDD status
 * /api/v1/kyc/business/corporate-structure:
 *   get:
 *     summary: Get corporate structure
 *     tags: [KYC - Business]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Corporate structure
 * /api/v1/kyc/business/non-profit-verification:
 *   get:
 *     summary: Get non-profit verification
 *     tags: [KYC - Business]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Verification status
 * /api/v1/kyc/business/government-verification:
 *   get:
 *     summary: Get government verification
 *     tags: [KYC - Business]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Verification status
 */
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
router.put('/documents', KYCController.upsertBusinessDocuments);
router.get('/documents', KYCController.getAllKYCDocuments);
router.get('/document/:documentId', KYCController.getKYCDocument);
router.get('/business-info', KYCController.getBusinessInfo);
router.get('/business-survey', KYCController.getBusinessSurvey);
router.get('/business-type-options', KYCController.getBusinessTypeOptions);
router.get('/industry-type-options', KYCController.getIndustryTypeOptions);
router.get('/business-model-options', KYCController.getBusinessModelOptions);
router.get('/:merchantId/beneficial-owners', KYCController.getBeneficialOwners);
router.get('/risk-assessment', KYCController.getBusinessRiskAssessment);

// Compliance messaging (merchant sends to admin; merchant gets thread)
router.post('/message', KYCController.sendMessageToCompliance);
router.get('/messages', KYCController.getComplianceMessages);

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