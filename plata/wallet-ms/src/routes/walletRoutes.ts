/**
 * Wallet routes (mounted at /api/v1/wallets)
 * Merchant (Treasury, Billing, Repayment — legacy Operation/KYC/Settlement), user wallets, and funding callbacks.
 * Most endpoints require JWT; funding callback is public for provider webhooks.
 *
 * @openapi
 * /api/v1/wallets/merchant:
 *   post:
 *     summary: Create merchant wallet
 *     tags: [Wallets - Merchant]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - currency
 *               - merchantWalletType
 *             properties:
 *               name:
 *                 type: string
 *               currency:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 3
 *               merchantWalletType:
 *                 type: string
 *                 enum: [TREASURY, BILLING, REPAYMENT, OPERATION, KYC, SETTLEMENT]
 *     responses:
 *       201:
 *         description: Merchant wallet created
 * /api/v1/wallets/merchant/all:
 *   post:
 *     summary: Create all merchant wallets (Treasury, Billing, Repayment)
 *     tags: [Wallets - Merchant]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currency:
 *                 type: string
 *                 default: USD
 *     responses:
 *       201:
 *         description: All merchant wallets created
 * /api/v1/wallets/merchant/{merchantId}/type/{walletType}:
 *   get:
 *     summary: Get merchant wallet by type
 *     tags: [Wallets - Merchant]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: walletType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [TREASURY, BILLING, REPAYMENT, OPERATION, KYC, SETTLEMENT]
 *     responses:
 *       200:
 *         description: Merchant wallet
 * /api/v1/wallets/merchant/{merchantId}/all:
 *   get:
 *     summary: Get all merchant wallets
 *     tags: [Wallets - Merchant]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of merchant wallets
 * /api/v1/wallets/merchant/{merchantId}/users:
 *   get:
 *     summary: Get user wallets by merchant
 *     tags: [Wallets - Merchant]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of user wallets for merchant
 * /api/v1/wallets/merchant/balance:
 *   put:
 *     summary: Update merchant wallet balance
 *     tags: [Wallets - Merchant]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Balance updated
 * /api/v1/wallets/treasury/{merchantId}/transactions:
 *   get:
 *     summary: Filter treasury transactions
 *     tags: [Wallets - Treasury]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [CREDIT, DEBIT]
 *     responses:
 *       200:
 *         description: Treasury transactions
 * /api/v1/wallets/treasury/transfer:
 *   post:
 *     summary: Transfer out from treasury
 *     tags: [Wallets - Treasury]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fromWalletId
 *               - toWalletId
 *               - amount
 *               - description
 *             properties:
 *               fromWalletId:
 *                 type: string
 *               toWalletId:
 *                 type: string
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transfer completed
 * /api/v1/wallets/treasury/debit:
 *   post:
 *     summary: Debit user wallet (from treasury flow)
 *     tags: [Wallets - Treasury]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - amount
 *               - description
 *             properties:
 *               userId:
 *                 type: string
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Debit completed
 * /api/v1/wallets/treasury/debit-merchant:
 *   post:
 *     summary: Debit treasury wallet
 *     tags: [Wallets - Treasury]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - merchantId
 *               - amount
 *               - description
 *             properties:
 *               merchantId:
 *                 type: string
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Debit completed
 * /api/v1/wallets/operation/{merchantId}/transactions:
 *   get:
 *     summary: Filter operation wallet transactions
 *     tags: [Wallets - Operation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [CREDIT, DEBIT]
 *     responses:
 *       200:
 *         description: Operation transactions
 * /api/v1/wallets/billing-to-repayment:
 *   post:
 *     summary: Transfer from Billing to Repayment wallet
 *     tags: [Wallets - Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - description
 *             properties:
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transfer completed
 * /api/v1/wallets/operation-to-kyc:
 *   post:
 *     summary: (Legacy alias) Transfer from operation to KYC wallet — use /billing-to-repayment
 *     tags: [Wallets - Operation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - description
 *             properties:
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transfer completed
 * /api/v1/wallets/repayment-to-billing:
 *   post:
 *     summary: Transfer from Repayment to Billing wallet
 *     tags: [Wallets - Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - description
 *             properties:
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transfer completed
 * /api/v1/wallets/kyc-to-operation:
 *   post:
 *     summary: (Legacy alias) Transfer from KYC to operation wallet — use /repayment-to-billing
 *     tags: [Wallets - Operation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - description
 *             properties:
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transfer completed
 * /api/v1/wallets/operation/debit:
 *   post:
 *     summary: Debit operation wallet
 *     tags: [Wallets - Operation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - description
 *             properties:
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Debit completed
 * /api/v1/wallets/repayment/{merchantId}/transactions:
 *   get:
 *     summary: Filter Repayment wallet transactions
 *     tags: [Wallets - Repayment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [CREDIT, DEBIT]
 *     responses:
 *       200:
 *         description: Repayment transactions
 * /api/v1/wallets/repayment/debit:
 *   post:
 *     summary: Debit Repayment wallet
 *     tags: [Wallets - Repayment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - description
 *             properties:
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Debit completed
 * /api/v1/wallets/repayment/fee:
 *   post:
 *     summary: Process KYC fee (debits Repayment wallet)
 *     tags: [Wallets - Repayment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - description
 *             properties:
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: KYC fee processed
 * /api/v1/wallets/kyc/{merchantId}/transactions:
 *   get:
 *     summary: (Legacy alias) Filter KYC wallet transactions — use /repayment/{merchantId}/transactions
 *     tags: [Wallets - KYC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [CREDIT, DEBIT]
 *     responses:
 *       200:
 *         description: KYC transactions
 * /api/v1/wallets/kyc/debit:
 *   post:
 *     summary: (Legacy alias) Debit KYC wallet — use /repayment/debit
 *     tags: [Wallets - KYC]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - description
 *             properties:
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Debit completed
 * /api/v1/wallets/kyc/fee:
 *   post:
 *     summary: (Legacy alias) Process KYC fee — use /repayment/fee
 *     tags: [Wallets - KYC]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - description
 *             properties:
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: KYC fee processed
 * /api/v1/wallets/user:
 *   post:
 *     summary: Create user wallet
 *     tags: [Wallets - User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - currency
 *             properties:
 *               name:
 *                 type: string
 *               currency:
 *                 type: string
 *     responses:
 *       201:
 *         description: User wallet created
 * /api/v1/wallets/user/{userId}:
 *   get:
 *     summary: Get user wallet
 *     tags: [Wallets - User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User wallet details
 * /api/v1/wallets/user/{userId}/balance:
 *   put:
 *     summary: Update user wallet balance
 *     tags: [Wallets - User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Balance updated
 * /api/v1/wallets/user/{userId}/transactions:
 *   get:
 *     summary: Filter user transactions
 *     tags: [Wallets - User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [CREDIT, DEBIT]
 *     responses:
 *       200:
 *         description: User transactions
 * /api/v1/wallets/user/{userId}/transfer:
 *   post:
 *     summary: Transfer out from user wallet
 *     tags: [Wallets - User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - toWalletId
 *               - amount
 *               - description
 *             properties:
 *               toWalletId:
 *                 type: string
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transfer completed
 * /api/v1/wallets/user/{userId}/api-call:
 *   post:
 *     summary: Make user API call (debit for external API)
 *     tags: [Wallets - User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - endpoint
 *               - method
 *               - amount
 *               - description
 *             properties:
 *               endpoint:
 *                 type: string
 *                 format: uri
 *               method:
 *                 type: string
 *               headers:
 *                 type: object
 *               body:
 *                 type: object
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *               apiKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: API call processed
 * /api/v1/wallets/funding/callback:
 *   post:
 *     summary: Funding callback (payment provider webhook)
 *     tags: [Wallets - Funding]
 *     description: Public endpoint; no auth. Called by payment providers when funding completes.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - currency
 *               - transactionId
 *               - paymentMethod
 *               - status
 *             properties:
 *               walletId:
 *                 type: string
 *               userId:
 *                 type: string
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *               transactionId:
 *                 type: string
 *               paymentMethod:
 *                 type: string
 *                 enum: [CARD, BANK_TRANSFER, WALLET, OTHER]
 *               status:
 *                 type: string
 *                 enum: [SUCCESS, COMPLETED, PENDING, FAILED, CANCELLED]
 *               description:
 *                 type: string
 *               providerReference:
 *                 type: string
 *               merchantId:
 *                 type: string
 *               merchantWalletType:
 *                 type: string
 *                 enum: [TREASURY, BILLING, REPAYMENT, OPERATION, KYC, SETTLEMENT]
 *     responses:
 *       200:
 *         description: Callback processed
 * /api/v1/wallets/funding/status/{transactionId}:
 *   get:
 *     summary: Check funding status
 *     tags: [Wallets - Funding]
 *     description: Public endpoint to check status of a funding transaction.
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Funding status
 */

