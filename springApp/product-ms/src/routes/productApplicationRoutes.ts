import { Router } from 'express';
import multer from 'multer';
import productApplicationController from '../controllers/productApplicationController';
import { validate } from '../middleware/validation';
import {
  createProductApplicationSchema,
  updateProductApplicationStatusSchema
} from '../utils/validation';
import { getMaxApplicationDocumentUploadSizeBytes } from '../services/spacesService';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: getMaxApplicationDocumentUploadSizeBytes() }
});

router.post('/upload', upload.single('file'), productApplicationController.uploadApplicationDocument);
router.post('/', validate(createProductApplicationSchema), productApplicationController.createApplication);
router.get('/', productApplicationController.listApplications);
router.get('/:id', productApplicationController.getApplicationById);
router.put('/:id/status', validate(updateProductApplicationStatusSchema), productApplicationController.updateApplicationStatus);

export { router as productApplicationRoutes };
