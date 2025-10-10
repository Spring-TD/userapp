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

// Operation Wallet specific routes
router.get('/operation/:merchantId/transactions', authenticate, authorizeMerchant, WalletController.filterOperationTransactions);
router.post('/operation-to-kyc', authenticate, authorizeMerchant, WalletController.transferFromOperationToKyc);
router.post('/kyc-to-operation', authenticate, authorizeMerchant, WalletController.transferFromKycToOperation);
router.post('/operation/debit', authenticate, authorizeMerchant, WalletController.debitOperationWallet);

// KYC Wallet specific routes
router.get('/kyc/:merchantId/transactions', authenticate, authorizeMerchant, WalletController.filterKycTransactions);
router.post('/kyc/debit', authenticate, authorizeMerchant, WalletController.debitKycWallet);
router.post('/kyc/fee', authenticate, authorizeMerchant, WalletController.processKycFee);

// User wallet routes
router.post('/user', authenticate, authorizeUser, WalletController.createUserWallet);
router.get('/user/:userId', authenticate, WalletController.getUserWallet);
router.put('/user/:userId/balance', authenticate, authorizeUser, WalletController.updateUserWalletBalance);
router.get('/user/:userId/transactions', authenticate, WalletController.filterUserTransactions);
router.post('/user/:userId/transfer', authenticate, authorizeUser, WalletController.transferOutFromUser);

// Get wallets by merchant (merchant can view all wallets associated with their business)
router.get('/merchant/:merchantId/users', authenticate, WalletController.getUserWalletsByMerchant);

export { router as walletRoutes };