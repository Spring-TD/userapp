import mongoose from 'mongoose';
import { BillingType, Invoice, Payment, Subscription, Transaction, OneTimeBilling } from '../types/billingTypes';
import { InvoiceModel, PaymentModel, SubscriptionModel, TransactionModel } from '../models';
import { PricingService } from './pricingService';
import axios from 'axios';

function toPlainId(doc: mongoose.Document | null): unknown {
  if (!doc) return null;
  const { _id, ...rest } = doc.toObject();
  return { id: _id?.toString(), ...rest };
}

export class BillingService {
  static async createInvoice(invoiceData: Partial<Invoice>): Promise<Invoice> {
    const items = (invoiceData.items || []).map(item => ({
      id: item.id || `item_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total
    }));
    const doc = await InvoiceModel.create({
      merchantId: invoiceData.merchantId || '',
      customerId: invoiceData.customerId,
      amount: invoiceData.amount ?? 0,
      currency: invoiceData.currency || 'USD',
      items,
      billingType: invoiceData.billingType || BillingType.ONE_TIME,
      status: invoiceData.status || 'pending',
      dueDate: invoiceData.dueDate,
      issuedDate: invoiceData.issuedDate || new Date(),
      paidDate: invoiceData.paidDate,
      notes: invoiceData.notes
    });
    return toPlainId(doc) as Invoice;
  }

  static async getInvoice(id: string): Promise<Invoice | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await InvoiceModel.findById(id).lean();
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return { id: _id.toString(), ...rest } as Invoice;
  }

  static async listInvoices(filters?: { merchantId?: string; status?: string }): Promise<Invoice[]> {
    const query: Record<string, unknown> = {};
    if (filters?.merchantId) query.merchantId = filters.merchantId;
    if (filters?.status) query.status = filters.status;
    const docs = await InvoiceModel.find(query).sort({ createdAt: -1 }).lean();
    return docs.map(d => ({ id: (d as any)._id.toString(), ...d } as unknown as Invoice));
  }

  static async updateInvoice(id: string, updateData: Partial<Invoice>): Promise<Invoice | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await InvoiceModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    ).lean();
    if (!doc) return null;
    return { id: (doc as any)._id.toString(), ...doc } as unknown as Invoice;
  }

  static async deleteInvoice(id: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    const result = await InvoiceModel.findByIdAndDelete(id);
    return !!result;
  }

  static async processPayment(paymentData: Partial<Payment>): Promise<Payment> {
    const doc = await PaymentModel.create({
      invoiceId: paymentData.invoiceId,
      merchantId: paymentData.merchantId || '',
      customerId: paymentData.customerId,
      amount: paymentData.amount ?? 0,
      currency: paymentData.currency || 'USD',
      billingType: paymentData.billingType || BillingType.ONE_TIME,
      method: paymentData.method || 'card',
      status: paymentData.status || 'completed',
      transactionId: paymentData.transactionId,
      processedAt: paymentData.processedAt || new Date()
    });
    return toPlainId(doc) as Payment;
  }

  static async getPayment(id: string): Promise<Payment | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await PaymentModel.findById(id).lean();
    if (!doc) return null;
    return { id: (doc as any)._id.toString(), ...doc } as unknown as Payment;
  }

  static async listPayments(filters?: { merchantId?: string }): Promise<Payment[]> {
    const query: Record<string, unknown> = {};
    if (filters?.merchantId) query.merchantId = filters.merchantId;
    const docs = await PaymentModel.find(query).sort({ createdAt: -1 }).lean();
    return docs.map(d => ({ id: (d as any)._id.toString(), ...d } as unknown as Payment));
  }

  static async createSubscription(subscriptionData: Partial<Subscription>): Promise<Subscription> {
    const nextBillingDate = subscriptionData.nextBillingDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const doc = await SubscriptionModel.create({
      merchantId: subscriptionData.merchantId || '',
      customerId: subscriptionData.customerId || '',
      planId: subscriptionData.planId || '',
      amount: subscriptionData.amount ?? 0,
      currency: subscriptionData.currency || 'USD',
      billingType: subscriptionData.billingType || BillingType.RECURRING,
      interval: subscriptionData.interval || 'month',
      intervalCount: subscriptionData.intervalCount ?? 1,
      status: subscriptionData.status || 'active',
      startDate: subscriptionData.startDate || new Date(),
      nextBillingDate,
      endDate: subscriptionData.endDate,
      trialEnd: subscriptionData.trialEnd
    });
    return toPlainId(doc) as Subscription;
  }

  static async getSubscription(id: string): Promise<Subscription | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await SubscriptionModel.findById(id).lean();
    if (!doc) return null;
    return { id: (doc as any)._id.toString(), ...doc } as unknown as Subscription;
  }

  static async listSubscriptions(filters?: { merchantId?: string; customerId?: string }): Promise<Subscription[]> {
    const query: Record<string, unknown> = {};
    if (filters?.merchantId) query.merchantId = filters.merchantId;
    if (filters?.customerId) query.customerId = filters.customerId;
    const docs = await SubscriptionModel.find(query).sort({ createdAt: -1 }).lean();
    return docs.map(d => ({ id: (d as any)._id.toString(), ...d } as unknown as Subscription));
  }

  static async updateSubscription(id: string, updateData: Partial<Subscription>): Promise<Subscription | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await SubscriptionModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    ).lean();
    if (!doc) return null;
    return { id: (doc as any)._id.toString(), ...doc } as unknown as Subscription;
  }

  static async getTransaction(id: string): Promise<Transaction | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await TransactionModel.findById(id).lean();
    if (!doc) return null;
    return { id: (doc as any)._id.toString(), ...doc } as unknown as Transaction;
  }

  static async listTransactions(filters?: { merchantId?: string }): Promise<Transaction[]> {
    const query: Record<string, unknown> = {};
    if (filters?.merchantId) query.merchantId = filters.merchantId;
    const docs = await TransactionModel.find(query).sort({ createdAt: -1 }).lean();
    return docs.map(d => ({ id: (d as any)._id.toString(), ...d } as unknown as Transaction));
  }

  /**
   * Check if user has sufficient funds in their wallet
   * @param walletId - The ID of the user's wallet
   * @param amount - The amount to check
   * @returns Object with success status and wallet information or error message
   */
  static async checkWalletBalance(walletId: string, amount: number): Promise<{
    success: boolean;
    hasSufficientFunds: boolean;
    wallet?: any;
    error?: string;
  }> {
    try {
      const walletServiceUrl = process.env.WALLET_SERVICE_URL || 'http://localhost:3004';
      
      // Get wallet information
      const response = await axios.get(`${walletServiceUrl}/api/v1/wallets/${walletId}`, {
        timeout: 5000 // 5 second timeout
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
      // Handle different types of errors
      if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          hasSufficientFunds: false,
          error: 'Wallet service timeout - unable to check balance'
        };
      } else if (error.response) {
        // Server responded with error status
        return {
          success: false,
          hasSufficientFunds: false,
          error: `Wallet service error: ${error.response.status} - ${error.response.data?.error || 'Unknown error'}`
        };
      } else if (error.request) {
        // Request was made but no response received
        return {
          success: false,
          hasSufficientFunds: false,
          error: 'Unable to connect to wallet service'
        };
      } else {
        // Something else happened
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
   * @param userId - The ID of the user
   * @param amount - The amount to debit
   * @param description - Description of the debit
   * @returns Object with success status and transaction information or error message
   */
  static async debitUserWallet(userId: string, amount: number, description: string): Promise<{
    success: boolean;
    transaction?: any;
    error?: string;
  }> {
    try {
      const walletServiceUrl = process.env.WALLET_SERVICE_URL || 'http://localhost:3004';
      
      // Debit the user's wallet
      const response = await axios.post(`${walletServiceUrl}/api/v1/wallets/treasury/debit`, {
        userId,
        amount,
        description
      }, {
        timeout: 5000 // 5 second timeout
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
      // Handle different types of errors
      if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          error: 'Wallet service timeout - unable to debit wallet'
        };
      } else if (error.response) {
        // Server responded with error status
        if (error.response.status === 400 && error.response.data?.error?.includes('Insufficient balance')) {
          // Specific handling for insufficient funds
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
        // Request was made but no response received
        return {
          success: false,
          error: 'Unable to connect to wallet service'
        };
      } else {
        // Something else happened
        return {
          success: false,
          error: error.message || 'Unknown error occurred while debiting wallet'
        };
      }
    }
  }

  /**
   * Suspend user account due to insufficient funds
   * @param userId - The ID of the user to suspend
   * @returns Object with success status and result information
   */
  static async suspendUserAccount(userId: string): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    try {
      // In a real implementation, this would call the user service or account service
      // to suspend the user's account. For now, we'll log the action.
      console.log(`[BILLING SERVICE] Suspending account for user ${userId} due to insufficient funds`);
      
      // Simulate account suspension
      // This would typically involve:
      // 1. Updating user status in the database
      // 2. Notifying other services
      // 3. Logging the suspension
      
      // For demonstration, we'll just return success
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
   * @param walletId - The ID of the user's wallet
   * @param userId - The ID of the user
   * @param amount - The amount to bill
   * @param description - Description of the billing operation
   * @returns Object with success status and result information
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
      // Validate inputs
      if (!walletId || !userId || amount <= 0) {
        return {
          success: false,
          requiresBillingPageRedirect: false,
          message: 'Invalid parameters provided',
          error: 'walletId, userId, and amount (positive value) are required'
        };
      }
      
      // Attempt to debit the user's wallet
      const debitResult = await this.debitUserWallet(userId, amount, description);
      
      if (!debitResult.success) {
        // Check if it's an insufficient funds error
        if (debitResult.error === 'INSUFFICIENT_FUNDS') {
          // Insufficient funds - suspend account and indicate redirect to billing page
          const suspensionResult = await this.suspendUserAccount(userId);
          
          if (!suspensionResult.success) {
            return {
              success: false,
              requiresBillingPageRedirect: false,
              message: 'Failed to suspend user account',
              error: suspensionResult.error
            };
          }
          
          // Account suspended, user should be redirected to billing page
          return {
            success: true,
            requiresBillingPageRedirect: true,
            message: 'Insufficient funds. Account suspended. User should be redirected to billing page to resolve.'
          };
        } else {
          // Some other error occurred
          return {
            success: false,
            requiresBillingPageRedirect: false,
            message: 'Failed to process billing operation',
            error: debitResult.error
          };
        }
      }
      
      // Billing successful
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
   * @param billingData - The one-time billing data
   * @returns The created one-time billing object
   */
  static async createOneTimeBilling(billingData: Omit<OneTimeBilling, 'type' | 'billingCycle'>): Promise<OneTimeBilling> {
    // Implementation will be added later
    return {
      amount: billingData.amount,
      type: 'one-time', // Fixed value as per requirements
      billingCycle: '', // Empty string as per requirements
      billTo: billingData.billTo,
      billingFor: billingData.billingFor,
      billingTitle: billingData.billingTitle
    };
  }

  /**
   * Get a one-time billing entry by ID
   * @param id - The ID of the one-time billing entry
   * @returns The one-time billing object or null if not found
   */
  static async getOneTimeBilling(id: string): Promise<OneTimeBilling | null> {
    // Implementation will be added later
    // This is a placeholder implementation
    return null;
  }

  /**
   * List one-time billing entries with optional filters
   * @param filters - Optional filters for the query
   * @returns Array of one-time billing entries
   */
  static async listOneTimeBillings(filters?: any): Promise<OneTimeBilling[]> {
    // Implementation will be added later
    return [];
  }

  /**
   * Process a one-time billing payment
   * @param billingId - The ID of the one-time billing entry
   * @returns The processed payment object
   */
  static async processOneTimeBillingPayment(billingId: string): Promise<Payment> {
    // Implementation will be added later
    return {
      id: 'pay_' + Date.now(),
      merchantId: '',
      amount: 0,
      currency: 'USD',
      billingType: BillingType.ONE_TIME,
      method: 'card',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    } as Payment;
  }

  /**
   * Process a transfer operation and create a one-time billing entry
   * @param transferData - The transfer data including amount, user reference, and description
   * @returns The created one-time billing object
   */
  static async processTransfer(transferData: { 
    amount: number; 
    userId: string; 
    description: string;
    title?: string;
  }): Promise<OneTimeBilling> {
    // Create a one-time billing entry for the transfer
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
   * @param withdrawalData - The withdrawal data including amount, user reference, and description
   * @returns The created one-time billing object
   */
  static async processWithdrawal(withdrawalData: { 
    amount: number; 
    userId: string; 
    description: string;
    title?: string;
  }): Promise<OneTimeBilling> {
    // Create a one-time billing entry for the withdrawal
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
   * @param payoutData - The payout data including amount, user reference, and description
   * @returns The created one-time billing object
   */
  static async processPayout(payoutData: { 
    amount: number; 
    userId: string; 
    description: string;
    title?: string;
  }): Promise<OneTimeBilling> {
    // Create a one-time billing entry for the payout
    const billingData = {
      amount: payoutData.amount,
      billTo: payoutData.userId,
      billingFor: payoutData.description || 'Payout operation',
      billingTitle: payoutData.title || 'Payout'
    };
    
    return await this.createOneTimeBilling(billingData);
  }
}
