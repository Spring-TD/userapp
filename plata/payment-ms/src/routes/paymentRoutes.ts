/**
 * Payment routes (mounted at /api/v1/payments)
 * All routes require JWT authentication.
 *
 * @openapi
 * /api/v1/payments/process:
 *   post:
 *     summary: Process a payment
 *     tags: [Payments]
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
 *               - method
 *             properties:
 *               userId:
 *                 type: string
 *                 description: Optional; from JWT if omitted
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *                 default: USD
 *               method:
 *                 type: string
 *                 enum: [card, bank_transfer, paypal, crypto]
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Payment processed
 *       401:
 *         description: Authentication required
 * /api/v1/payments/{paymentId}:
 *   get:
 *     summary: Get payment by ID
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment details
 *       404:
 *         description: Payment not found
 * /api/v1/payments/{paymentId}/refund:
 *   post:
 *     summary: Refund a payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment refunded
 */

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
