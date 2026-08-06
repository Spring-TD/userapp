import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { BillingService } from '../services/billingService';
import { RecurringBillingService } from '../services/recurringBillingService';
import { BillingScheduler } from '../services/billingScheduler';
import { BillingType } from '../types/billingTypes';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock Express request, response, and next function
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

const mockNext = () => {
  return jest.fn();
};

describe('BillingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Invoice Operations', () => {
    it('should create a new invoice with default values', async () => {
      const invoiceData = {
        merchantId: 'merchant_123',
        amount: 100.00,
        currency: 'USD'
      };

      const result = await BillingService.createInvoice(invoiceData);

      expect(result).toBeDefined();
      expect(result.id).toContain('inv_');
      expect(result.merchantId).toBe(invoiceData.merchantId);
      expect(result.amount).toBe(invoiceData.amount);
      expect(result.currency).toBe(invoiceData.currency);
      expect(result.billingType).toBe(BillingType.ONE_TIME);
      expect(result.status).toBe('pending');
    });

    it('should retrieve an invoice by ID', async () => {
      const invoiceId = 'inv_123';

      const result = await BillingService.getInvoice(invoiceId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(invoiceId);
      expect(result?.status).toBe('paid');
    });

    it('should update an invoice', async () => {
      const invoiceId = 'inv_123';
      const updateData = { status: 'paid' as const, notes: 'Payment received' };

      const result = await BillingService.updateInvoice(invoiceId, updateData);

      expect(result).toBeDefined();
      expect(result?.id).toBe(invoiceId);
      expect(result?.status).toBe(updateData.status);
      expect(result?.updatedAt).toBeDefined();
    });
  });

  describe('Payment Operations', () => {
    it('should process a payment and return payment details', async () => {
      const paymentData = {
        merchantId: 'merchant_123',
        amount: 50.00,
        currency: 'USD',
        method: 'card' as const
      };

      const result = await BillingService.processPayment(paymentData);

      expect(result).toBeDefined();
      expect(result.id).toContain('pay_');
      expect(result.merchantId).toBe(paymentData.merchantId);
      expect(result.amount).toBe(paymentData.amount);
      expect(result.currency).toBe(paymentData.currency);
      expect(result.method).toBe(paymentData.method);
      expect(result.status).toBe('completed');
    });

    it('should retrieve a payment by ID', async () => {
      const paymentId = 'pay_123';

      const result = await BillingService.getPayment(paymentId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(paymentId);
      expect(result?.status).toBe('completed');
    });
  });

  describe('Subscription Operations', () => {
    it('should create a new subscription with default values', async () => {
      const subscriptionData = {
        merchantId: 'merchant_123',
        customerId: 'customer_123',
        planId: 'basic',
        amount: 29.99,
        currency: 'USD'
      };

      const result = await BillingService.createSubscription(subscriptionData);

      expect(result).toBeDefined();
      expect(result.id).toContain('sub_');
      expect(result.merchantId).toBe(subscriptionData.merchantId);
      expect(result.customerId).toBe(subscriptionData.customerId);
      expect(result.planId).toBe(subscriptionData.planId);
      expect(result.amount).toBe(subscriptionData.amount);
      expect(result.currency).toBe(subscriptionData.currency);
      expect(result.billingType).toBe(BillingType.RECURRING);
      expect(result.status).toBe('active');
    });

    it('should retrieve a subscription by ID', async () => {
      const subscriptionId = 'sub_123';

      const result = await BillingService.getSubscription(subscriptionId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(subscriptionId);
      expect(result?.status).toBe('active');
    });
  });

  describe('Wallet Integration', () => {
    describe('checkWalletBalance', () => {
      it('should return wallet information when wallet service responds successfully', async () => {
        const walletId = 'wallet_123';
        const amount = 100;
        
        mockedAxios.get.mockResolvedValue({
          status: 200,
          data: {
            success: true,
            data: {
              mainBalance: 150
            }
          }
        });

        const result = await BillingService.checkWalletBalance(walletId, amount);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.hasSufficientFunds).toBe(true);
        expect(mockedAxios.get).toHaveBeenCalledWith(
          'http://localhost:3004/api/v1/wallets/wallet_123',
          { timeout: 5000 }
        );
      });

      it('should return insufficient funds when wallet balance is less than amount', async () => {
        const walletId = 'wallet_123';
        const amount = 200;
        
        mockedAxios.get.mockResolvedValue({
          status: 200,
          data: {
            success: true,
            data: {
              mainBalance: 150
            }
          }
        });

        const result = await BillingService.checkWalletBalance(walletId, amount);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.hasSufficientFunds).toBe(false);
      });

      it('should handle wallet service errors', async () => {
        const walletId = 'wallet_123';
        const amount = 100;
        
        mockedAxios.get.mockRejectedValue({
          response: {
            status: 404,
            data: { error: 'Wallet not found' }
          }
        });

        const result = await BillingService.checkWalletBalance(walletId, amount);

        expect(result).toBeDefined();
        expect(result.success).toBe(false);
        expect(result.hasSufficientFunds).toBe(false);
        expect(result.error).toContain('Wallet service error');
      });
    });

    describe('debitUserWallet', () => {
      it('should successfully debit user wallet', async () => {
        const userId = 'user_123';
        const amount = 100;
        const description = 'Test billing';
        
        mockedAxios.post.mockResolvedValue({
          status: 200,
          data: {
            success: true,
            data: {
              transaction: { id: 'txn_123' }
            }
          }
        });

        const result = await BillingService.debitUserWallet(userId, amount, description);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.transaction).toBeDefined();
        expect(mockedAxios.post).toHaveBeenCalledWith(
          'http://localhost:3004/api/v1/wallets/repayment/debit',
          { userId, amount, description },
          { timeout: 5000 }
        );
      });

      it('should handle insufficient funds error', async () => {
        const userId = 'user_123';
        const amount = 100;
        const description = 'Test billing';
        
        mockedAxios.post.mockRejectedValue({
          response: {
            status: 400,
            data: { error: 'Insufficient balance in wallet' }
          }
        });

        const result = await BillingService.debitUserWallet(userId, amount, description);

        expect(result).toBeDefined();
        expect(result.success).toBe(false);
        expect(result.error).toBe('INSUFFICIENT_FUNDS');
      });
    });

    describe('processBillingWithInsufficientFundsHandling', () => {
      it('should process billing successfully when user has sufficient funds', async () => {
        const walletId = 'wallet_123';
        const userId = 'user_123';
        const amount = 100;
        const description = 'Test billing';
        
        // Mock successful debit
        jest.spyOn(BillingService, 'debitUserWallet').mockResolvedValue({
          success: true,
          transaction: { id: 'txn_123' }
        });

        const result = await BillingService.processBillingWithInsufficientFundsHandling(
          walletId,
          userId,
          amount,
          description
        );

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.requiresBillingPageRedirect).toBe(false);
        expect(result.message).toBe('Billing operation completed successfully');
      });

      it('should suspend account and redirect when user has insufficient funds', async () => {
        const walletId = 'wallet_123';
        const userId = 'user_123';
        const amount = 100;
        const description = 'Test billing';
        
        // Mock insufficient funds error
        jest.spyOn(BillingService, 'debitUserWallet').mockResolvedValue({
          success: false,
          error: 'INSUFFICIENT_FUNDS'
        });
        
        // Mock successful account suspension
        jest.spyOn(BillingService, 'suspendUserAccount').mockResolvedValue({
          success: true,
          message: 'User account suspended successfully'
        });

        const result = await BillingService.processBillingWithInsufficientFundsHandling(
          walletId,
          userId,
          amount,
          description
        );

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.requiresBillingPageRedirect).toBe(true);
        expect(result.message).toContain('Insufficient funds');
      });
    });
  });
});

