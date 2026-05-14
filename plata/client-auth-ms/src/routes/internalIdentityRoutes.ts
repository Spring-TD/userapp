import { Router } from 'express';
import { InternalIdentityController } from '../controllers/internalIdentityController';
import { requireInternalToken } from '../middleware/internalAuth';

const router = Router();

router.post('/usage-events', requireInternalToken, InternalIdentityController.upsertUsageEvent);

export { router as internalIdentityRoutes };
