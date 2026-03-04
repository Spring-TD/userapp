import mongoose from 'mongoose';
import { BillingService } from './billingService';
import { BillingType, RecurringBilling } from '../types/billingTypes';
import { RecurringBillingModel } from '../models';

function toPlainRecurring(doc: { _id: mongoose.Types.ObjectId; toObject: () => Record<string, unknown> } | null): RecurringBilling | null {
  if (!doc) return null;
  const obj = doc.toObject() as Record<string, unknown> & { _id: mongoose.Types.ObjectId };
  const { _id, ...rest } = obj;
  return { id: _id.toString(), ...rest } as RecurringBilling;
}

export class RecurringBillingService {
  /**
   * Create a new recurring billing record
   */
  static async createRecurringBilling(billingData: Partial<RecurringBilling>): Promise<RecurringBilling> {
    const nextBillingDate = billingData.nextBillingDate || billingData.startDate || new Date();
    const doc = await RecurringBillingModel.create({
      amount: billingData.amount ?? 0,
      billingType: BillingType.RECURRING,
      billingCycle: billingData.billingCycle ?? 30,
      billingTarget: billingData.billingTarget,
      billingCount: billingData.billingCount ?? 0,
      billTo: billingData.billTo || '',
      billingFor: billingData.billingFor || '',
      billingTitle: billingData.billingTitle || '',
      billingException: billingData.billingException ?? { maxAttempts: 3, currentAttempts: 0 },
      status: 'active',
      startDate: billingData.startDate || new Date(),
      nextBillingDate,
      totalBilled: 0
    });
    return toPlainRecurring(doc) as RecurringBilling;
  }

