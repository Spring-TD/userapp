import { Router } from 'express';
import { WalletController } from '../controllers/walletController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

// Apply auth middleware to all wallet routes
router.use(authenticate);

router.post('/', WalletController.createMerchantWallet); // Create Merchant Wallet
router.post('/user', WalletController.createUserWallet); // Create User Wallet
router.get('/:id', WalletController.getWallet); // Get Wallet Balance
router.post('/transfer', WalletController.transferFunds); // Transfer Funds
router.get('/:id/transactions', WalletController.getTransactions); // Get Transactions
router.post('/deposit', WalletController.deposit); // Test Deposit

export default router;
