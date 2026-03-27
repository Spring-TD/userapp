import { Router } from 'express';
import { requireInternalToken } from '../middleware/internalAuth';
import { InternalUserController } from '../controllers/internalUserController';

const router = Router();

// Merchant contact lookup for internal services.
// Protected by X-Internal-Token.
router.get('/users/:userId/contact', requireInternalToken, InternalUserController.getUserContact);

export const internalUserRoutes = router;

