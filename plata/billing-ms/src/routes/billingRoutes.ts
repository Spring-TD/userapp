/**
 * Billing routes (mounted at /api/v1/billing). Invoices, payments, subscriptions, transactions, recurring/one-time billing.
 *
 * @openapi
 * /api/v1/billing/invoices:
 *   post:
 *     summary: Create invoice
 *     tags: [Billing - Invoices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Invoice created
 *   get:
 *     summary: List invoices
 *     tags: [Billing - Invoices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Invoice list
 * /api/v1/billing/invoices/{id}:
 *   get:
 *     summary: Get invoice by ID
 *     tags: [Billing - Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invoice details
 *   put:
 *     summary: Update invoice
 *     tags: [Billing - Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invoice updated
 *   delete:
 *     summary: Delete invoice
 *     tags: [Billing - Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invoice deleted
 * /api/v1/billing/payments:
 *   post:
 *     summary: Process payment
 *     tags: [Billing - Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment processed
 *   get:
 *     summary: List payments
 *     tags: [Billing - Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment list
 * /api/v1/billing/payments/{id}:
 *   get:
 *     summary: Get payment by ID
 *     tags: [Billing - Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment details
 * /api/v1/billing/subscriptions:
 *   post:
 *     summary: Create subscription
 *     tags: [Billing - Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Subscription created
 *   get:
 *     summary: List subscriptions
 *     tags: [Billing - Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription list
 * /api/v1/billing/subscriptions/{id}:
 *   get:
 *     summary: Get subscription by ID
 *     tags: [Billing - Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Subscription details
 *   put:
 *     summary: Update subscription
 *     tags: [Billing - Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Subscription updated
 * /api/v1/billing/transactions:
 *   get:
 *     summary: List transactions
 *     tags: [Billing - Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transaction list
 * /api/v1/billing/transactions/{id}:
 *   get:
 *     summary: Get transaction by ID
 *     tags: [Billing - Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transaction details
 * /api/v1/billing/check-billing-status:
 *   post:
 *     summary: Check billing status
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Billing status
 * /api/v1/billing/billing-page/{userId}:
 *   get:
 *     summary: Get billing page info for user
 *     tags: [Billing]
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
 *         description: Billing page info
 * /api/v1/billing/recurring-billing/trigger:
 *   post:
 *     summary: Trigger recurring billing
 *     tags: [Billing - Recurring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Triggered
 * /api/v1/billing/recurring-billing/status:
 *   get:
 *     summary: Get recurring billing status
 *     tags: [Billing - Recurring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status
 * /api/v1/billing/recurring-billings:
 *   post:
 *     summary: Create recurring billing
 *     tags: [Billing - Recurring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Created
 *   get:
 *     summary: List recurring billings
 *     tags: [Billing - Recurring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List
 * /api/v1/billing/recurring-billings/{id}:
 *   get:
 *     summary: Get recurring billing by ID
 *     tags: [Billing - Recurring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Details
 *   put:
 *     summary: Update recurring billing
 *     tags: [Billing - Recurring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Updated
 * /api/v1/billing/recurring-billings/{id}/cancel:
 *   post:
 *     summary: Cancel recurring billing
 *     tags: [Billing - Recurring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cancelled
 * /api/v1/billing/recurring-billings/{id}/pause:
 *   post:
 *     summary: Pause recurring billing
 *     tags: [Billing - Recurring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paused
 * /api/v1/billing/recurring-billings/{id}/resume:
 *   post:
 *     summary: Resume recurring billing
 *     tags: [Billing - Recurring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resumed
 * /api/v1/billing/one-time-billings:
 *   post:
 *     summary: Create one-time billing
 *     tags: [Billing - One-time]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Created
 *   get:
 *     summary: List one-time billings
 *     tags: [Billing - One-time]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List
 * /api/v1/billing/one-time-billings/{id}:
 *   get:
 *     summary: Get one-time billing by ID
 *     tags: [Billing - One-time]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Details
 * /api/v1/billing/one-time-billings/{id}/process-payment:
 *   post:
 *     summary: Process payment for one-time billing
 *     tags: [Billing - One-time]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment processed
 * /api/v1/billing/transfers:
 *   post:
 *     summary: Process transfer
 *     tags: [Billing - Transfers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transfer processed
 * /api/v1/billing/withdrawals:
 *   post:
 *     summary: Process withdrawal
 *     tags: [Billing - Withdrawals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Withdrawal processed
 * /api/v1/billing/payouts:
 *   post:
 *     summary: Process payout
 *     tags: [Billing - Payouts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payout processed
 */
import { Router } from 'express';
import { BillingController } from '../controllers/BillingController';
import { pricingRoutes } from './pricingRoutes';
import { triggerRoutes } from './triggerRoutes';

const router = Router();

// Invoice routes
router.post('/invoices', BillingController.createInvoice);
router.get('/invoices/:id', BillingController.getInvoice);
router.get('/invoices', BillingController.listInvoices);
router.put('/invoices/:id', BillingController.updateInvoice);
router.delete('/invoices/:id', BillingController.deleteInvoice);

// Payment routes
router.post('/payments', BillingController.processPayment);
router.get('/payments/:id', BillingController.getPayment);
router.get('/payments', BillingController.listPayments);

// Subscription routes
router.post('/subscriptions', BillingController.createSubscription);
router.get('/subscriptions/:id', BillingController.getSubscription);
router.get('/subscriptions', BillingController.listSubscriptions);
router.put('/subscriptions/:id', BillingController.updateSubscription);

// Transaction routes
router.get('/transactions/:id', BillingController.getTransaction);
router.get('/transactions', BillingController.listTransactions);

// Billing status and account management routes
router.post('/check-billing-status', BillingController.checkBillingStatus);
router.get('/billing-page/:userId', BillingController.getBillingPageInfo);

// Recurring billing routes
router.post('/recurring-billing/trigger', BillingController.triggerRecurringBilling);
router.get('/recurring-billing/status', BillingController.getRecurringBillingStatus);

// New recurring billing routes based on the new data structure
router.post('/recurring-billings', BillingController.createRecurringBilling);
router.get('/recurring-billings/:id', BillingController.getRecurringBilling);
router.get('/recurring-billings', BillingController.listRecurringBillings);
router.put('/recurring-billings/:id', BillingController.updateRecurringBilling);
router.post('/recurring-billings/:id/cancel', BillingController.cancelRecurringBilling);
router.post('/recurring-billings/:id/pause', BillingController.pauseRecurringBilling);
router.post('/recurring-billings/:id/resume', BillingController.resumeRecurringBilling);

// One-time billing routes
router.post('/one-time-billings', BillingController.createOneTimeBilling);
router.get('/one-time-billings/:id', BillingController.getOneTimeBilling);
router.get('/one-time-billings', BillingController.listOneTimeBillings);
router.post('/one-time-billings/:id/process-payment', BillingController.processOneTimeBillingPayment);

// Transfer, Withdrawal, and Payout routes
router.post('/transfers', BillingController.processTransfer);
router.post('/withdrawals', BillingController.processWithdrawal);
router.post('/payouts', BillingController.processPayout);

// Pricing routes
router.use('/pricing', pricingRoutes);

// Trigger routes
router.use('/billing', triggerRoutes);

export { router as billingRoutes };