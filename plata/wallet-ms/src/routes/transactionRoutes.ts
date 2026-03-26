/**
 * Transaction routes (mounted at /api/v1/transactions)
 *
 * @openapi
 * /api/v1/transactions/{walletId}:
 *   get:
 *     summary: Get transaction history for wallet
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: walletId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of transactions for the wallet
 *       404:
 *         description: Wallet not found or failed to retrieve history
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { TransactionController } from '../controllers/transactionController';

const router = Router();

// Transaction routes
// router.post('/', authenticate, TransactionController.createTransaction); // TODO: Implement later
router.get('/:walletId', authenticate, TransactionController.getTransactionHistory);
// router.get('/details/:transactionId', authenticate, TransactionController.getTransactionDetails); // TODO: Implement later

export { router as transactionRoutes };