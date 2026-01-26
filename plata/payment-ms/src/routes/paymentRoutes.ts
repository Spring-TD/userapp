import { Router } from 'express';
import paymentController from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Process a payment
router.post('/process', paymentController.processPayment.bind(paymentController));

// Get payment by ID
router.get('/:paymentId', paymentController.getPayment.bind(paymentController));

// Refund a payment
router.post('/:paymentId/refund', paymentController.refundPayment.bind(paymentController));

export { router as paymentRoutes };
