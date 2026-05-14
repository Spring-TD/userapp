import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response } from 'express';
import { BillingController } from '../controllers/BillingController';
import { BillingService } from '../services/billingService';
import { RecurringBillingService } from '../services/recurringBillingService';
import { BillingScheduler } from '../services/billingScheduler';

// Mock the services
jest.mock('../services/billingService');
jest.mock('../services/recurringBillingService');
jest.mock('../services/billingScheduler');

const mockedBillingService = BillingService as jest.Mocked<typeof BillingService>;
const mockedRecurringBillingService = RecurringBillingService as jest.Mocked<typeof RecurringBillingService>;
// Use a regular mock for BillingScheduler since it has a private constructor
const mockedBillingScheduler = {
  getInstance: jest.fn(),
} as unknown as jest.Mocked<typeof BillingScheduler>;

// Mock Express request and response
const mockRequest = (body: any = {}, params: any = {}, query: any = {}) => {
  return {
    body,
    params,
    query
  } as Request;
};

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res) as any;
  res.json = jest.fn().mockReturnValue(res) as any;
  return res;
};

describe('BillingController', () => {
  let req: Request;
  let res: Response;

  beforeEach(() => {
    res = mockResponse();
    jest.clearAllMocks();
  });

  describe('Invoice Endpoints', () => {
    it('should create an invoice successfully', async () => {
      const invoiceData = {
        merchantId: 'merchant_123',
        amount: 100,
        currency: 'USD'
      };

      mockedBillingService.createInvoice.mockResolvedValue({
        id: 'inv_123',
        merchantId: 'merchant_123',
        amount: 100,
        currency: 'USD',
        items: [],
        billingType: 'one-time',
        status: 'pending',
        issuedDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      } as any);

      req = mockRequest(invoiceData);
      await BillingController.createInvoice(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Invoice created successfully',
        data: expect.objectContaining({
          id: 'inv_123',
          merchantId: 'merchant_123',
          amount: 100
        })
      });
    });

    it('should handle invoice creation error', async () => {
      const invoiceData = {
        merchantId: 'merchant_123',
        amount: 100,
        currency: 'USD'
      };

      mockedBillingService.createInvoice.mockRejectedValue(new Error('Database error'));

      req = mockRequest(invoiceData);
      await BillingController.createInvoice(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error creating invoice',
        error: 'Database error'
      });
    });

    it('should retrieve an invoice by ID', async () => {
      mockedBillingService.getInvoice.mockResolvedValue({
        id: 'inv_123',
        merchantId: 'merchant_123',
        amount: 100,
        currency: 'USD',
        items: [],
        billingType: 'one-time',
        status: 'paid',
        issuedDate: new Date(),
        paidDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      } as any);

      req = mockRequest({}, { id: 'inv_123' });
      await BillingController.getInvoice(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Invoice retrieved successfully',
        data: expect.objectContaining({
          id: 'inv_123',
          status: 'paid'
        })
      });
    });
  });

  describe('Payment Endpoints', () => {
    it('should process a payment successfully', async () => {
      const paymentData = {
        merchantId: 'merchant_123',
        amount: 50,
        currency: 'USD',
        method: 'card'
      };

      mockedBillingService.processPayment.mockResolvedValue({
        id: 'pay_123',
        merchantId: 'merchant_123',
        amount: 50,
        currency: 'USD',
        billingType: 'one-time',
        method: 'card',
        status: 'completed',
        processedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      } as any);

      req = mockRequest(paymentData);
      await BillingController.processPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Payment processed successfully',
        data: expect.objectContaining({
          id: 'pay_123',
          status: 'completed'
        })
      });
    });
  });

  describe('Subscription Endpoints', () => {
    it('should create a subscription successfully', async () => {
      const subscriptionData = {
        merchantId: 'merchant_123',
        customerId: 'customer_123',
        planId: 'basic',
        amount: 29.99,
        currency: 'USD'
      };

      mockedBillingService.createSubscription.mockResolvedValue({
        id: 'sub_123',
        merchantId: 'merchant_123',
        customerId: 'customer_123',
        planId: 'basic',
        amount: 29.99,
        currency: 'USD',
        billingType: 'recurring',
        interval: 'month',
        intervalCount: 1,
        status: 'active',
        startDate: new Date(),
        nextBillingDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      } as any);

      req = mockRequest(subscriptionData);
      await BillingController.createSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Subscription created successfully',
        data: expect.objectContaining({
          id: 'sub_123',
          status: 'active'
        })
      });
    });
  });

  describe('Recurring Billing Endpoints', () => {
    it('should create a recurring billing successfully', async () => {
      const recurringBillingData = {
        amount: 100,
        billingCycle: 30,
        billTo: 'user_123',
        billingFor: 'Monthly subscription',
        billingTitle: 'Premium Plan'
      };

      mockedRecurringBillingService.createRecurringBilling.mockResolvedValue({
        id: 'rb_123',
        amount: 100,
        billingType: 'recurring',
        billingCycle: 30,
        billingCount: 0,
        billTo: 'user_123',
        billingFor: 'Monthly subscription',
        billingTitle: 'Premium Plan',
        billingException: {
          maxAttempts: 3,
          currentAttempts: 0
        },
        status: 'active',
        startDate: new Date(),
        nextBillingDate: new Date(),
        totalBilled: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any);

      req = mockRequest(recurringBillingData);
      await BillingController.createRecurringBilling(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Recurring billing created successfully',
        data: expect.objectContaining({
          id: 'rb_123',
          status: 'active'
        })
      });
    });

    it('should trigger recurring billing process', async () => {
      const mockSchedulerInstance = {
        runNow: jest.fn(() => Promise.resolve())
      };
      
      mockedBillingScheduler.getInstance.mockReturnValue(mockSchedulerInstance as any);

      req = mockRequest();
      await BillingController.triggerRecurringBilling(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Recurring billing process triggered successfully'
      });
      expect(mockSchedulerInstance.runNow).toHaveBeenCalled();
    });

    it('should cancel a recurring billing', async () => {
      mockedRecurringBillingService.cancelRecurringBilling.mockResolvedValue({
        success: true,
        message: 'Recurring billing rb_123 cancelled successfully'
      });

      req = mockRequest({}, { id: 'rb_123' });
      await BillingController.cancelRecurringBilling(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Recurring billing rb_123 cancelled successfully'
      });
    });
  });

  describe('Billing Status Endpoints', () => {
    it('should check billing status successfully', async () => {
      mockedBillingService.processBillingWithInsufficientFundsHandling.mockResolvedValue({
        success: true,
        requiresBillingPageRedirect: false,
        message: 'Billing operation completed successfully'
      });

      const billingData = {
        walletId: 'wallet_123',
        userId: 'user_123',
        amount: 100,
        description: 'Test billing'
      };

      req = mockRequest(billingData);
      await BillingController.checkBillingStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Billing operation completed successfully',
        redirectToBillingPage: false
      });
    });

    it('should return error for missing required parameters', async () => {
      req = mockRequest({ amount: 100 }); // Missing walletId and userId
      await BillingController.checkBillingStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Missing required parameters: walletId, userId, and amount are required'
      });
    });
  });
});