import { Router } from 'express';
import multer from 'multer';
import productApplicationController from '../controllers/productApplicationController';
import { requireAdmin, requireAdminOrMerchantApplicationList } from '../middleware/applicationAuth';
import { validate } from '../middleware/validation';
import { createProductApplicationSchema } from '../utils/validation';
import { getMaxApplicationDocumentUploadSizeBytes } from '../services/spacesService';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: getMaxApplicationDocumentUploadSizeBytes() }
});

router.post('/upload', upload.single('file'), productApplicationController.uploadApplicationDocument);
router.post('/apply', validate(createProductApplicationSchema), productApplicationController.createApplication);
router.post('/:id/approve', requireAdmin, productApplicationController.approveApplication);
router.post('/:id/reject', requireAdmin, productApplicationController.rejectApplication);
router.get('/', requireAdminOrMerchantApplicationList, productApplicationController.listApplications);
router.get('/pending', requireAdminOrMerchantApplicationList, productApplicationController.listPendingApplications);
router.get('/user/:userId', productApplicationController.listUserApplications);
router.get('/:id', productApplicationController.getApplicationById);

export { router as applicationRoutes };
