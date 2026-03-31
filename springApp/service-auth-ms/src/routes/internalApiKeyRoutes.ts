import { Router } from 'express';
import { ApiKeyController } from '../controllers/apiKeyController';
import { requireInternalToken } from '../middleware/internalAuth';

const router = Router();

router.post('/bootstrap', requireInternalToken, ApiKeyController.bootstrapMerchantApiKey);

export const internalApiKeyRoutes = router;

