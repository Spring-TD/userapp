import { Router } from 'express';
import multer from 'multer';
import productApplicationController from '../controllers/productApplicationController';
import { requireAdminOrMerchantApplicationList } from '../middleware/applicationAuth';
import { complianceInternalTokenAuth } from '../middleware/complianceInternalAuth';
import { requireVerifiedGatewayMerchant } from '../middleware/gatewayMerchantAuth';
import { requireWalletInternalToken } from '../middleware/walletInternalAuth';
import { validate } from '../middleware/validation';
import {
  createApplicationGuarantorSchema,
  createApplicationSpouseKycSchema,
  createProductApplicationSchema,
  initProductApplicationSchema,
  saveProductApplicationProgressSchema,
  submitInitializedProductApplicationSchema,
  submitProductApplicationRequirementsSchema,
  respondToPendingMortgageOfferSchema,
  respondToPendingLoanOfferSchema,
  payPendingLoanDownPaymentSchema,
  schedulePendingMortgageInspectionSchema,
  completePendingMortgageInspectionSchema,
  completePendingMortgageVirtualInspectionSchema,
  signPendingMortgageContractSchema,
  payPendingMortgageDownPaymentSchema,
  pendingApprovedMortgageUserParamSchema
} from '../utils/validation';
import { getMaxApplicationDocumentUploadSizeBytes } from '../services/spacesService';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: getMaxApplicationDocumentUploadSizeBytes() }
});

router.post('/upload', upload.single('file'), productApplicationController.uploadApplicationDocument);
router.post('/init', validate(initProductApplicationSchema), productApplicationController.initializeApplication);
router.post('/apply', validate(createProductApplicationSchema), productApplicationController.createApplication);
router.patch(
  '/:id/requirements',
  validate(submitProductApplicationRequirementsSchema),
  productApplicationController.submitRequirements
);
router.patch(
  '/:id/progress',
  validate(saveProductApplicationProgressSchema),
  productApplicationController.saveProgress
);
router.post(
  '/:id/guarantors',
  validate(createApplicationGuarantorSchema),
  productApplicationController.createGuarantor
);
router.post(
  '/:id/spouse-kyc',
  validate(createApplicationSpouseKycSchema),
  productApplicationController.createSpouseKyc
);
router.post(
  '/internal/guarantor-kyc-completed',
  complianceInternalTokenAuth,
  productApplicationController.handleInternalGuarantorKycCompleted
);
router.post(
  '/internal/:applicationId/resolve-loan-transfer-charge',
  requireWalletInternalToken,
  productApplicationController.resolveLoanChargeOnProductTransfer
);
router.post(
  '/internal/:applicationId/collect-loan-charge-on-transfer',
  requireWalletInternalToken,
  productApplicationController.collectLoanChargeOnProductTransfer
);
router.post(
  '/internal/:applicationId/apply-transfer-out',
  requireWalletInternalToken,
  productApplicationController.applyProductTransferOut
);
router.post(
  '/internal/:applicationId/sync-product-wallet',
  requireWalletInternalToken,
  productApplicationController.syncProductWalletBalance
);
router.get(
  '/internal/:localApplicationId/applicant-profile',
  requireVerifiedGatewayMerchant,
  productApplicationController.getInternalApplicantProfile
);
router.post(
  '/:id/submit',
  validate(submitInitializedProductApplicationSchema),
  productApplicationController.submitApplication
);
router.get('/', requireAdminOrMerchantApplicationList, productApplicationController.listApplications);
router.get(
  '/summary',
  requireAdminOrMerchantApplicationList,
  productApplicationController.getApplicationsSummary
);
router.get('/pending', requireAdminOrMerchantApplicationList, productApplicationController.listPendingApplications);
router.get(
  '/user/:userId/products/:productId/init-status',
  productApplicationController.getUserProductInitStatus
);
router.get('/webhooks/plata/loan-workflow', productApplicationController.getPlataLoanWorkflowWebhookStatus);
router.post('/webhooks/plata/loan-workflow', productApplicationController.handlePlataLoanWorkflowWebhook);
router.get('/webhooks/plata/guarantor-kyc', productApplicationController.getPlataGuarantorKycWebhookStatus);
router.post('/webhooks/plata/guarantor-kyc', productApplicationController.handlePlataGuarantorKycWebhook);
router.get(
  '/user/:userId/approved-amount-summary',
  productApplicationController.getUserApprovedAmountSummary
);
router.get('/user/:userId', productApplicationController.listUserApplications);
router.get(
  '/user/:userId/pending-approved-mortgages',
  productApplicationController.listPendingApprovedMortgages
);
router.get(
  '/:id/pending-approved-mortgage',
  productApplicationController.getPendingApprovedMortgage
);
router.post(
  '/:id/pending-approved-mortgage/offer',
  validate(respondToPendingMortgageOfferSchema),
  productApplicationController.respondToPendingMortgageOffer
);
router.post(
  '/:id/pending-approved-mortgage/virtual-inspection/complete',
  validate(completePendingMortgageVirtualInspectionSchema),
  productApplicationController.completePendingMortgageVirtualInspection
);
router.post(
  '/:id/pending-approved-mortgage/appointment',
  validate(schedulePendingMortgageInspectionSchema),
  productApplicationController.schedulePendingMortgageInspection
);
router.post(
  '/:id/pending-approved-mortgage/inspection/start',
  validate(pendingApprovedMortgageUserParamSchema),
  productApplicationController.startPendingMortgageInspection
);
router.post(
  '/:id/pending-approved-mortgage/inspection/complete',
  validate(completePendingMortgageInspectionSchema),
  productApplicationController.completePendingMortgageInspection
);
router.post(
  '/:id/pending-approved-mortgage/contract/sign',
  validate(signPendingMortgageContractSchema),
  productApplicationController.signPendingMortgageContract
);
router.post(
  '/:id/pending-approved-mortgage/contract/upload-signed',
  upload.single('file'),
  productApplicationController.uploadPendingMortgageSignedContract
);
router.post(
  '/:id/pending-approved-mortgage/down-payment',
  validate(payPendingMortgageDownPaymentSchema),
  productApplicationController.payPendingMortgageDownPayment
);
router.get(
  '/user/:userId/pending-approved-loans',
  productApplicationController.listPendingApprovedLoans
);
router.get(
  '/:id/pending-approved-loan',
  productApplicationController.getPendingApprovedLoan
);
router.post(
  '/:id/pending-approved-loan/offer',
  validate(respondToPendingLoanOfferSchema),
  productApplicationController.respondToPendingLoanOffer
);
router.post(
  '/:id/pending-approved-loan/down-payment',
  validate(payPendingLoanDownPaymentSchema),
  productApplicationController.payPendingLoanDownPayment
);
router.post(
  '/:id/pending-approved-loan/contract/upload-signed',
  upload.single('file'),
  productApplicationController.uploadPendingLoanSignedContract
);
router.get('/:id', productApplicationController.getApplicationById);

export { router as applicationRoutes };
