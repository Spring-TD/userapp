import { Router } from 'express';
import { WalletController } from '../controllers/walletController';
import { FundingController } from '../controllers/fundingController';
import { TransactionPinController } from '../controllers/transactionPinController';
import { authenticate, authorizeMerchant, authorizeUser } from '../middleware/auth';

const router = Router();

// Merchant wallet routes
router.post('/merchant', authenticate, authorizeMerchant, WalletController.createMerchantWallet);
router.post('/merchant/all', authenticate, authorizeMerchant, WalletController.createAllMerchantWallets);
router.get('/merchant/:merchantId/type/:walletType', authenticate, WalletController.getMerchantWalletByType);
router.get('/merchant/:merchantId/all', authenticate, WalletController.getAllMerchantWallets);
router.put('/merchant/balance', authenticate, authorizeMerchant, WalletController.updateMerchantWalletBalance);

// Repayment Wallet routes (legacy /settlement/* aliases retained)
router.get('/repayment/:merchantId/transactions', authenticate, authorizeMerchant, WalletController.filterRepaymentTransactions);
router.get('/settlement/:merchantId/transactions', authenticate, authorizeMerchant, WalletController.filterRepaymentTransactions);
router.post('/repayment/transfer', authenticate, authorizeMerchant, WalletController.transferOutFromRepayment);
router.post('/settlement/transfer', authenticate, authorizeMerchant, WalletController.transferOutFromRepayment);
router.post('/repayment/debit', authenticate, authorizeMerchant, WalletController.debitUserWallet);
router.post('/settlement/debit', authenticate, authorizeMerchant, WalletController.debitUserWallet);
router.post('/repayment/debit-merchant', authenticate, authorizeMerchant, WalletController.debitRepaymentWallet);
router.post('/settlement/debit-merchant', authenticate, authorizeMerchant, WalletController.debitRepaymentWallet);
router.post('/repayment/payout', authenticate, authorizeMerchant, WalletController.payoutRepaymentWalletToBank);
router.post('/settlement/payout', authenticate, authorizeMerchant, WalletController.payoutRepaymentWalletToBank);

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
router.get('/user/:userId/product-type-summary', authenticate, WalletController.getUserProductTypeSummary);
router.get('/user/:userId', authenticate, WalletController.getUserWallet);
router.put('/user/:userId/balance', authenticate, authorizeUser, WalletController.updateUserWalletBalance);
router.get('/user/:userId/transactions', authenticate, WalletController.filterUserTransactions);
router.post(
  '/user/:userId/product-applications/:applicationId/transfer-to-primary',
  authenticate,
  authorizeUser,
  WalletController.transferProductApplicationToPrimary
);
router.post('/user/:userId/transfer', authenticate, authorizeUser, WalletController.transferOutFromUser);
router.get(
  '/user/:userId/external-bank-accounts',
  authenticate,
  authorizeUser,
  WalletController.listUserExternalBankAccounts
);
router.post(
  '/user/:userId/external-bank-accounts',
  authenticate,
  authorizeUser,
  WalletController.addUserExternalBankAccount
);
router.delete(
  '/user/:userId/external-bank-accounts/:accountId',
  authenticate,
  authorizeUser,
  WalletController.removeUserExternalBankAccount
);
router.patch(
  '/user/:userId/external-bank-accounts/:accountId/default',
  authenticate,
  authorizeUser,
  WalletController.setDefaultUserExternalBankAccount
);
router.post('/user/:userId/payout', authenticate, authorizeUser, WalletController.payoutUserWalletToBank);
router.post('/user/:userId/api-call', authenticate, authorizeUser, WalletController.makeUserApiCall);

// Transaction PIN (required to move money out of a user wallet)
router.get('/user/:userId/transaction-pin/status', authenticate, authorizeUser, TransactionPinController.getStatus);
router.post('/user/:userId/transaction-pin', authenticate, authorizeUser, TransactionPinController.setPin);
router.put('/user/:userId/transaction-pin', authenticate, authorizeUser, TransactionPinController.changePin);

// Bank payout helpers (authenticated): bank picker list + beneficiary name enquiry
router.get('/banks', authenticate, WalletController.getBanks);
router.post('/banks/name-enquiry', authenticate, WalletController.verifyBankAccount);

// Funding routes (public endpoints for payment provider callbacks)
router.get('/funding/callback', FundingController.describeFundingCallback);
router.post('/funding/callback', FundingController.handleFundingCallback);
router.post('/funding/callback/legerblock', FundingController.handleLegerblockFundingCallback);
router.get('/funding/status/:transactionId', FundingController.checkFundingStatus);

// PayOnUs / LegerBlock payout status webhooks (public; reverse wallet debit on failure)
router.post('/payout/callback', FundingController.handlePayoutStatusCallback);
router.post('/payout/callback/legerblock', FundingController.handleLegerblockPayoutCallback);

// Get wallets by merchant (merchant can view all wallets associated with their business)
router.get('/merchant/:merchantId/users', authenticate, WalletController.getUserWalletsByMerchant);

export { router as walletRoutes };
