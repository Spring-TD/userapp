import { Router } from 'express';
import multer from 'multer';
import productApplicationController from '../controllers/productApplicationController';
import { validate } from '../middleware/validation';
import {
  createApplicationGuarantorSchema,
  createProductApplicationSchema,
  initProductApplicationSchema,
  submitInitializedProductApplicationSchema,
  submitProductApplicationRequirementsSchema,
  updateProductApplicationStatusSchema
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
router.get('/:id', productApplicationController.getApplicationById);
router.put('/:id/status', validate(updateProductApplicationStatusSchema), productApplicationController.updateApplicationStatus);

export { router as productApplicationRoutes };
