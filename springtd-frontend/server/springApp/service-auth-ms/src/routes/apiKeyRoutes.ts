
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
