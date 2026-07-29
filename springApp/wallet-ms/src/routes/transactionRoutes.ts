import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../middleware/auth';
import { TransactionController } from '../controllers/transactionController';
import { ReceiptController } from '../controllers/receiptController';

const router = Router();

// Transaction routes
// router.post('/', authenticate, TransactionController.createTransaction); // TODO: Implement later
router.get('/:walletId', authenticate, TransactionController.getTransactionHistory);

// Receipt routes — support session auth OR a signed token link (used in notifications).
router.get('/:transactionId/receipt', optionalAuthenticate, ReceiptController.getReceipt);
router.get('/:transactionId/receipt.pdf', optionalAuthenticate, ReceiptController.getReceiptPdf);

export { router as transactionRoutes };