describe('RecurringBillingService', () => {
  describe('createRecurringBilling', () => {
    it('should create a new recurring billing record', async () => {
      const billingData = {
        amount: 100,
        billingCycle: 30,
        billTo: 'user_123',
        billingFor: 'Monthly subscription',
        billingTitle: 'Premium Plan'
      };

      const result = await RecurringBillingService.createRecurringBilling(billingData);

      expect(result).toBeDefined();
      expect(result.id).toContain('rb_');
      expect(result.amount).toBe(billingData.amount);
      expect(result.billingCycle).toBe(billingData.billingCycle);
      expect(result.billTo).toBe(billingData.billTo);
      expect(result.billingFor).toBe(billingData.billingFor);
      expect(result.billingTitle).toBe(billingData.billingTitle);
      expect(result.billingType).toBe(BillingType.RECURRING);
      expect(result.status).toBe('active');
    });
  });

  describe('Recurring Billing Management', () => {
    it('should cancel a recurring billing', async () => {
      const billingId = 'rb_123';

      const result = await RecurringBillingService.cancelRecurringBilling(billingId, 'User requested cancellation');

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.message).toContain('cancelled successfully');
    });

    it('should pause a recurring billing', async () => {
      const billingId = 'rb_123';

      const result = await RecurringBillingService.pauseRecurringBilling(billingId);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.message).toContain('paused successfully');
    });

    it('should resume a recurring billing', async () => {
      const billingId = 'rb_123';

      const result = await RecurringBillingService.resumeRecurringBilling(billingId);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.message).toContain('resumed successfully');
    });
  });
});

describe('BillingScheduler', () => {
  describe('getInstance', () => {
    it('should return the same instance each time', () => {
      const instance1 = BillingScheduler.getInstance();
      const instance2 = BillingScheduler.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Scheduler Operations', () => {
    let scheduler: BillingScheduler;
    
    beforeEach(() => {
      scheduler = BillingScheduler.getInstance();
    });

    it('should start the scheduler and set isRunning to true', () => {
      // Mock the runBillingProcess method to avoid actual processing
      const runBillingProcessSpy = jest.spyOn(scheduler as any, 'runBillingProcess').mockImplementation(() => Promise.resolve());
      
      scheduler.start(1000); // 1 second interval for testing
      
      expect(scheduler['isRunning']).toBe(true);
      
      // Clean up
      scheduler.stop();
      runBillingProcessSpy.mockRestore();
    });

    it('should stop the scheduler and set isRunning to false', () => {
      // Mock the runBillingProcess method to avoid actual processing
      const runBillingProcessSpy = jest.spyOn(scheduler as any, 'runBillingProcess').mockImplementation(() => Promise.resolve());
      
      scheduler.start(1000);
      scheduler.stop();
      
      expect(scheduler['isRunning']).toBe(false);
      expect(scheduler['intervalId']).toBeNull();
      
      runBillingProcessSpy.mockRestore();
    });

    it('should not start if already running', () => {
      // Mock console.log to verify the message
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      // Mock the runBillingProcess method to avoid actual processing
      const runBillingProcessSpy = jest.spyOn(scheduler as any, 'runBillingProcess').mockImplementation(() => Promise.resolve());
      
      scheduler.start(1000);
      scheduler.start(1000); // Try to start again
      
      expect(consoleSpy).toHaveBeenCalledWith('Billing scheduler is already running');
      
      // Clean up
      scheduler.stop();
      consoleSpy.mockRestore();
      runBillingProcessSpy.mockRestore();
    });
  });
});