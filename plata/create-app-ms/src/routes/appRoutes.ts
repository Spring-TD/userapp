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
 *               status:
 *                 type: string
 *                 enum: [draft, submitted, approved, rejected, incomplete]
 *               rejectionReason:
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
 * /api/v1/apps/{id}/submit:
 *   post:
 *     summary: Submit app for review
 *     tags: [Apps]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: App submitted
 * /api/v1/apps/{id}/approve:
 *   post:
 *     summary: Approve app
 *     tags: [Apps]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: App approved
 * /api/v1/apps/{id}/reject:
 *   post:
 *     summary: Reject app
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
 *               rejectionReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: App rejected
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
import { AppService } from '../services/appService';
import { AppController } from '../controllers/appController';
import { apiKeyAuth } from '../middleware/apiKeyAuth';
import { authenticate, merchantOnly } from '../middleware/auth';

const router = Router();
const appService = new AppService();
const appController = new AppController(appService);

// Create a new app - now requires authentication
router.post('/', authenticate, merchantOnly, appController.createApp);

// Get all apps
router.get('/', appController.getAllApps);

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

// Special endpoints that require API keys
router.get('/special/metadata', apiKeyAuth, appController.getAppsWithMetadata);
router.put('/special/bulk', apiKeyAuth, appController.bulkUpdateApps);

export { router as appRoutes };