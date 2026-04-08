/**
 * App routes (mounted at /api/v1/apps)
 * Application CRUD, submission, drive documents, and product keys.
 *
 * @openapi
 * /api/v1/apps:
 *   get:
 *     summary: Get all apps
 *     tags: [Apps]
 *     responses:
 *       200:
 *         description: List of apps
 *   post:
 *     summary: Create a new app
 *     tags: [Apps]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - websiteUrl
 *               - alias
 *               - description
 *             properties:
 *               name:
 *                 type: string
 *               websiteUrl:
 *                 type: string
 *               alias:
 *                 type: string
 *               description:
 *                 type: string
 *               merchantId:
 *                 type: string
 *                 description: Optional; for admins. Merchants use their own ID from token.
 *     responses:
 *       201:
 *         description: App created
 *       401:
 *         description: Authentication required
 * /api/v1/apps/merchant/{merchantId}:
 *   get:
 *     summary: Get apps by merchant ID
 *     tags: [Apps]
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of apps for merchant
 * /api/v1/apps/{id}:
 *   get:
 *     summary: Get app by ID
 *     tags: [Apps]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: App details
 *       404:
 *         description: App not found
 *   put:
 *     summary: Update app
 *     tags: [Apps]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               websiteUrl:
 *                 type: string
 *               alias:
 *                 type: string
 *               description:
 *                 type: string
 *               productKeys:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: App updated
 *   delete:
 *     summary: Delete app
 *     tags: [Apps]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: App deleted
 * /api/v1/apps/{id}/status:
 *   patch:
 *     summary: Update app status (active or suspended)
 *     tags: [Apps]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, suspended]
 *     responses:
 *       200:
 *         description: App status updated
 *       403:
 *         description: Not the app owner
 * /api/v1/apps/{id}/product-key:
 *   post:
 *     summary: Add product key to app
 *     tags: [Apps]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: Product key added
 * /api/v1/apps/{id}/product-keys:
 *   get:
 *     summary: Get product keys for app
 *     tags: [Apps]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of product keys
 * /api/v1/apps/{id}/wallets:
 *   get:
 *     summary: Get merchant wallets for app
 *     tags: [Apps]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Treasury, Operation and KYC wallets for app
 * /api/v1/apps/{id}/transactions:
 *   get:
 *     summary: Get transactions for app
 *     tags: [Apps]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [credit, debit]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed, cancelled]
 *     responses:
 *       200:
 *         description: List of transactions
 * /api/v1/apps/{id}/transaction-stats:
 *   get:
 *     summary: Get transaction stats for app
 *     tags: [Apps]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transaction statistics
 * /api/v1/apps/{id}/drive/documents:
 *   post:
 *     summary: Upload document to app drive
 *     tags: [Apps - Drive]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Document uploaded
 *   get:
 *     summary: Get documents for app drive
 *     tags: [Apps - Drive]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of documents
 * /api/v1/apps/{id}/drive/documents/{documentId}:
 *   get:
 *     summary: Get document by ID
 *     tags: [Apps - Drive]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Document details
 *   put:
 *     summary: Update document
 *     tags: [Apps - Drive]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Document updated
 *   delete:
 *     summary: Delete document
 *     tags: [Apps - Drive]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Document deleted
 * /api/v1/apps/{id}/drive/document-stats:
 *   get:
 *     summary: Get document stats for app drive
 *     tags: [Apps - Drive]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Document statistics
 * /api/v1/apps/special/metadata:
 *   get:
 *     summary: Get apps with metadata (API key required)
 *     tags: [Apps - Special]
 *     security:
 *       - apiKeyAuth: []
 *     responses:
 *       200:
 *         description: Apps with metadata
 * /api/v1/apps/special/bulk:
 *   put:
 *     summary: Bulk update apps (API key required)
 *     tags: [Apps - Special]
 *     security:
 *       - apiKeyAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Bulk update result
 */

import { Router } from 'express';
import multer from 'multer';
import { config } from '../config/environment';
import { AppService } from '../services/appService';
import { AppPwaTemplateService } from '../services/appPwaTemplateService';
import { AppPwaPublishService } from '../services/appPwaPublishService';
import { AppController } from '../controllers/appController';
import { AppPwaTemplateController } from '../controllers/appPwaTemplateController';
import { AppPwaPublishController } from '../controllers/appPwaPublishController';
import { apiKeyAuth } from '../middleware/apiKeyAuth';
import { authenticate, merchantOnly } from '../middleware/auth';

const pwaAssetUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.pwaAssetMaxBytes }
});

const router = Router();
const appService = new AppService();
const appController = new AppController(appService);
const pwaTemplateService = new AppPwaTemplateService();
const appPwaTemplateController = new AppPwaTemplateController(appService, pwaTemplateService);
const appPwaPublishService = new AppPwaPublishService();
const appPwaPublishController = new AppPwaPublishController(appService, appPwaPublishService);

