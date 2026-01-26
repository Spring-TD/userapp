import paymentService from '../services/paymentService';
import { PaymentMethod, PaymentStatus } from '../types/payment';

describe('PaymentService', () => {
  describe('processPayment', () => {
    it('should process a payment successfully', async () => {
      const paymentRequest = {
        userId: 'user-123',
        amount: 100.50,
        currency: 'USD',
        method: PaymentMethod.CARD,
        metadata: { orderId: 'order-456' }
      };

      const payment = await paymentService.processPayment(paymentRequest);

      expect(payment).toBeDefined();
      expect(payment.paymentId).toBeDefined();
      expect(payment.userId).toBe('user-123');
      expect(payment.amount).toBe(100.50);
      expect(payment.currency).toBe('USD');
      expect(payment.method).toBe(PaymentMethod.CARD);
      expect(payment.status).toBe(PaymentStatus.COMPLETED);
      expect(payment.transactionId).toBeDefined();
    });
  });

  describe('getPaymentById', () => {
    it('should return null for non-existent payment', async () => {
      const payment = await paymentService.getPaymentById('non-existent-id');
      expect(payment).toBeNull();
    });
  });

  describe('refundPayment', () => {
    it('should throw error for not implemented', async () => {
      await expect(paymentService.refundPayment('payment-123')).rejects.toThrow('Not implemented');
    });
  });
});
