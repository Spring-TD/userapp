/**
 * SAMS Credential Routes
 * Standalone credential validation and management routes
 *
 * @openapi
 * /api/v1/credentials/validate:
 *   post:
 *     summary: Validate credential
 *     tags: [Credentials]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clientId:
 *                 type: string
 *               clientSecret:
 *                 type: string
 *     responses:
 *       200:
 *         description: Validation result
 * /api/v1/credentials/void/{credentialId}:
 *   post:
 *     summary: Void credential
 *     tags: [Credentials]
 *     parameters:
 *       - in: path
 *         name: credentialId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Credential voided
 * /api/v1/credentials/{credentialId}/regenerate:
 *   post:
 *     summary: Regenerate credential
 *     tags: [Credentials]
 *     parameters:
 *       - in: path
 *         name: credentialId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: New credential created
 */

import { Router } from 'express';
import { CredentialController } from '../controllers/credentialController';

const router = Router();

// Credential Management Routes
// POST /api/v1/credentials/validate - Validate credential
router.post('/validate', CredentialController.validateCredential);

// POST /api/v1/credentials/void/:credentialId - Void credential
router.post('/void/:credentialId', CredentialController.voidCredential);

// POST /api/v1/credentials/:credentialId/regenerate - Regenerate credential
router.post('/:credentialId/regenerate', CredentialController.regenerateCredential);

export { router as credentialRoutes };