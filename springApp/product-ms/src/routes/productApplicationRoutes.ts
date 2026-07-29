import { Router } from 'express';
import multer from 'multer';
import productApplicationController from '../controllers/productApplicationController';
import { validate } from '../middleware/validation';
import {
  createApplicationGuarantorSchema,
  createApplicationSpouseKycSchema,
  createProductApplicationSchema,
  initProductApplicationSchema,
  saveProductApplicationProgressSchema,
  submitInitializedProductApplicationSchema,
  submitProductApplicationRequirementsSchema,
  blacklistProductApplicationSchema
} from '../utils/validation';
import { getMaxApplicationDocumentUploadSizeBytes } from '../services/spacesService';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: getMaxApplicationDocumentUploadSizeBytes() }
});

router.post('/upload', upload.single('file'), productApplicationController.uploadApplicationDocument);
router.post('/init', validate(initProductApplicationSchema), productApplicationController.initializeApplication);
router.post('/', validate(createProductApplicationSchema), productApplicationController.createApplication);
router.get('/', productApplicationController.listApplications);
router.get(
  '/user/:userId/products/:productId/init-status',
  productApplicationController.getUserProductInitStatus
);
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
  '/:id/submit',
  validate(submitInitializedProductApplicationSchema),
  productApplicationController.submitApplication
);
router.get('/:id', productApplicationController.getApplicationById);
router.put('/:id/status', validate(blacklistProductApplicationSchema), productApplicationController.updateApplicationStatus);

export { router as productApplicationRoutes };
