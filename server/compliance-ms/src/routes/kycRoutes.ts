// src/routes/kycRoutes.ts
import { Router } from 'express';
import { validateKYC } from '../middleware/kycValidation';
import { authenticate } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { KYCController } from '../controllers/kycController';

const router = Router();

// Apply audit logging middleware to all routes
router.use(auditLog);

// KYC routes
router.post('/submit', authenticate, validateKYC, KYCController.submitKYC);
router.get('/status/:userId', authenticate, KYCController.getKYCStatus);
router.get('/documents/:userId', authenticate, KYCController.getDocuments);
router.get('/document/:userId/:documentId', authenticate, KYCController.getDocumentById);
router.post('/document/:userId', authenticate, KYCController.uploadDocument);
router.delete('/document/:userId/:documentId', authenticate, KYCController.deleteDocument);

export { router as kycRoutes };

// src/routes/adminRoutes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { isAdmin } from '../middleware/roleAuth';
import { auditLog } from '../middleware/audit';
import { KYCController } from '../controllers/kycController';

const router = Router();

// Apply audit logging middleware to all routes
router.use(auditLog);

// Admin routes
router.get('/kyc', authenticate, isAdmin, KYCController.getAllKYCProfiles);
router.put('/kyc/:kycId/status', authenticate, isAdmin, KYCController.updateKYCStatus);
router.put('/document/:kycId/status', authenticate, isAdmin, KYCController.updateDocumentStatus);

export { router as adminRoutes };

// src/routes/merchantRoutes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { KYCController } from '../controllers/kycController';

const router = Router();

// Apply audit logging middleware to all routes
router.use(auditLog);

// Merchant routes
router.get('/kyc/:userId', authenticate, KYCController.getKYCStatus);
router.get('/documents/:userId', authenticate, KYCController.getDocuments);
router.post('/document/:userId', authenticate, KYCController.uploadDocument);
router.delete('/document/:userId/:documentId', authenticate, KYCController.deleteDocument);

export { router as merchantRoutes };