import { Router } from 'express';
import { WalletController } from '../controllers/walletController';
import { FundingController } from '../controllers/fundingController';
import { BankOneWebhookController } from '../controllers/bankoneWebhookController';
import { MonoDirectDebitController } from '../controllers/monoDirectDebitController';
import { collectCommodityPrincipalSettlement, collectCommodityPrincipalRepayment } from '../controllers/commodityPrincipalSettlementController';
import { debitCommodityMaturityFromTreasury } from '../controllers/commodityMaturityPayoutController';
import { requestMaturityWithdrawal } from '../controllers/maturityWithdrawalRequestController';
import { collectInvestmentPrincipalSettlement, collectInvestmentPrincipalRepayment } from '../controllers/investmentPrincipalSettlementController';
import { collectSavingsPrincipalSettlement, collectSavingsPrincipalRepayment } from '../controllers/savingsPrincipalSettlementController';
import { InternalWalletController } from '../controllers/internalWalletController';
import { requireVerifiedGatewayMerchant } from '../middleware/gatewayMerchantAuth';
import { authenticate, authorizeMerchant, authorizeUser } from '../middleware/auth';
import {
  authenticateJwtOrGatewayMerchant,
  requirePathMerchantMatchesGateway
} from '../middleware/authenticateJwtOrGateway';
import { requirePermission } from '../middleware/requirePermission';
import { Permission } from '../rbac/permissions';

