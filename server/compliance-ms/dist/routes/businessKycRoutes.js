"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.businessKycRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const audit_1 = require("../middleware/audit");
const complianceMiddleware_1 = require("../middleware/complianceMiddleware");
const kycTypes_1 = require("../types/kycTypes");
const kycController_1 = require("../controllers/kycController");
const router = (0, express_1.Router)();
exports.businessKycRoutes = router;
router.use(audit_1.auditLog);
router.use(auth_1.authenticate);
router.use(complianceMiddleware_1.requireBusinessCustomer);
router.post('/submit', complianceMiddleware_1.validateDocumentRequirements, kycController_1.KYCController.submitBusinessKYC);
router.get('/status', kycController_1.KYCController.getKYCStatus);
router.get('/documents', kycController_1.KYCController.getAllKYCDocuments);
router.get('/document/:documentId', kycController_1.KYCController.getKYCDocument);
router.get('/business-info', kycController_1.KYCController.getBusinessInfo);
router.get('/business-survey', kycController_1.KYCController.getBusinessSurvey);
router.get('/beneficial-owners', kycController_1.KYCController.getBeneficialOwners);
router.get('/risk-assessment', kycController_1.KYCController.getBusinessRiskAssessment);
router.put('/business-info', kycController_1.KYCController.updateBusinessInfo);
router.put('/business-survey', kycController_1.KYCController.updateBusinessSurvey);
router.put('/beneficial-owners', kycController_1.KYCController.updateBeneficialOwners);
router.get('/enhanced-due-diligence', complianceMiddleware_1.requireHighRiskApproval, kycController_1.KYCController.getEnhancedDueDiligence);
router.get('/corporate-structure', (0, complianceMiddleware_1.validateBusinessType)([
    kycTypes_1.BusinessType.CORPORATION,
    kycTypes_1.BusinessType.LIMITED_LIABILITY_COMPANY
]), kycController_1.KYCController.getCorporateStructure);
router.get('/non-profit-verification', (0, complianceMiddleware_1.validateBusinessType)([kycTypes_1.BusinessType.NON_PROFIT]), kycController_1.KYCController.getNonProfitVerification);
router.get('/government-verification', (0, complianceMiddleware_1.validateBusinessType)([kycTypes_1.BusinessType.GOVERNMENT_ENTITY]), kycController_1.KYCController.getGovernmentVerification);
//# sourceMappingURL=businessKycRoutes.js.map