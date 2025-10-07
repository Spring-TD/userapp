import { Router } from 'express';
import { WalletController } from '../controllers/walletController';
import { authenticate, authorizeMerchant, authorizeUser } from '../middleware/auth';

const router = Router();

// Merchant wallet routes
router.post('/merchant', authenticate, authorizeMerchant, WalletController.createMerchantWallet);
router.post('/merchant/all', authenticate, authorizeMerchant, WalletController.createAllMerchantWallets);
router.get('/merchant/:merchantId/type/:walletType', authenticate, WalletController.getMerchantWalletByType);
router.get('/merchant/:merchantId/all', authenticate, WalletController.getAllMerchantWallets);
router.put('/merchant/balance', authenticate, authorizeMerchant, WalletController.updateMerchantWalletBalance);

// Treasury Wallet specific routes
router.get('/treasury/:merchantId/transactions', authenticate, authorizeMerchant, WalletController.filterTreasuryTransactions);
router.post('/treasury/transfer', authenticate, authorizeMerchant, WalletController.transferOutFromTreasury);
router.post('/treasury/debit', authenticate, authorizeMerchant, WalletController.debitUserWallet);
router.post('/treasury/debit-merchant', authenticate, authorizeMerchant, WalletController.debitTreasuryWallet);

// User wallet routes
router.post('/user', authenticate, authorizeUser, WalletController.createUserWallet);
router.get('/user/:userId', authenticate, WalletController.getUserWallet);
router.put('/user/:userId/balance', authenticate, authorizeUser, WalletController.updateUserWalletBalance);

// Get wallets by merchant (merchant can view all wallets associated with their business)
router.get('/merchant/:merchantId/users', authenticate, WalletController.getUserWalletsByMerchant);

export { router as walletRoutes };