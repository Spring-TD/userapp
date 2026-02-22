import { BillingService } from './billingService';
import { BillingType, RecurringBilling } from '../types/billingTypes';
import { RecurringBillingModel } from '../models/recurringBilling.mongo';

export class RecurringBillingService {
  /**
   * Create a new recurring billing record
   */
  static async createRecurringBilling(billingData: Partial<RecurringBilling>): Promise<RecurringBilling> {
    const newBilling = new RecurringBillingModel({
      amount: billingData.amount || 0,
      billingType: BillingType.RECURRING,
      billingCycle: billingData.billingCycle || 30,
      billingTarget: billingData.billingTarget,
      billingCount: billingData.billingCount || 0,
      billTo: billingData.billTo || '',
      billingFor: billingData.billingFor || '',
      billingTitle: billingData.billingTitle || '',
      billingException: billingData.billingException || {
        maxAttempts: 3,
        currentAttempts: 0
      },
      status: 'active',
      startDate: billingData.startDate || new Date(),
      nextBillingDate: billingData.nextBillingDate || new Date(),
      totalBilled: 0
    });

    const saved = await newBilling.save();
    console.log('Created new recurring billing:', saved.id);
    return saved.toJSON() as unknown as RecurringBilling;
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
      const dueBillings = await this.getDueRecurringBillings();

      let processedCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

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
    const dueBillings = await RecurringBillingModel.find({
      status: 'active',
      nextBillingDate: { $lte: now }
    });

    return dueBillings.map(b => b.toJSON() as unknown as RecurringBilling);
  }

  /**
   * Process a single recurring billing
   */
  private static async processRecurringBilling(billing: RecurringBilling): Promise<void> {
    try {
      // Check if billing target has been met
      if (billing.billingTarget && billing.totalBilled &&
        (billing.totalBilled + billing.amount) >= billing.billingTarget) {
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
        await this.handleFailedDebit(billing);
        return;
      }

      // Create invoice for this billing
      const invoiceData = {
        merchantId: billing.billTo,
        customerId: billing.billTo,
        amount: billing.amount,
        currency: 'USD',
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
          currentAttempts: 0
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

    if (updatedException.currentAttempts >= updatedException.maxAttempts) {
      await BillingService.suspendUserAccount(billing.billTo);

      await this.updateRecurringBilling(billing.id, {
        status: 'suspended',
        billingException: updatedException,
        updatedAt: new Date()
      } as Partial<RecurringBilling>);

      console.log(`User ${billing.billTo} suspended due to insufficient funds for billing ${billing.id}`);
    } else {
      await this.updateRecurringBilling(billing.id, {
        billingException: updatedException,
        nextBillingDate: this.calculateNextBillingDate(billing),
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

    if (updatedException.currentAttempts >= updatedException.maxAttempts) {
      await BillingService.suspendUserAccount(billing.billTo);

      await this.updateRecurringBilling(billing.id, {
        status: 'suspended',
        billingException: updatedException,
        updatedAt: new Date()
      } as Partial<RecurringBilling>);

      console.log(`User ${billing.billTo} suspended due to repeated failed debits for billing ${billing.id}`);
    } else {
      await this.updateRecurringBilling(billing.id, {
        billingException: updatedException,
        nextBillingDate: this.calculateNextBillingDate(billing),
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
    nextDate.setDate(nextDate.getDate() + billing.billingCycle);
    return nextDate;
  }

  /**
   * Update recurring billing record in MongoDB
   */
  private static async updateRecurringBilling(id: string, updates: Partial<RecurringBilling>): Promise<void> {
    await RecurringBillingModel.findByIdAndUpdate(id, { $set: updates });
    console.log(`Updated recurring billing ${id}`);
  }

  /**
   * Cancel a recurring billing
   */
  static async cancelRecurringBilling(id: string, reason?: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      await RecurringBillingModel.findByIdAndUpdate(id, {
        $set: {
          status: 'cancelled',
          endDate: new Date(),
          updatedAt: new Date()
        }
      });

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
      await RecurringBillingModel.findByIdAndUpdate(id, {
        $set: {
          status: 'paused',
          updatedAt: new Date()
        }
      });

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
      await RecurringBillingModel.findByIdAndUpdate(id, {
        $set: {
          status: 'active',
          updatedAt: new Date()
        }
      });

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