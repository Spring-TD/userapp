/**
 * Record routes (mounted at /api/v1/records)
 * Merchant/merchant-user records, ledger entries, fund/debit, analytics.
 * Most endpoints require JWT; webhook does not.
 *
 * @openapi
 * /api/v1/records/webhook/create:
 *   post:
 *     summary: Create record (webhook from service-auth-ms)
 *     tags: [Records]
 *     description: No authentication. Called after successful account verification.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - email
 *               - firstName
 *               - lastName
 *               - userType
 *               - userMerchantId
 *               - country
 *               - verifiedAt
 *             properties:
 *               userId:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               userType:
 *                 type: string
 *                 enum: [MERCHANT, USER]
 *               userMerchantId:
 *                 type: string
 *               country:
 *                 type: string
 *               phone:
 *                 type: string
 *               verifiedAt:
 *                 type: string
 *                 format: date-time
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Record created
 *       400:
 *         description: Validation failed
 * /api/v1/records/merchants/all:
 *   get:
 *     summary: Get all merchant records
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of merchants and count
 * /api/v1/records/merchant/{userMerchantId}/users:
 *   get:
 *     summary: Get merchant-user records by merchant ID
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userMerchantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of users and count
 * /api/v1/records/user/{userId}:
 *   get:
 *     summary: Get record by user ID
 *     tags: [Records]
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
 *         description: Record for user
 *       404:
 *         description: Record not found
 * /api/v1/records/email/{email}:
 *   get:
 *     summary: Get record by email
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Record for email
 *       404:
 *         description: Record not found
 * /api/v1/records/{recordId}:
 *   get:
 *     summary: Get record by ID
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Record details
 *       404:
 *         description: Record not found
 * /api/v1/records/{recordId}/deactivate:
 *   put:
 *     summary: Deactivate record
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Record deactivated
 * /api/v1/records/{recordId}/activate:
 *   put:
 *     summary: Activate record
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Record activated
 * /api/v1/records/{recordId}/ledger:
 *   get:
 *     summary: Get ledger entries for record
 *     tags: [Records - Ledger]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: entryType
 *         schema:
 *           type: string
 *           enum: [DEBIT, CREDIT]
 *       - in: query
 *         name: financialCategory
 *         schema:
 *           type: string
 *           enum: [LOAN, SAVINGS, MORTGAGE, COMMODITY, WALLET]
 *       - in: query
 *         name: transactionType
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
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paginated ledger entries
 * /api/v1/records/{recordId}/ledger/summary:
 *   get:
 *     summary: Get ledger summary for record
 *     tags: [Records - Ledger]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Balance, totals, transaction count
 * /api/v1/records/{recordId}/ledger/entry:
 *   post:
 *     summary: Add ledger entry (debit/credit)
 *     tags: [Records - Ledger]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recordId
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
 *               - entryType
 *               - debitAmount
 *               - transactionDescription
 *               - transactionType
 *               - txnRef
 *               - sessionId
 *               - fromCurrency
 *               - toCurrency
 *               - senderInfo
 *               - feeBreakdown
 *             properties:
 *               entryType:
 *                 type: string
 *                 enum: [DEBIT, CREDIT]
 *               debitAmount:
 *                 type: number
 *               transactionDescription:
 *                 type: string
 *               transactionType:
 *                 type: string
 *               financialCategory:
 *                 type: string
 *                 enum: [LOAN, SAVINGS, MORTGAGE, COMMODITY, WALLET]
 *               txnRef:
 *                 type: string
 *               sessionId:
 *                 type: string
 *               fromCurrency:
 *                 type: string
 *               toCurrency:
 *                 type: string
 *               senderInfo:
 *                 type: object
 *                 properties:
 *                   full_name:
 *                     type: string
 *                   email:
 *                     type: string
 *                   phone:
 *                     type: string
 *               feeBreakdown:
 *                 type: object
 *                 properties:
 *                   payout_fee:
 *                     type: number
 *                   merchant_commission:
 *                     type: number
 *     responses:
 *       201:
 *         description: Ledger entry added
 *       400:
 *         description: Missing or invalid fields
 * /api/v1/records/{recordId}/fund:
 *   post:
 *     summary: Fund record (credit) in a category
 *     tags: [Records - Ledger]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recordId
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
 *               - category
 *               - amount
 *               - description
 *               - transactionType
 *               - txnRef
 *               - sessionId
 *               - fromCurrency
 *               - toCurrency
 *               - senderInfo
 *               - feeBreakdown
 *             properties:
 *               category:
 *                 type: string
 *                 enum: [LOAN, SAVINGS, MORTGAGE, COMMODITY, WALLET]
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *               transactionType:
 *                 type: string
 *               txnRef:
 *                 type: string
 *               sessionId:
 *                 type: string
 *               fromCurrency:
 *                 type: string
 *               toCurrency:
 *                 type: string
 *               senderInfo:
 *                 type: object
 *               feeBreakdown:
 *                 type: object
 *     responses:
 *       200:
 *         description: Fund operation result
 * /api/v1/records/{recordId}/debit:
 *   post:
 *     summary: Debit record in a category
 *     tags: [Records - Ledger]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recordId
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
 *               - category
 *               - amount
 *               - description
 *               - transactionType
 *               - txnRef
 *               - sessionId
 *               - fromCurrency
 *               - toCurrency
 *               - senderInfo
 *               - feeBreakdown
 *             properties:
 *               category:
 *                 type: string
 *                 enum: [LOAN, SAVINGS, MORTGAGE, COMMODITY, WALLET]
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *               transactionType:
 *                 type: string
 *               txnRef:
 *                 type: string
 *               sessionId:
 *                 type: string
 *               fromCurrency:
 *                 type: string
 *               toCurrency:
 *                 type: string
 *               senderInfo:
 *                 type: object
 *               feeBreakdown:
 *                 type: object
 *     responses:
 *       200:
 *         description: Debit operation result
 * /api/v1/records/{recordId}/category-summary:
 *   get:
 *     summary: Get category-specific summary for record
 *     tags: [Records - Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Summary per financial category
 * /api/v1/records/{recordId}/analytics:
 *   get:
 *     summary: Get comprehensive analytics for record
 *     tags: [Records - Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payin, payout, balance, category breakdown
 * /api/v1/records/merchant/{userMerchantId}/analytics:
 *   get:
 *     summary: Get aggregated merchant analytics
 *     tags: [Records - Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userMerchantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Merchant and all their users analytics
 */

