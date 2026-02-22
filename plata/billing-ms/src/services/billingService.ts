import { BillingType, Invoice, Payment, Subscription, Transaction, OneTimeBilling } from '../types/billingTypes';
import { InvoiceModel } from '../models/invoice.mongo';
import { PaymentModel } from '../models/payment.mongo';
import { SubscriptionModel } from '../models/subscription.mongo';
import { TransactionModel } from '../models/transaction.mongo';
import { OneTimeBillingModel } from '../models/oneTimeBilling.mongo';
import axios from 'axios';

export class BillingService {
  static async createInvoice(invoiceData: Partial<Invoice>): Promise<Invoice> {
    const invoice = new InvoiceModel({
      merchantId: invoiceData.merchantId || '',
      amount: invoiceData.amount || 0,
      currency: invoiceData.currency || 'USD',
      items: invoiceData.items || [],
      billingType: invoiceData.billingType || BillingType.ONE_TIME,
      status: invoiceData.status || 'pending',
      issuedDate: invoiceData.issuedDate || new Date(),
      dueDate: invoiceData.dueDate,
      paidDate: invoiceData.paidDate,
      notes: invoiceData.notes,
      customerId: invoiceData.customerId
    });

    const saved = await invoice.save();
    return saved.toJSON() as unknown as Invoice;
  }

  static async getInvoice(id: string): Promise<Invoice | null> {
    const invoice = await InvoiceModel.findById(id);
    if (!invoice) return null;
    return invoice.toJSON() as unknown as Invoice;
  }

  static async listInvoices(filters?: any): Promise<Invoice[]> {
    const query: any = {};
    if (filters?.merchantId) query.merchantId = filters.merchantId;
    if (filters?.status) query.status = filters.status;
    if (filters?.billingType) query.billingType = filters.billingType;

    const invoices = await InvoiceModel.find(query).sort({ createdAt: -1 });
    return invoices.map(inv => inv.toJSON() as unknown as Invoice);
  }

