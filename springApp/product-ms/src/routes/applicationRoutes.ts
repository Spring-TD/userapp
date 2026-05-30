import { Router } from 'express';
import multer from 'multer';
import productApplicationController from '../controllers/productApplicationController';
import { requireAdmin, requireAdminOrMerchantApplicationList } from '../middleware/applicationAuth';
import { validate } from '../middleware/validation';
import {
  createApplicationGuarantorSchema,
  createProductApplicationSchema,
  initProductApplicationSchema,
  submitInitializedProductApplicationSchema,
  submitProductApplicationRequirementsSchema
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
router.post(
  '/:id/guarantors',
  validate(createApplicationGuarantorSchema),
  productApplicationController.createGuarantor
);
router.post(
  '/:id/submit',
  validate(submitInitializedProductApplicationSchema),
  productApplicationController.submitApplication
);
router.post('/:id/approve', requireAdmin, productApplicationController.approveApplication);
router.post('/:id/reject', requireAdmin, productApplicationController.rejectApplication);
router.get('/', requireAdminOrMerchantApplicationList, productApplicationController.listApplications);
router.get(
  '/summary',
  requireAdminOrMerchantApplicationList,
  productApplicationController.getApplicationsSummary
);
router.get('/pending', requireAdminOrMerchantApplicationList, productApplicationController.listPendingApplications);
router.get('/user/:userId', productApplicationController.listUserApplications);
router.get('/:id', productApplicationController.getApplicationById);

export { router as applicationRoutes };
