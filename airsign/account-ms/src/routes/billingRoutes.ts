import { Router } from 'express';
import { BillingController } from '../controllers/billingController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.post('/invoices', BillingController.createInvoice);
router.get('/invoices/:merchantId', BillingController.getInvoices);
router.post('/payments', BillingController.recordPayment);
router.post('/subscriptions', BillingController.createSubscription);
router.get('/subscriptions/:merchantId', BillingController.getSubscriptions);

export default router;
