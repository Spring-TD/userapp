import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

// TODO: Implement transaction routes
// router.post('/', authenticate, TransactionController.createTransaction);
// router.get('/:walletId', authenticate, TransactionController.getTransactionHistory);
// router.get('/details/:transactionId', authenticate, TransactionController.getTransactionDetails);

export { router as transactionRoutes };