const router = Router();

// Merchant wallet routes
router.post(
  '/merchant',
  authenticate,
  authorizeMerchant,
  requirePermission(Permission.MANAGE_SYSTEM_SETTINGS, Permission.VIEW_WALLET_BALANCES),
  WalletController.createMerchantWallet
);
router.post(
  '/merchant/all',
  authenticate,
  authorizeMerchant,
  requirePermission(Permission.MANAGE_SYSTEM_SETTINGS, Permission.VIEW_WALLET_BALANCES),
  WalletController.createAllMerchantWallets
);
router.get(
  '/merchant/:merchantId/type/:walletType',
  authenticateJwtOrGatewayMerchant,
  authorizeMerchant,
  requirePathMerchantMatchesGateway,
  requirePermission(Permission.VIEW_WALLET_BALANCES),
  WalletController.getMerchantWalletByType
);
router.get(
  '/merchant/:merchantId/all',
  authenticateJwtOrGatewayMerchant,
  authorizeMerchant,
  requirePathMerchantMatchesGateway,
  requirePermission(Permission.VIEW_WALLET_BALANCES),
  WalletController.getAllMerchantWallets
);
router.put(
  '/merchant/balance',
  authenticate,
  authorizeMerchant,
  requirePermission(Permission.RECONCILE_LEDGER, Permission.MANAGE_SYSTEM_SETTINGS),
  WalletController.updateMerchantWalletBalance
);

// Treasury Wallet specific routes
router.get(
  '/treasury/:merchantId/transactions',
  authenticateJwtOrGatewayMerchant,
  authorizeMerchant,
  requirePathMerchantMatchesGateway,
  requirePermission(Permission.VIEW_TRANSACTION_LEDGER, Permission.VIEW_PAYOUT_HISTORY),
  WalletController.filterTreasuryTransactions
);
router.post(
  '/treasury/transfer',
  authenticate,
  authorizeMerchant,
  requirePermission(Permission.RECONCILE_LEDGER, Permission.INITIATE_PAYOUT),
  WalletController.transferOutFromTreasury
);
router.post(
  '/treasury/debit',
  authenticate,
  authorizeMerchant,
  requirePermission(Permission.RECONCILE_LEDGER),
  WalletController.debitUserWallet
);
router.post(
  '/treasury/debit-merchant',
  authenticate,
  authorizeMerchant,
  requirePermission(Permission.RECONCILE_LEDGER),
  WalletController.debitTreasuryWallet
);

