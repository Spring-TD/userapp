/**
 * SAMS Credential Routes
 * Standalone credential validation and management routes
 */

import { Router } from 'express';
import { CredentialController } from '../controllers/credentialController';

const router = Router();

// Credential Management Routes
// POST /api/v1/credentials/validate - Validate credential
router.post('/validate', CredentialController.validateCredential);

// POST /api/v1/credentials/void/:credentialId - Void credential
router.post('/void/:credentialId', CredentialController.voidCredential);

export { router as credentialRoutes };