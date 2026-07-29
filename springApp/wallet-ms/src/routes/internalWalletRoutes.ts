import { Router } from 'express';
import { requireWalletInternalToken } from '../middleware/internalWalletAuth';
import { InternalWalletController } from '../controllers/internalWalletController';

const router = Router();

router.post('/user', requireWalletInternalToken, InternalWalletController.createUserWallet);
router.post(
  '/product-application',
  requireWalletInternalToken,
  InternalWalletController.ensureProductUserWallet
);
router.post(
  '/product-application/approval',
  requireWalletInternalToken,
  InternalWalletController.applyProductApplicationApproval
);
router.post(
  '/user/:userId/provision-nuban',
  requireWalletInternalToken,
  InternalWalletController.provisionUserNuban
);
router.post(
  '/kyc-link/charge',
  requireWalletInternalToken,
  InternalWalletController.chargeKycLinkFee
);
router.post(
  '/kyc-link/refund',
  requireWalletInternalToken,
  InternalWalletController.refundKycLinkFee
);
router.post(
  '/billing/monthly-charge',
  requireWalletInternalToken,
  InternalWalletController.chargeMonthlyCustomerBilling
);
router.post(
  '/repayment/collect',
  requireWalletInternalToken,
  InternalWalletController.collectToRepayment
);
// Legacy alias (formerly "Settlement")
router.post(
  '/settlement/collect',
  requireWalletInternalToken,
  InternalWalletController.collectToSettlement
);
router.post(
  '/commodity/purchase',
  requireWalletInternalToken,
  InternalWalletController.collectCommodityPurchase
);
router.post(
  '/commodity/purchase/reverse',
  requireWalletInternalToken,
  InternalWalletController.reverseCommodityPurchase
);
router.post(
  '/commodity/maturity-payout',
  requireWalletInternalToken,
  InternalWalletController.payoutCommodityMaturity
);
router.post(
  '/investment/purchase',
  requireWalletInternalToken,
  InternalWalletController.collectInvestmentPurchase
);
router.post(
  '/investment/purchase/reverse',
  requireWalletInternalToken,
  InternalWalletController.reverseInvestmentPurchase
);
router.post(
  '/savings/purchase',
  requireWalletInternalToken,
  InternalWalletController.collectSavingsPurchase
);
router.post(
  '/savings/purchase/reverse',
  requireWalletInternalToken,
  InternalWalletController.reverseSavingsPurchase
);

export { router as internalWalletRoutes };