// Billing Wallet routes (legacy /operation/* aliases retained)
router.get(
  '/billing/:merchantId/transactions',
  authenticateJwtOrGatewayMerchant,
  authorizeMerchant,
  requirePathMerchantMatchesGateway,
  requirePermission(Permission.VIEW_TRANSACTION_LEDGER),
  WalletController.filterOperationTransactions
);
router.get(
  '/operation/:merchantId/transactions',
  authenticateJwtOrGatewayMerchant,
  authorizeMerchant,
  requirePathMerchantMatchesGateway,
  requirePermission(Permission.VIEW_TRANSACTION_LEDGER),
  WalletController.filterOperationTransactions
);
router.post(
  '/billing-to-repayment',
  authenticate,
  authorizeMerchant,
  requirePermission(Permission.RECONCILE_LEDGER),
  WalletController.transferFromBillingToRepayment
);
router.post(
  '/billing-to-settlement',
  authenticate,
  authorizeMerchant,
  requirePermission(Permission.RECONCILE_LEDGER),
  WalletController.transferFromOperationToKyc
);
router.post(
  '/operation-to-kyc',
  authenticate,
  authorizeMerchant,
  requirePermission(Permission.RECONCILE_LEDGER),
  WalletController.transferFromOperationToKyc
);
router.post(
  '/repayment-to-billing',
  authenticate,
  authorizeMerchant,
  requirePermission(Permission.RECONCILE_LEDGER),
  WalletController.transferFromRepaymentToBilling
);
router.post(
  '/settlement-to-billing',
  authenticate,
  authorizeMerchant,
  requirePermission(Permission.RECONCILE_LEDGER),
  WalletController.transferFromKycToOperation
);
router.post(
  '/kyc-to-operation',
  authenticate,
  authorizeMerchant,
  requirePermission(Permission.RECONCILE_LEDGER),
  WalletController.transferFromKycToOperation
);
router.post(
  '/billing/debit',
  authenticate,
  authorizeMerchant,
  requirePermission(Permission.RECONCILE_LEDGER),
  WalletController.debitOperationWallet
);
router.post(
  '/operation/debit',
  authenticate,
  authorizeMerchant,
  requirePermission(Permission.RECONCILE_LEDGER),
  WalletController.debitOperationWallet
);

// Repayment Wallet routes (legacy /settlement/* and /kyc/* aliases retained)
router.get(
  '/repayment/:merchantId/transactions',
  authenticateJwtOrGatewayMerchant,
  authorizeMerchant,
  requirePathMerchantMatchesGateway,
  requirePermission(Permission.VIEW_TRANSACTION_LEDGER, Permission.VIEW_PAYOUT_HISTORY),
  WalletController.filterRepaymentTransactions
);
router.get(
  '/settlement/:merchantId/transactions',
  authenticateJwtOrGatewayMerchant,
  authorizeMerchant,
  requirePathMerchantMatchesGateway,
  requirePermission(Permission.VIEW_TRANSACTION_LEDGER, Permission.VIEW_PAYOUT_HISTORY),
  WalletController.filterKycTransactions
);
router.get(
  '/kyc/:merchantId/transactions',
  authenticateJwtOrGatewayMerchant,
  authorizeMerchant,
  requirePathMerchantMatchesGateway,
  requirePermission(Permission.VIEW_TRANSACTION_LEDGER, Permission.VIEW_PAYOUT_HISTORY),
  WalletController.filterKycTransactions
);
router.post(
  '/repayment/debit',
  authenticate,
  authorizeMerchant,
  requirePermission(Permission.RECONCILE_LEDGER),
  WalletController.debitRepaymentWallet
);
router.post(
  '/settlement/debit',
  authenticate,
  authorizeMerchant,
  requirePermission(Permission.RECONCILE_LEDGER),
  WalletController.debitKycWallet
);
router.post(
  '/kyc/debit',
  authenticate,
  authorizeMerchant,
  requirePermission(Permission.RECONCILE_LEDGER),
  WalletController.debitKycWallet
);
router.post(
  '/repayment/payout',
  authenticate,
  authorizeMerchant,
  requirePermission(Permission.INITIATE_PAYOUT, Permission.APPROVE_PAYOUT),
  WalletController.payoutRepaymentWalletToBank
);
router.post(
  '/settlement/payout',
  authenticate,
  authorizeMerchant,
  requirePermission(Permission.INITIATE_PAYOUT, Permission.APPROVE_PAYOUT),
  WalletController.payoutSettlementWalletToBank
);
router.post(
  '/repayment/fee',
  authenticate,
  authorizeMerchant,
  requirePermission(Permission.RECONCILE_LEDGER),
  WalletController.processKycFee
);
router.post(
  '/settlement/fee',
  authenticate,
  authorizeMerchant,
  requirePermission(Permission.RECONCILE_LEDGER),
  WalletController.processKycFee
);
router.post(
  '/kyc/fee',
  authenticate,
  authorizeMerchant,
  requirePermission(Permission.RECONCILE_LEDGER),
  WalletController.processKycFee
);