  static async updateInvoice(id: string, updateData: Partial<Invoice>): Promise<Invoice | null> {
    const invoice = await InvoiceModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );
    if (!invoice) return null;
    return invoice.toJSON() as unknown as Invoice;
  }

  static async deleteInvoice(id: string): Promise<boolean> {
    const result = await InvoiceModel.findByIdAndDelete(id);
    return !!result;
  }

  static async processPayment(paymentData: Partial<Payment>): Promise<Payment> {
    const payment = new PaymentModel({
      merchantId: paymentData.merchantId || '',
      amount: paymentData.amount || 0,
      currency: paymentData.currency || 'USD',
      billingType: paymentData.billingType || BillingType.ONE_TIME,
      method: paymentData.method || 'card',
      status: 'completed',
      processedAt: new Date(),
      invoiceId: paymentData.invoiceId,
      customerId: paymentData.customerId,
      transactionId: paymentData.transactionId
    });

    const saved = await payment.save();
    return saved.toJSON() as unknown as Payment;
  }

  static async getPayment(id: string): Promise<Payment | null> {
    const payment = await PaymentModel.findById(id);
    if (!payment) return null;
    return payment.toJSON() as unknown as Payment;
  }

  static async listPayments(filters?: any): Promise<Payment[]> {
    const query: any = {};
    if (filters?.merchantId) query.merchantId = filters.merchantId;
    if (filters?.status) query.status = filters.status;

    const payments = await PaymentModel.find(query).sort({ createdAt: -1 });
    return payments.map(p => p.toJSON() as unknown as Payment);
  }

  static async createSubscription(subscriptionData: Partial<Subscription>): Promise<Subscription> {
    const subscription = new SubscriptionModel({
      merchantId: subscriptionData.merchantId || '',
      customerId: subscriptionData.customerId || '',
      planId: subscriptionData.planId || '',
      amount: subscriptionData.amount || 0,
      currency: subscriptionData.currency || 'USD',
      billingType: subscriptionData.billingType || BillingType.RECURRING,
      interval: subscriptionData.interval || 'month',
      intervalCount: subscriptionData.intervalCount || 1,
      status: 'active',
      startDate: subscriptionData.startDate || new Date(),
      nextBillingDate: subscriptionData.nextBillingDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      endDate: subscriptionData.endDate,
      trialEnd: subscriptionData.trialEnd
    });

    const saved = await subscription.save();
    return saved.toJSON() as unknown as Subscription;
  }

  static async getSubscription(id: string): Promise<Subscription | null> {
    const subscription = await SubscriptionModel.findById(id);
    if (!subscription) return null;
    return subscription.toJSON() as unknown as Subscription;
  }

  static async listSubscriptions(filters?: any): Promise<Subscription[]> {
    const query: any = {};
    if (filters?.merchantId) query.merchantId = filters.merchantId;
    if (filters?.status) query.status = filters.status;

    const subscriptions = await SubscriptionModel.find(query).sort({ createdAt: -1 });
    return subscriptions.map(s => s.toJSON() as unknown as Subscription);
  }

  static async updateSubscription(id: string, updateData: Partial<Subscription>): Promise<Subscription | null> {
    const subscription = await SubscriptionModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );
    if (!subscription) return null;
    return subscription.toJSON() as unknown as Subscription;
  }

  static async getTransaction(id: string): Promise<Transaction | null> {
    const transaction = await TransactionModel.findById(id);
    if (!transaction) return null;
    return transaction.toJSON() as unknown as Transaction;
  }

  static async listTransactions(filters?: any): Promise<Transaction[]> {
    const query: any = {};
    if (filters?.merchantId) query.merchantId = filters.merchantId;
    if (filters?.status) query.status = filters.status;
    if (filters?.type) query.type = filters.type;

    const transactions = await TransactionModel.find(query).sort({ createdAt: -1 });
    return transactions.map(t => t.toJSON() as unknown as Transaction);
  }

  /**
   * Check if user has sufficient funds in their wallet
   */
  static async checkWalletBalance(walletId: string, amount: number): Promise<{
    success: boolean;
    hasSufficientFunds: boolean;
    wallet?: any;
    error?: string;
  }> {
    try {
      const walletServiceUrl = process.env.WALLET_SERVICE_URL || 'http://localhost:3004';

      const response = await axios.get(`${walletServiceUrl}/api/v1/wallets/${walletId}`, {
        timeout: 5000
      });

      if (response.status === 200 && response.data.success) {
        const wallet = response.data.data;
        const hasSufficientFunds = wallet.mainBalance >= amount;

        return {
          success: true,
          hasSufficientFunds,
          wallet
        };
      } else {
        return {
          success: false,
          hasSufficientFunds: false,
          error: response.data.error || 'Failed to retrieve wallet information'
        };
      }
    } catch (error: any) {
      if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          hasSufficientFunds: false,
          error: 'Wallet service timeout - unable to check balance'
        };
      } else if (error.response) {
        return {
          success: false,
          hasSufficientFunds: false,
          error: `Wallet service error: ${error.response.status} - ${error.response.data?.error || 'Unknown error'}`
        };
      } else if (error.request) {
        return {
          success: false,
          hasSufficientFunds: false,
          error: 'Unable to connect to wallet service'
        };
      } else {
        return {
          success: false,
          hasSufficientFunds: false,
          error: error.message || 'Unknown error occurred while checking wallet balance'
        };
      }
    }
  }

  /**
   * Debit user wallet for billing
   */
  static async debitUserWallet(userId: string, amount: number, description: string): Promise<{
    success: boolean;
    transaction?: any;
    error?: string;
  }> {
    try {
      const walletServiceUrl = process.env.WALLET_SERVICE_URL || 'http://localhost:3004';

      const response = await axios.post(`${walletServiceUrl}/api/v1/wallets/treasury/debit`, {
        userId,
        amount,
        description
      }, {
        timeout: 5000
      });

      if (response.status === 200 && response.data.success) {
        return {
          success: true,
          transaction: response.data.data.transaction
        };
      } else {
        return {
          success: false,
          error: response.data.error || 'Failed to debit user wallet'
        };
      }
    } catch (error: any) {
      if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          error: 'Wallet service timeout - unable to debit wallet'
        };
      } else if (error.response) {
        if (error.response.status === 400 && error.response.data?.error?.includes('Insufficient balance')) {
          return {
            success: false,
            error: 'INSUFFICIENT_FUNDS'
          };
        }
        return {
          success: false,
          error: `Wallet service error: ${error.response.status} - ${error.response.data?.error || 'Unknown error'}`
        };
      } else if (error.request) {
        return {
          success: false,
          error: 'Unable to connect to wallet service'
        };
      } else {
        return {
          success: false,
          error: error.message || 'Unknown error occurred while debiting wallet'
        };
      }
    }
  }

  /**
   * Suspend user account due to insufficient funds
   */
  static async suspendUserAccount(userId: string): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    try {
      console.log(`[BILLING SERVICE] Suspending account for user ${userId} due to insufficient funds`);

      return {
        success: true,
        message: 'User account suspended successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to suspend user account',
        error: error.message || 'Unknown error occurred while suspending account'
      };
    }
  }

  /**
   * Process a billing operation with insufficient funds handling
   */
  static async processBillingWithInsufficientFundsHandling(
    walletId: string,
    userId: string,
    amount: number,
    description: string
  ): Promise<{
    success: boolean;
    requiresBillingPageRedirect: boolean;
    message: string;
    error?: string;
  }> {
    try {
      if (!walletId || !userId || amount <= 0) {
        return {
          success: false,
          requiresBillingPageRedirect: false,
          message: 'Invalid parameters provided',
          error: 'walletId, userId, and amount (positive value) are required'
        };
      }

      const debitResult = await this.debitUserWallet(userId, amount, description);

      if (!debitResult.success) {
        if (debitResult.error === 'INSUFFICIENT_FUNDS') {
          const suspensionResult = await this.suspendUserAccount(userId);

          if (!suspensionResult.success) {
            return {
              success: false,
              requiresBillingPageRedirect: false,
              message: 'Failed to suspend user account',
              error: suspensionResult.error
            };
          }

          return {
            success: true,
            requiresBillingPageRedirect: true,
            message: 'Insufficient funds. Account suspended. User should be redirected to billing page to resolve.'
          };
        } else {
          return {
            success: false,
            requiresBillingPageRedirect: false,
            message: 'Failed to process billing operation',
            error: debitResult.error
          };
        }
      }

      return {
        success: true,
        requiresBillingPageRedirect: false,
        message: 'Billing operation completed successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        requiresBillingPageRedirect: false,
        message: 'Failed to process billing operation',
        error: error.message || 'Unknown error occurred while processing billing'
      };
    }
  }

  /**
   * Create a one-time billing entry
   */
  static async createOneTimeBilling(billingData: Omit<OneTimeBilling, 'type' | 'billingCycle'>): Promise<OneTimeBilling> {
    const billing = new OneTimeBillingModel({
      amount: billingData.amount,
      type: 'one-time',
      billingCycle: '',
      billTo: billingData.billTo,
      billingFor: billingData.billingFor,
      billingTitle: billingData.billingTitle
    });

    const saved = await billing.save();
    return saved.toJSON() as unknown as OneTimeBilling;
  }

  /**
   * Get a one-time billing entry by ID
   */
  static async getOneTimeBilling(id: string): Promise<OneTimeBilling | null> {
    const billing = await OneTimeBillingModel.findById(id);
    if (!billing) return null;
    return billing.toJSON() as unknown as OneTimeBilling;
  }

  /**
   * List one-time billing entries with optional filters
   */
  static async listOneTimeBillings(filters?: any): Promise<OneTimeBilling[]> {
    const query: any = {};
    if (filters?.billTo) query.billTo = filters.billTo;

    const billings = await OneTimeBillingModel.find(query).sort({ createdAt: -1 });
    return billings.map(b => b.toJSON() as unknown as OneTimeBilling);
  }

  /**
   * Process a one-time billing payment
   */
  static async processOneTimeBillingPayment(billingId: string): Promise<Payment> {
    const billing = await OneTimeBillingModel.findById(billingId);

    const payment = new PaymentModel({
      merchantId: billing?.billTo || '',
      amount: billing?.amount || 0,
      currency: 'USD',
      billingType: BillingType.ONE_TIME,
      method: 'card',
      status: 'pending'
    });

    const saved = await payment.save();
    return saved.toJSON() as unknown as Payment;
  }

  /**
   * Process a transfer operation and create a one-time billing entry
   */
  static async processTransfer(transferData: {
    amount: number;
    userId: string;
    description: string;
    title?: string;
  }): Promise<OneTimeBilling> {
    const billingData = {
      amount: transferData.amount,
      billTo: transferData.userId,
      billingFor: transferData.description || 'Transfer operation',
      billingTitle: transferData.title || 'Transfer'
    };

    return await this.createOneTimeBilling(billingData);
  }

  /**
   * Process a withdrawal operation and create a one-time billing entry
   */
  static async processWithdrawal(withdrawalData: {
    amount: number;
    userId: string;
    description: string;
    title?: string;
  }): Promise<OneTimeBilling> {
    const billingData = {
      amount: withdrawalData.amount,
      billTo: withdrawalData.userId,
      billingFor: withdrawalData.description || 'Withdrawal operation',
      billingTitle: withdrawalData.title || 'Withdrawal'
    };

    return await this.createOneTimeBilling(billingData);
  }

  /**
   * Process a payout operation and create a one-time billing entry
   */
  static async processPayout(payoutData: {
    amount: number;
    userId: string;
    description: string;
    title?: string;
  }): Promise<OneTimeBilling> {
    const billingData = {
      amount: payoutData.amount,
      billTo: payoutData.userId,
      billingFor: payoutData.description || 'Payout operation',
      billingTitle: payoutData.title || 'Payout'
    };

    return await this.createOneTimeBilling(billingData);
  }
}
