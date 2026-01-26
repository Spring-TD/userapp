import { Request, Response, NextFunction } from 'express';
import paymentService from '../services/paymentService';
import { PaymentRequest } from '../types/payment';
import logger from '../utils/logger';

export class PaymentController {
  /**
   * Process a new payment
   */
  async processPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paymentRequest: PaymentRequest = {
        userId: req.user?.userId || req.body.userId,
        amount: req.body.amount,
        currency: req.body.currency || 'USD',
        method: req.body.method,
        metadata: req.body.metadata
      };

      const payment = await paymentService.processPayment(paymentRequest);

      res.status(201).json({
        success: true,
        data: payment,
        message: 'Payment processed successfully'
      });
    } catch (error) {
      logger.error('Error in processPayment controller', error);
      next(error);
    }
  }

  /**
   * Get payment by ID
   */
  async getPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { paymentId } = req.params;
      const payment = await paymentService.getPaymentById(paymentId);

      if (!payment) {
        res.status(404).json({
          success: false,
          error: 'Payment not found'
        });
        return;
      }

      res.json({
        success: true,
        data: payment
      });
    } catch (error) {
      logger.error('Error in getPayment controller', error);
      next(error);
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { paymentId } = req.params;
      const payment = await paymentService.refundPayment(paymentId);

      res.json({
        success: true,
        data: payment,
        message: 'Payment refunded successfully'
      });
    } catch (error) {
      logger.error('Error in refundPayment controller', error);
      next(error);
    }
  }
}

export default new PaymentController();
