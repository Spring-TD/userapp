
import express from 'express';
import apiKeyController from '../controllers/apiKeyController';
import { authenticate } from '../middleware/authMiddleware';

const router = express.Router();

// Get all API keys
router.get('/', authenticate, apiKeyController.getApiKeys);

// Create a new API key
router.post('/', authenticate, apiKeyController.createApiKey);

// Revoke an API key
router.delete('/:id', authenticate, apiKeyController.revokeApiKey);

export default router;
