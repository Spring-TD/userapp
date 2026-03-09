import { Router } from 'express';
import { TriggerController } from '../controllers/TriggerController';
import adminAuth from '../middleware/adminAuth';

const router = Router();

// Trigger event routes
// These routes would be called by other services when events occur
router.post('/triggers/product-created', TriggerController.handleProductCreated);
router.post('/triggers/wallet-funded', TriggerController.handleWalletFunded);
router.post('/triggers/merchant-users-count', TriggerController.handleMerchantUsersCount);

export { router as triggerRoutes };