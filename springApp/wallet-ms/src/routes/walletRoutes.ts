import { Router } from 'express';
import { WalletController } from '../controllers/walletController';
import { FundingController } from '../controllers/fundingController';
import { authenticate, authorizeMerchant, authorizeUser } from '../middleware/auth';

const router = Router();

// Merchant wallet routes
router.post('/merchant', authenticate, authorizeMerchant, WalletController.createMerchantWallet);
router.post('/merchant/all', authenticate, authorizeMerchant, WalletController.createAllMerchantWallets);
router.get('/merchant/:merchantId/type/:walletType', authenticate, WalletController.getMerchantWalletByType);
router.get('/merchant/:merchantId/all', authenticate, WalletController.getAllMerchantWallets);
router.put('/merchant/balance', authenticate, authorizeMerchant, WalletController.updateMerchantWalletBalance);

// Settlement Wallet routes (legacy /treasury/* aliases retained)
router.get('/settlement/:merchantId/transactions', authenticate, authorizeMerchant, WalletController.filterSettlementTransactions);
router.get('/treasury/:merchantId/transactions', authenticate, authorizeMerchant, WalletController.filterSettlementTransactions);
router.post('/settlement/transfer', authenticate, authorizeMerchant, WalletController.transferOutFromSettlement);
router.post('/treasury/transfer', authenticate, authorizeMerchant, WalletController.transferOutFromSettlement);
router.post('/settlement/debit', authenticate, authorizeMerchant, WalletController.debitUserWallet);
router.post('/treasury/debit', authenticate, authorizeMerchant, WalletController.debitUserWallet);
router.post('/settlement/debit-merchant', authenticate, authorizeMerchant, WalletController.debitSettlementWallet);
router.post('/treasury/debit-merchant', authenticate, authorizeMerchant, WalletController.debitSettlementWallet);

// Billing Wallet routes (legacy /operation/* aliases retained)
router.get('/billing/:merchantId/transactions', authenticate, authorizeMerchant, WalletController.filterBillingTransactions);
router.get('/operation/:merchantId/transactions', authenticate, authorizeMerchant, WalletController.filterBillingTransactions);
router.post('/billing-to-kyc', authenticate, authorizeMerchant, WalletController.transferFromBillingToKyc);
router.post('/operation-to-kyc', authenticate, authorizeMerchant, WalletController.transferFromBillingToKyc);
router.post('/kyc-to-billing', authenticate, authorizeMerchant, WalletController.transferFromKycToBilling);
router.post('/kyc-to-operation', authenticate, authorizeMerchant, WalletController.transferFromKycToBilling);
router.post('/billing/debit', authenticate, authorizeMerchant, WalletController.debitBillingWallet);
router.post('/operation/debit', authenticate, authorizeMerchant, WalletController.debitBillingWallet);

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
router.post('/user/:userId/payout', authenticate, authorizeUser, WalletController.payoutUserWalletToBank);
router.post('/user/:userId/api-call', authenticate, authorizeUser, WalletController.makeUserApiCall);

// Funding routes (public endpoints for payment provider callbacks)
router.post('/funding/callback', FundingController.handleFundingCallback);
router.get('/funding/status/:transactionId', FundingController.checkFundingStatus);

// Get wallets by merchant (merchant can view all wallets associated with their business)
router.get('/merchant/:merchantId/users', authenticate, WalletController.getUserWalletsByMerchant);

export { router as walletRoutes };