import { Router } from 'express';
import recordController from '../controllers/recordController';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * Webhook endpoint - No authentication required
 * This endpoint is called by service-auth-ms after successful account verification
 */
router.post('/webhook/create', recordController.createRecordWebhook.bind(recordController));

/**
 * Protected endpoints - Require authentication
 */

// Get record by ID
router.get('/:recordId', authenticate, recordController.getRecord.bind(recordController));

// Get record by user ID
router.get('/user/:userId', authenticate, recordController.getRecordByUserId.bind(recordController));

// Get record by email
router.get('/email/:email', authenticate, recordController.getRecordByEmail.bind(recordController));

// Get all merchant records
router.get('/merchants/all', authenticate, recordController.getAllMerchants.bind(recordController));

// Get merchant-user records by merchant ID
router.get('/merchant/:userMerchantId/users', authenticate, recordController.getMerchantUsers.bind(recordController));

// Get ledger entries for a record
router.get('/:recordId/ledger', authenticate, recordController.getLedgerEntries.bind(recordController));

// Get ledger summary for a record
router.get('/:recordId/ledger/summary', authenticate, recordController.getLedgerSummary.bind(recordController));

// Add ledger entry
router.post('/:recordId/ledger/entry', authenticate, recordController.addLedgerEntry.bind(recordController));

// Deactivate record
router.put('/:recordId/deactivate', authenticate, recordController.deactivateRecord.bind(recordController));

// Activate record
router.put('/:recordId/activate', authenticate, recordController.activateRecord.bind(recordController));

// Fund record (Credit operation) in specific category
router.post('/:recordId/fund', authenticate, recordController.fundRecord.bind(recordController));

// Debit record (Debit operation) in specific category
router.post('/:recordId/debit', authenticate, recordController.debitRecord.bind(recordController));

// Get category-specific summary
router.get('/:recordId/category-summary', authenticate, recordController.getCategorySummary.bind(recordController));

// Get comprehensive analytics for a record
router.get('/:recordId/analytics', authenticate, recordController.getAnalytics.bind(recordController));

// Get aggregated merchant analytics (merchant + all their users)
router.get('/merchant/:userMerchantId/analytics', authenticate, recordController.getMerchantAnalytics.bind(recordController));

export { router as recordRoutes };
