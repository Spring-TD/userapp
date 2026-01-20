import { Router } from 'express';
import { AppService } from '../services/appService';
import { AppController } from '../controllers/appController';
import { apiKeyAuth } from '../middleware/apiKeyAuth';
import { authenticate, merchantOnly } from '../middleware/auth';
import { appConfigurationRoutes } from './appConfigurationRoutes';

const router = Router();
const appService = new AppService();
const appController = new AppController(appService);

// Create a new app - now requires authentication
router.post('/', authenticate, merchantOnly, appController.createApp);

// Get all apps
router.get('/', appController.getAllApps);

// Get app by subdomain (must be before /:id route to avoid conflicts)
router.get('/subdomain/:subdomain', appController.getAppBySubdomain);

// Custom domain management endpoints (must be before /:id route to avoid conflicts)
router.post('/:id/custom-domain', authenticate, merchantOnly, appController.addCustomDomain);
router.put('/:id/custom-domain/activate', authenticate, merchantOnly, appController.activateCustomDomain);
router.post('/:id/custom-domain/verify', authenticate, merchantOnly, appController.verifyCustomDomain);
router.get('/:id/custom-domain/dns', authenticate, merchantOnly, appController.getDnsConfiguration);
router.delete('/:id/custom-domain', authenticate, merchantOnly, appController.removeCustomDomain);

// Get app by ID
router.get('/:id', appController.getAppById);

// Get apps by merchant ID
router.get('/merchant/:merchantId', appController.getAppsByMerchantId);

// Update app
router.put('/:id', appController.updateApp);

// Delete app
router.delete('/:id', appController.deleteApp);

// Submit app for review
router.post('/:id/submit', appController.submitApp);

// Approve app
router.post('/:id/approve', appController.approveApp);

// Reject app
router.post('/:id/reject', appController.rejectApp);

// Add product key to app
router.post('/:id/product-key', appController.addProductKey);

// Get product keys for app
router.get('/:id/product-keys', appController.getProductKeys);

// Transaction endpoints
router.get('/:id/transactions', appController.getTransactions);
router.get('/:id/transaction-stats', appController.getTransactionStats);

// Drive endpoints
router.post('/:id/drive/documents', appController.uploadDocument);
router.get('/:id/drive/documents', appController.getDocuments);
router.get('/:id/drive/documents/:documentId', appController.getDocumentById);
router.put('/:id/drive/documents/:documentId', appController.updateDocument);
router.delete('/:id/drive/documents/:documentId', appController.deleteDocument);
router.get('/:id/drive/document-stats', appController.getDocumentStats);

// Configuration endpoints
router.use('/:id/configuration', appConfigurationRoutes);

// Special endpoints that require API keys
router.get('/special/metadata', apiKeyAuth, appController.getAppsWithMetadata);
router.put('/special/bulk', apiKeyAuth, appController.bulkUpdateApps);

export { router as appRoutes };