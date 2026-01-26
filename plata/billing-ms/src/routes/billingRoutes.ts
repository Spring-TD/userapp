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