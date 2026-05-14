import { Router } from 'express';
import { requireWalletInternalToken } from '../middleware/internalWalletAuth';
import { InternalWalletController } from '../controllers/internalWalletController';

const router = Router();

router.post('/user', requireWalletInternalToken, InternalWalletController.createUserWallet);

export { router as internalWalletRoutes };
