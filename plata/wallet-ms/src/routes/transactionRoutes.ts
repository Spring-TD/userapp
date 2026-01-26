import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { TransactionController } from '../controllers/transactionController';

const router = Router();

// Transaction routes
// router.post('/', authenticate, TransactionController.createTransaction); // TODO: Implement later
router.get('/:walletId', authenticate, TransactionController.getTransactionHistory);
// router.get('/details/:transactionId', authenticate, TransactionController.getTransactionDetails); // TODO: Implement later

export { router as transactionRoutes };