// User wallet routes
router.post('/user', authenticate, authorizeUser, WalletController.createUserWallet);
router.get('/user/:userId', authenticateJwtOrGatewayMerchant, WalletController.getUserWallet);
router.put('/user/:userId/balance', authenticate, authorizeUser, WalletController.updateUserWalletBalance);
router.get(
  '/user/:userId/transactions',
  authenticateJwtOrGatewayMerchant,
  WalletController.filterUserTransactions
);
router.post('/user/:userId/transfer', authenticate, authorizeUser, WalletController.transferOutFromUser);
router.post('/user/:userId/api-call', authenticate, authorizeUser, WalletController.makeUserApiCall);

// Funding routes (public endpoints for payment provider callbacks)
router.post('/funding/callback', FundingController.handleFundingCallback);
router.post('/funding/callback/legerblock', FundingController.handleLegerblockFundingCallback);
router.get('/funding/status/:transactionId', FundingController.checkFundingStatus);

// Charis / BankOne activity push webhooks (token via header or ?authToken=)
router.get('/bankone/webhook', BankOneWebhookController.getInfo);
router.post('/bankone/webhook', BankOneWebhookController.handleActivity);

// Mono Direct Debit repayment collection
router.post(
  '/repayments/mono/mandates',
  authenticate,
  authorizeMerchant,
  requirePermission(Permission.INITIATE_PAYOUT, Permission.RECONCILE_LEDGER),
  MonoDirectDebitController.createMandate
);
router.get(
  '/repayments/mono/mandates/:mandateId/balance-inquiry',
  authenticate,
  authorizeMerchant,
  requirePermission(Permission.VIEW_WALLET_BALANCES, Permission.VIEW_TRANSACTION_LEDGER),
  MonoDirectDebitController.balanceInquiry
);
router.post(
  '/repayments/mono/mandates/:mandateId/debit',
  authenticate,
  authorizeMerchant,
  requirePermission(Permission.INITIATE_PAYOUT, Permission.RECONCILE_LEDGER),
  MonoDirectDebitController.initiateDebit
);
router.post('/repayments/mono/webhook', MonoDirectDebitController.webhook);

/** Spring integrator commodity principal → creator REPAYMENT wallet (gateway-verified PLATA keys only). */
router.post(
  '/commodity/principal-repayment',
  requireVerifiedGatewayMerchant,
  collectCommodityPrincipalRepayment
);
// Deprecated alias — use /commodity/principal-repayment
router.post(
  '/commodity/principal-settlement',
  requireVerifiedGatewayMerchant,
  collectCommodityPrincipalSettlement
);
/** Spring integrator maturity → debit creator TREASURY (user credit on Spring). */
router.post(
  '/commodity/maturity-payout',
  requireVerifiedGatewayMerchant,
  debitCommodityMaturityFromTreasury
);
router.post(
  '/savings/maturity-payout',
  requireVerifiedGatewayMerchant,
  debitCommodityMaturityFromTreasury
);
router.post(
  '/investment/maturity-payout',
  requireVerifiedGatewayMerchant,
  debitCommodityMaturityFromTreasury
);
/** Spring storefront: enqueue for FI Withdrawals approval (no debit yet). */
router.post(
  '/commodity/maturity-withdrawal-request',
  requireVerifiedGatewayMerchant,
  requestMaturityWithdrawal
);
router.post(
  '/savings/maturity-withdrawal-request',
  requireVerifiedGatewayMerchant,
  requestMaturityWithdrawal
);
router.post(
  '/investment/maturity-withdrawal-request',
  requireVerifiedGatewayMerchant,
  requestMaturityWithdrawal
);
router.post(
  '/investment/principal-repayment',
  requireVerifiedGatewayMerchant,
  collectInvestmentPrincipalRepayment
);
// Deprecated alias — use /investment/principal-repayment
router.post(
  '/investment/principal-settlement',
  requireVerifiedGatewayMerchant,
  collectInvestmentPrincipalSettlement
);
router.post(
  '/savings/principal-repayment',
  requireVerifiedGatewayMerchant,
  collectSavingsPrincipalRepayment
);
// Deprecated alias — use /savings/principal-repayment
router.post(
  '/savings/principal-settlement',
  requireVerifiedGatewayMerchant,
  collectSavingsPrincipalSettlement
);

router.post(
  '/savings/application-activity',
  requireVerifiedGatewayMerchant,
  InternalWalletController.savingsApplicationActivity
);

// Get wallets by merchant (merchant can view all wallets associated with their business)
router.get(
  '/merchant/:merchantId/users',
  authenticate,
  authorizeMerchant,
  requirePermission(Permission.VIEW_WALLET_BALANCES),
  WalletController.getUserWalletsByMerchant
);

export { router as walletRoutes };