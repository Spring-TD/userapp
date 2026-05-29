import { Router } from 'express';
import { requireWalletInternalToken } from '../middleware/internalWalletAuth';
import { InternalWalletController } from '../controllers/internalWalletController';

const router = Router();

router.post('/user', requireWalletInternalToken, InternalWalletController.createUserWallet);
router.post(
  '/product-application',
  requireWalletInternalToken,
  InternalWalletController.ensureProductUserWallet
);
router.post(
  '/user/:userId/provision-nuban',
  requireWalletInternalToken,
  InternalWalletController.provisionUserNuban
);

export { router as internalWalletRoutes };
