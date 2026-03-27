/**
 * API Key routes (mounted at /api/v1/keys)
 *
 * @openapi
 * /api/v1/keys:
 *   get:
 *     summary: List API keys
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of API keys
 *   post:
 *     summary: Create API key
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: API key created
 * /api/v1/keys/{keyId}:
 *   delete:
 *     summary: Revoke API key
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: keyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: API key revoked
 */

import { Router } from 'express';
import { ApiKeyController } from '../controllers/apiKeyController';
import { authenticate, merchantOnly } from '../middleware/auth';

const router = Router();

// Apply authentication to all API key routes
router.use(authenticate);

// List all API keys
router.get('/', merchantOnly, ApiKeyController.getApiKeys);

// Create a new API key
router.post('/', merchantOnly, ApiKeyController.createApiKey);

// Revoke an API key
router.delete('/:keyId', merchantOnly, ApiKeyController.revokeApiKey);

export const apiKeyRoutes = router;
