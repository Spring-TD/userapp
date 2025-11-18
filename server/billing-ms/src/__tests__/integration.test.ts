import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { BillingService } from '../services/billingService';
import { RecurringBillingService } from '../services/recurringBillingService';
import { BillingScheduler } from '../services/billingScheduler';
import { BillingType } from '../types/billingTypes';

describe('Billing Microservice Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create and process a complete billing flow', async () => {
    // 1. Create an invoice
    const invoiceData = {
      merchantId: 'merchant_123',
      amount: 100.00,
      currency: 'USD',
      items: [{
        id: 'item_1',
        description: 'Test item',
        quantity: 1,
        unitPrice: 100.00,
        total: 100.00
      }]
    };

    const invoice = await BillingService.createInvoice(invoiceData);
    expect(invoice).toBeDefined();
    expect(invoice.id).toContain('inv_');
    expect(invoice.amount).toBe(100.00);
    expect(invoice.status).toBe('pending');

    // 2. Process a payment for the invoice
    const paymentData = {
      invoiceId: invoice.id,
      merchantId: 'merchant_123',
      amount: 100.00,
      currency: 'USD',
      method: 'card' as const
    };

    const payment = await BillingService.processPayment(paymentData);
    expect(payment).toBeDefined();
    expect(payment.id).toContain('pay_');
    expect(payment.amount).toBe(100.00);
    expect(payment.status).toBe('completed');

    // 3. Create a recurring billing
    const recurringBillingData = {
      amount: 29.99,
      billingCycle: 30,
      billTo: 'user_123',
      billingFor: 'Monthly subscription',
      billingTitle: 'Premium Plan'
    };

    const recurringBilling = await RecurringBillingService.createRecurringBilling(recurringBillingData);
    expect(recurringBilling).toBeDefined();
    expect(recurringBilling.id).toContain('rb_');
    expect(recurringBilling.amount).toBe(29.99);
    expect(recurringBilling.billingType).toBe(BillingType.RECURRING);
    expect(recurringBilling.status).toBe('active');

    // 4. Verify the scheduler can be instantiated
    const scheduler = BillingScheduler.getInstance();
    expect(scheduler).toBeDefined();
    
    const scheduler2 = BillingScheduler.getInstance();
    expect(scheduler2).toBe(scheduler); // Should be singleton

    // 5. Test recurring billing management
    const cancelResult = await RecurringBillingService.cancelRecurringBilling(recurringBilling.id);
    expect(cancelResult.success).toBe(true);
    expect(cancelResult.message).toContain('cancelled successfully');
  });

  it('should process recurring billing cycle correctly', async () => {
    // Mock the processDueRecurringBillings method
    const processResult = await RecurringBillingService.processDueRecurringBillings();
    
    expect(processResult).toBeDefined();
    expect(processResult.success).toBe(true);
    expect(typeof processResult.processedCount).toBe('number');
    expect(typeof processResult.failedCount).toBe('number');
    expect(Array.isArray(processResult.errors)).toBe(true);
  });
});