// Create a new app - now requires authentication
router.post('/', authenticate, merchantOnly, appController.createApp);

// Get all apps
router.get('/', authenticate, merchantOnly, appController.getAllApps);

// Get app by ID
router.get('/:id', authenticate, merchantOnly, appController.getAppById);

// Get apps by merchant ID
router.get('/merchant/:merchantId', authenticate, merchantOnly, appController.getAppsByMerchantId);

// PWA templates (splash / onboarding JSON per app — many per app)
router.get(
  '/:appId/pwa-templates',
  authenticate,
  merchantOnly,
  appPwaTemplateController.list
);
router.post(
  '/:appId/pwa-templates',
  authenticate,
  merchantOnly,
  appPwaTemplateController.create
);
router.get(
  '/:appId/pwa-templates/:templateId',
  authenticate,
  merchantOnly,
  appPwaTemplateController.getById
);
router.put(
  '/:appId/pwa-templates/:templateId',
  authenticate,
  merchantOnly,
  appPwaTemplateController.update
);
router.delete(
  '/:appId/pwa-templates/:templateId',
  authenticate,
  merchantOnly,
  appPwaTemplateController.remove
);
router.patch(
  '/:appId/pwa-templates/:templateId/apply',
  authenticate,
  merchantOnly,
  appPwaTemplateController.apply
);

// PWA runtime publish/status/artifacts
router.post('/:appId/pwa/publish', authenticate, merchantOnly, appPwaPublishController.publish);
router.get('/:appId/pwa/status', authenticate, merchantOnly, appPwaPublishController.status);
router.get(
  '/:appId/pwa/manifest.webmanifest',
  authenticate,
  merchantOnly,
  appPwaPublishController.manifest
);
router.get('/:appId/pwa/sw.js', authenticate, merchantOnly, appPwaPublishController.serviceWorker);

router.post(
  '/:appId/pwa-templates/:templateId/assets/logo',
  authenticate,
  merchantOnly,
  pwaAssetUpload.single('file'),
  appPwaTemplateController.uploadAssetLogo
);
router.post(
  '/:appId/pwa-templates/:templateId/assets/splash',
  authenticate,
  merchantOnly,
  pwaAssetUpload.single('file'),
  appPwaTemplateController.uploadAssetSplash
);
router.post(
  '/:appId/pwa-templates/:templateId/onboarding/screens/:screenIndex/image',
  authenticate,
  merchantOnly,
  pwaAssetUpload.single('file'),
  appPwaTemplateController.uploadOnboardingScreenImage
);
// Update app
router.put('/:id', appController.updateApp);

// Delete app
router.delete('/:id', appController.deleteApp);

// Update app status (active | suspended) - merchant can suspend/reactivate their apps
router.patch('/:id/status', authenticate, merchantOnly, appController.updateAppStatus);

// Add product key to app
router.post('/:id/product-key', appController.addProductKey);

// Get product keys for app
router.get('/:id/product-keys', appController.getProductKeys);

// Get merchant wallets for app (TREASURY, OPERATION, KYC)
router.get('/:id/wallets', authenticate, merchantOnly, appController.getAppWallets);

// App-level manifest files (independent from PWA templates)
router.get('/:id/manifests', authenticate, merchantOnly, appController.getManifestFiles);
router.post(
  '/:id/manifests',
  authenticate,
  merchantOnly,
  pwaAssetUpload.array('files'),
  appController.uploadManifestFiles
);
router.put(
  '/:id/manifests/:manifestIndex',
  authenticate,
  merchantOnly,
  pwaAssetUpload.single('file'),
  appController.replaceManifestFile
);
router.delete(
  '/:id/manifests/:manifestIndex',
  authenticate,
  merchantOnly,
  appController.deleteManifestFile
);

// Transaction endpoints
router.get('/:id/transactions', authenticate, merchantOnly, appController.getTransactions);
router.get('/:id/transaction-stats', authenticate, merchantOnly, appController.getTransactionStats);

// Drive endpoints
router.post('/:id/drive/documents', authenticate, merchantOnly, appController.uploadDocument);
router.get('/:id/drive/documents', authenticate, merchantOnly, appController.getDocuments);
router.get('/:id/drive/documents/:documentId', authenticate, merchantOnly, appController.getDocumentById);
router.put('/:id/drive/documents/:documentId', authenticate, merchantOnly, appController.updateDocument);
router.delete('/:id/drive/documents/:documentId', authenticate, merchantOnly, appController.deleteDocument);
router.get('/:id/drive/document-stats', authenticate, merchantOnly, appController.getDocumentStats);

// Special endpoints that require API keys
router.get('/special/metadata', apiKeyAuth, appController.getAppsWithMetadata);
router.put('/special/bulk', apiKeyAuth, appController.bulkUpdateApps);

export { router as appRoutes };