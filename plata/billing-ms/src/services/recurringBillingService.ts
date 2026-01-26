import { BillingService } from './billingService';
import { BillingType, RecurringBilling } from '../types/billingTypes';

export class RecurringBillingService {
  /**
   * Create a new recurring billing record
   */
  static async createRecurringBilling(billingData: Partial<RecurringBilling>): Promise<RecurringBilling> {
    const newBilling: RecurringBilling = {
      id: 'rb_' + Date.now(),
      amount: billingData.amount || 0,
      billingType: BillingType.RECURRING,
      billingCycle: billingData.billingCycle || 30, // Default to 30 days
      billingTarget: billingData.billingTarget,
      billingCount: billingData.billingCount || 0,
      billTo: billingData.billTo || '',
      billingFor: billingData.billingFor || '',
      billingTitle: billingData.billingTitle || '',
      billingException: billingData.billingException || {
        maxAttempts: 3, // Default to 3 attempts
        currentAttempts: 0
      },
      status: 'active',
      startDate: billingData.startDate || new Date(),
      nextBillingDate: billingData.nextBillingDate || new Date(),
      totalBilled: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // In a real implementation, this would be saved to a database
    console.log('Created new recurring billing:', newBilling);
    return newBilling;
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
   * In a real implementation, this would query the database
   */
  private static async getDueRecurringBillings(): Promise<RecurringBilling[]> {
    // Mock implementation - in reality, this would query the database
    // for recurring billings where:
    // - status = 'active'
    // - nextBillingDate <= today
    // - not completed or cancelled
    
    // For demonstration, we'll return mock recurring billings
    return [
      // Add mock recurring billings that would be due for processing
    ];
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
   * In a real implementation, this would update the database record
   */
  private static async updateRecurringBilling(id: string, updates: Partial<RecurringBilling>): Promise<void> {
    // Mock implementation - in reality, this would update the database
    console.log(`Updated recurring billing ${id} with:`, updates);
  }
  
  /**
   * Cancel a recurring billing
   */
  static async cancelRecurringBilling(id: string, reason?: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // In a real implementation, this would:
      // 1. Update billing status to 'cancelled'
      // 2. Set endDate to current date
      // 3. Cancel any scheduled billing
      
      console.log(`Cancelled recurring billing ${id} with reason: ${reason || 'No reason provided'}`);
      
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
      // In a real implementation, this would:
      // 1. Update billing status to 'paused'
      // 2. Pause any scheduled billing
      
      console.log(`Paused recurring billing ${id}`);
      
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
      // In a real implementation, this would:
      // 1. Update billing status to 'active'
      // 2. Calculate next billing date if needed
      // 3. Resume scheduled billing
      
      console.log(`Resumed recurring billing ${id}`);
      
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