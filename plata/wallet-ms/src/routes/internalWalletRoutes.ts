import { Router } from 'express';
import { InternalWalletController } from '../controllers/internalWalletController';
import { BankingConfigController } from '../controllers/bankingConfigController';
import { requireInternalToken } from '../middleware/internalAuth';

const router = Router();

router.post(
  '/wallets/user/provision',
  requireInternalToken,
  InternalWalletController.provisionUserWallet
);

router.post(
  '/wallets/user/credit',
  requireInternalToken,
  InternalWalletController.creditUserWallet
);

router.post(
  '/wallets/treasury/disburse',
  requireInternalToken,
  InternalWalletController.disburseFromTreasury
);

router.post(
  '/wallets/loan-repayment/collection',
  requireInternalToken,
  InternalWalletController.applyLoanRepaymentCollection
);

router.post(
  '/wallets/repayment/collect',
  requireInternalToken,
  InternalWalletController.collectToRepayment
);

// Deprecated alias — use /wallets/repayment/collect
router.post(
  '/wallets/settlement/collect',
  requireInternalToken,
  InternalWalletController.collectToSettlement
);

router.post(
  '/wallets/billing/monthly-charge',
  requireInternalToken,
  InternalWalletController.chargeMonthlyCustomerBilling
);

router.post(
  '/wallets/billing/business-kyc/charge',
  requireInternalToken,
  InternalWalletController.chargeBusinessKycFee
);

router.get(
  '/wallets/merchant/:merchantId/type/:walletType',
  requireInternalToken,
  InternalWalletController.getMerchantWalletByType
);

router.get(
  '/banking-config/:merchantId',
  requireInternalToken,
  BankingConfigController.get
);

router.put(
  '/banking-config/:merchantId',
  requireInternalToken,
  BankingConfigController.upsert
);

router.post(
  '/banking-config/:merchantId/sync-credits',
  requireInternalToken,
  BankingConfigController.syncCredits
);

export { router as internalWalletRoutes };