  static async getRecurringBilling(id: string): Promise<RecurringBilling | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await RecurringBillingModel.findById(id).lean();
    if (!doc) return null;
    return { id: (doc as any)._id.toString(), ...doc } as unknown as RecurringBilling;
  }

  static async listRecurringBillings(filters?: { billTo?: string; status?: string }): Promise<RecurringBilling[]> {
    const query: Record<string, unknown> = {};
    if (filters?.billTo) query.billTo = filters.billTo;
    if (filters?.status) query.status = filters.status;
    const docs = await RecurringBillingModel.find(query).sort({ createdAt: -1 }).lean();
    return docs.map(d => ({ id: (d as any)._id.toString(), ...d } as unknown as RecurringBilling));
  }

  static async updateRecurringBillingPublic(id: string, updateData: Partial<RecurringBilling>): Promise<RecurringBilling | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await RecurringBillingModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    ).lean();
    if (!doc) return null;
    return { id: (doc as any)._id.toString(), ...doc } as unknown as RecurringBilling;
  }

  /**
   * Process all recurring billing records that are due
   */
  static async processDueRecurringBillings(): Promise<{
    success: boolean;
    processedCount: number;
    failedCount: number;
    errors: string[];
  }> {
    try {
      // In a real implementation, we would query the database for recurring billings
      // that are due for processing (nextBillingDate <= today and status = 'active')
      // For now, we'll simulate this with mock data
      const dueBillings: RecurringBilling[] = await this.getDueRecurringBillings();
      
      let processedCount = 0;
      let failedCount = 0;
      const errors: string[] = [];
      
      // Process each recurring billing
      for (const billing of dueBillings) {
        try {
          await this.processRecurringBilling(billing);
          processedCount++;
        } catch (error) {
          failedCount++;
          errors.push(`Failed to process recurring billing ${billing.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      return {
        success: true,
        processedCount,
        failedCount,
        errors
      };
    } catch (error) {
      return {
        success: false,
        processedCount: 0,
        failedCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
  
  /**
   * Get recurring billings that are due for processing
   */
  private static async getDueRecurringBillings(): Promise<RecurringBilling[]> {
    const now = new Date();
    const docs = await RecurringBillingModel.find({
      status: 'active',
      nextBillingDate: { $lte: now }
    }).lean();
    return docs.map(d => ({ id: (d as any)._id.toString(), ...d } as unknown as RecurringBilling));
  }
  
  /**
   * Process a single recurring billing
   */
  private static async processRecurringBilling(billing: RecurringBilling): Promise<void> {
    try {
      // Check if billing target has been met
      if (billing.billingTarget && billing.totalBilled && 
          (billing.totalBilled + billing.amount) >= billing.billingTarget) {
        // Mark as completed since target is met
        await this.updateRecurringBilling(billing.id, {
          status: 'completed',
          endDate: new Date()
        } as Partial<RecurringBilling>);
        console.log(`Recurring billing ${billing.id} completed - target met`);
        return;
      }
      
      // Check if user has sufficient funds
      const walletCheck = await BillingService.checkWalletBalance(billing.billTo, billing.amount);
      
      if (!walletCheck.success || !walletCheck.hasSufficientFunds) {
        // Handle insufficient funds
        await this.handleInsufficientFunds(billing);
        return;
      }
      
      // Process the billing
      const debitResult = await BillingService.debitUserWallet(
        billing.billTo, 
        billing.amount, 
        billing.billingFor
      );
      
      if (!debitResult.success) {
        // Handle failed debit
        await this.handleFailedDebit(billing);
        return;
      }
      
      // Create invoice for this billing
      const invoiceData = {
        merchantId: billing.billTo, // Using billTo as merchantId for simplicity
        customerId: billing.billTo,
        amount: billing.amount,
        currency: 'USD', // Default currency
        billingType: BillingType.RECURRING,
        items: [
          {
            id: `item_${Date.now()}`,
            description: billing.billingFor,
            quantity: 1,
            unitPrice: billing.amount,
            total: billing.amount
          }
        ],
        status: 'paid' as const,
        issuedDate: new Date(),
        paidDate: new Date()
      };
      
      const invoice = await BillingService.createInvoice(invoiceData);
      console.log(`Created invoice ${invoice.id} for recurring billing ${billing.id}`);
      
      // Update billing record
      const updatedBilling: Partial<RecurringBilling> = {
        billingCount: billing.billingCount + 1,
        totalBilled: (billing.totalBilled || 0) + billing.amount,
        nextBillingDate: this.calculateNextBillingDate(billing),
        billingException: {
          maxAttempts: billing.billingException?.maxAttempts || 3,
          currentAttempts: 0 // Reset failed attempts counter
        },
        updatedAt: new Date()
      };
      
      // Check if target is now met
      if (billing.billingTarget && (updatedBilling.totalBilled || 0) >= billing.billingTarget) {
        updatedBilling.status = 'completed';
        updatedBilling.endDate = new Date();
      }
      
      await this.updateRecurringBilling(billing.id, updatedBilling);
      
      console.log(`Processed recurring billing ${billing.id} successfully`);
    } catch (error) {
      throw new Error(`Failed to process recurring billing ${billing.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Handle insufficient funds scenario
   */
  private static async handleInsufficientFunds(billing: RecurringBilling): Promise<void> {
    const updatedException = {
      maxAttempts: billing.billingException?.maxAttempts || 3,
      currentAttempts: (billing.billingException?.currentAttempts || 0) + 1
    };
    
    // Check if we've reached the maximum attempts
    if (updatedException.currentAttempts >= updatedException.maxAttempts) {
      // Suspend the user account
      await BillingService.suspendUserAccount(billing.billTo);
      
      // Update billing status to suspended
      await this.updateRecurringBilling(billing.id, {
        status: 'suspended',
        billingException: updatedException,
        updatedAt: new Date()
      } as Partial<RecurringBilling>);
      
      console.log(`User ${billing.billTo} suspended due to insufficient funds for billing ${billing.id}`);
    } else {
      // Just update the attempt count
      await this.updateRecurringBilling(billing.id, {
        billingException: updatedException,
        nextBillingDate: this.calculateNextBillingDate(billing), // Try again next cycle
        updatedAt: new Date()
      } as Partial<RecurringBilling>);
      
      console.log(`Insufficient funds for billing ${billing.id}, attempt ${updatedException.currentAttempts}`);
    }
  }
  
  /**
   * Handle failed debit scenario
   */
  private static async handleFailedDebit(billing: RecurringBilling): Promise<void> {
    const updatedException = {
      maxAttempts: billing.billingException?.maxAttempts || 3,
      currentAttempts: (billing.billingException?.currentAttempts || 0) + 1
    };
    
    // Check if we've reached the maximum attempts
    if (updatedException.currentAttempts >= updatedException.maxAttempts) {
      // Suspend the user account
      await BillingService.suspendUserAccount(billing.billTo);
      
      // Update billing status to suspended
      await this.updateRecurringBilling(billing.id, {
        status: 'suspended',
        billingException: updatedException,
        updatedAt: new Date()
      } as Partial<RecurringBilling>);
      
      console.log(`User ${billing.billTo} suspended due to repeated failed debits for billing ${billing.id}`);
    } else {
      // Just update the attempt count
      await this.updateRecurringBilling(billing.id, {
        billingException: updatedException,
        nextBillingDate: this.calculateNextBillingDate(billing), // Try again next cycle
        updatedAt: new Date()
      } as Partial<RecurringBilling>);
      
      console.log(`Failed debit for billing ${billing.id}, attempt ${updatedException.currentAttempts}`);
    }
  }
  
  /**
   * Calculate the next billing date
   */
  private static calculateNextBillingDate(billing: RecurringBilling): Date {
    const nextDate = new Date(billing.nextBillingDate || billing.startDate);
    // Add the billing cycle (in days) to the current next billing date
    nextDate.setDate(nextDate.getDate() + billing.billingCycle);
    return nextDate;
  }
  
  /**
   * Update recurring billing record
   */
  private static async updateRecurringBilling(id: string, updates: Partial<RecurringBilling>): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) return;
    await RecurringBillingModel.findByIdAndUpdate(id, { $set: updates });
  }
  
  /**
   * Cancel a recurring billing
   */
  static async cancelRecurringBilling(id: string, _reason?: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return { success: false, message: 'Invalid recurring billing id' };
      }
      await RecurringBillingModel.findByIdAndUpdate(id, {
        $set: { status: 'cancelled', endDate: new Date() }
      });
      return {
        success: true,
        message: `Recurring billing ${id} cancelled successfully`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to cancel recurring billing ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Pause a recurring billing
   */
  static async pauseRecurringBilling(id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return { success: false, message: 'Invalid recurring billing id' };
      }
      await RecurringBillingModel.findByIdAndUpdate(id, { $set: { status: 'paused' } });
      return {
        success: true,
        message: `Recurring billing ${id} paused successfully`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to pause recurring billing ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Resume a recurring billing
   */
  static async resumeRecurringBilling(id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return { success: false, message: 'Invalid recurring billing id' };
      }
      await RecurringBillingModel.findByIdAndUpdate(id, { $set: { status: 'active' } });
      return {
        success: true,
        message: `Recurring billing ${id} resumed successfully`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to resume recurring billing ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}