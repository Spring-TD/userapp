import { BillingType, OneTimeBilling } from '../types/billingTypes';
import { BillingService } from './billingService';
import { PricingScheduleModel } from '../models/pricingSchedule.mongo';
import axios from 'axios';

// Define trigger types
export type TriggerType = 'perProduct' | 'walletFunding' | 'merchantUsersCount' | 'generic';

export interface PerProductTrigger {
  type: 'perProduct';
}

export interface WalletFundingTrigger {
  type: 'walletFunding';
  walletTypes?: ('user' | 'merchant')[];
  minimumAmount?: number;
}

export interface MerchantUsersCountTrigger {
  type: 'merchantUsersCount';
  userCountThreshold: number;
  triggerPerUser?: boolean;
}

export interface GenericTrigger {
  type: 'generic';
}

export type PricingTrigger = PerProductTrigger | WalletFundingTrigger | MerchantUsersCountTrigger | GenericTrigger;

export interface BillingException {
  exceptionType: 'Counts';
  action: 'Suspend';
  maxExceptionCount: number;
  currentExceptionCount: number;
}

export interface PricingConditions {
  billingTarget?: number;
  maxOccurrences?: number;
  billToType: 'merchant' | 'user';
  billToIds?: string[];
  userGroup?: string;
  minimumBalance?: number;
  maximumBalance?: number;
  validDays?: number[];
  validHours?: { start: number; end: number };
  maxRetries?: number;
  retryInterval?: number;
  billingException?: BillingException;
}

export interface PricingSchedule {
  id: string;
  productId: string;
  amount: number;
  type: 'recurring';
  billingCycle: number;
  billingTarget?: number;
  billingCount: number;
  billToType: 'merchant' | 'user';
  billToIds?: string[];
  billingFor: string;
  billingTitle: string;
  billingException?: BillingException;
  description: string;
  startDate: Date;
  endDate?: Date;
  nextBillingDate: Date;
  status: 'active' | 'paused' | 'cancelled';
  conditions: PricingConditions;
  trigger: PricingTrigger;
  totalBilled: number;
  lastError?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePricingScheduleData {
  productId: string;
  amount: number;
  billingCycle: number;
  billingTarget?: number;
  billToType: 'merchant' | 'user';
  billToIds?: string[];
  billingFor: string;
  billingTitle: string;
  billingException?: BillingException;
  description: string;
  startDate: Date;
  endDate?: Date;
  trigger: PricingTrigger;
  conditions?: PricingConditions;
}

// Event data interfaces for triggers
export interface ProductCreatedEvent {
  productId: string;
  productName: string;
  merchantId: string;
  createdAt: Date;
}

export interface WalletFundingEvent {
  walletId: string;
  userId?: string;
  merchantId?: string;
  amount: number;
  fundingMethod: string;
  transactionId: string;
  createdAt: Date;
}

export interface MerchantUsersCountEvent {
  merchantId: string;
  currentUsersCount: number;
  newUserId: string;
  createdAt: Date;
}

export class PricingService {
  /**
   * Create a new pricing schedule
   */
  static async createPricingSchedule(scheduleData: CreatePricingScheduleData): Promise<PricingSchedule> {
    const nextBillingDate = this.calculateNextBillingDate(
      scheduleData.startDate,
      'day',
      scheduleData.billingCycle
    );

    const conditions: PricingConditions = {
      billToType: scheduleData.billToType,
      billToIds: scheduleData.billToIds,
      billingTarget: scheduleData.billingTarget,
      ...scheduleData.conditions
    };

    const scheduleDoc = new PricingScheduleModel({
      productId: scheduleData.productId,
      amount: scheduleData.amount,
      type: 'recurring',
      billingCycle: scheduleData.billingCycle,
      billingTarget: scheduleData.billingTarget,
      billingCount: 1,
      billToType: scheduleData.billToType,
      billToIds: scheduleData.billToIds,
      billingFor: scheduleData.billingFor,
      billingTitle: scheduleData.billingTitle,
      billingException: scheduleData.billingException,
      description: scheduleData.description,
      startDate: scheduleData.startDate,
      endDate: scheduleData.endDate,
      nextBillingDate,
      status: 'active',
      conditions,
      trigger: scheduleData.trigger,
      totalBilled: 0,
      retryCount: 0
    });

    const saved = await scheduleDoc.save();

    console.log(`[PRICING SERVICE] Created pricing schedule ${saved.id} for product ${scheduleData.productId}`);

    return saved.toJSON() as unknown as PricingSchedule;
  }

  /**
   * Handle product created event
   */
  static async handleProductCreatedEvent(event: ProductCreatedEvent): Promise<void> {
    console.log(`[PRICING SERVICE] Handling product created event for product ${event.productId}`);

    // Find all active per product triggers from MongoDB
    const perProductSchedules = await PricingScheduleModel.find({
      'trigger.type': 'perProduct',
      status: 'active'
    });

    for (const scheduleDoc of perProductSchedules) {
      const schedule = scheduleDoc.toJSON() as unknown as PricingSchedule;
      try {
        await this.processTriggeredBilling(schedule, {
          entityId: event.productId,
          entityType: 'product',
          merchantId: event.merchantId
        });
      } catch (error) {
        console.error(`[PRICING SERVICE] Error processing product created trigger for schedule ${schedule.id}:`, error);
        if (schedule.billingException) {
          await this.handleBillingException(schedule, error as Error);
        }
      }
    }
  }

  /**
   * Handle wallet funding event
   */
  static async handleWalletFundingEvent(event: WalletFundingEvent): Promise<void> {
    console.log(`[PRICING SERVICE] Handling wallet funding event for wallet ${event.walletId}`);

    const walletFundingSchedules = await PricingScheduleModel.find({
      'trigger.type': 'walletFunding',
      status: 'active'
    });

    const matchingSchedules = walletFundingSchedules.filter(scheduleDoc => {
      const trigger = scheduleDoc.trigger as unknown as WalletFundingTrigger;

      if (trigger.minimumAmount && event.amount < trigger.minimumAmount) {
        return false;
      }

      if (trigger.walletTypes && trigger.walletTypes.length > 0) {
        const walletType = event.userId ? 'user' : 'merchant';
        return trigger.walletTypes.includes(walletType as 'user' | 'merchant');
      }

      return true;
    });

    for (const scheduleDoc of matchingSchedules) {
      const schedule = scheduleDoc.toJSON() as unknown as PricingSchedule;
      try {
        await this.processTriggeredBilling(schedule, {
          entityId: event.walletId,
          entityType: 'wallet',
          userId: event.userId,
          merchantId: event.merchantId,
          amount: event.amount
        });
      } catch (error) {
        console.error(`[PRICING SERVICE] Error processing wallet funding trigger for schedule ${schedule.id}:`, error);
        if (schedule.billingException) {
          await this.handleBillingException(schedule, error as Error);
        }
      }
    }
  }

  /**
   * Handle merchant users count event
   */
  static async handleMerchantUsersCountEvent(event: MerchantUsersCountEvent): Promise<void> {
    console.log(`[PRICING SERVICE] Handling merchant users count event for merchant ${event.merchantId}`);

    const merchantUsersSchedules = await PricingScheduleModel.find({
      'trigger.type': 'merchantUsersCount',
      status: 'active'
    });

    const matchingSchedules = merchantUsersSchedules.filter(scheduleDoc => {
      const trigger = scheduleDoc.trigger as unknown as MerchantUsersCountTrigger;

      if (event.currentUsersCount >= trigger.userCountThreshold) {
        if (trigger.triggerPerUser) {
          return true;
        } else {
          return event.currentUsersCount === trigger.userCountThreshold;
        }
      }

      return false;
    });

    for (const scheduleDoc of matchingSchedules) {
      const schedule = scheduleDoc.toJSON() as unknown as PricingSchedule;
      try {
        await this.processTriggeredBilling(schedule, {
          entityId: event.merchantId,
          entityType: 'merchant',
          userId: event.newUserId,
          userCount: event.currentUsersCount
        });
      } catch (error) {
        console.error(`[PRICING SERVICE] Error processing merchant users count trigger for schedule ${schedule.id}:`, error);
        if (schedule.billingException) {
          await this.handleBillingException(schedule, error as Error);
        }
      }
    }
  }

  /**
   * Process triggered billing for a schedule
   */
  private static async processTriggeredBilling(
    schedule: PricingSchedule,
    context: {
      entityId: string;
      entityType: string;
      userId?: string;
      merchantId?: string;
      amount?: number;
      userCount?: number;
    }
  ): Promise<void> {
    const conditionCheck = await this.checkPricingConditions(schedule);
    if (!conditionCheck.canBill) {
      console.log(`[PRICING SERVICE] Skipping triggered billing for schedule ${schedule.id}: ${conditionCheck.reason}`);

      if (conditionCheck.reason?.includes('target') || conditionCheck.reason?.includes('occurrences')) {
        await this.cancelPricingSchedule(schedule.id);
      }

      return;
    }

    let billToId = context.merchantId || context.userId;
    if (!billToId && schedule.billToIds && schedule.billToIds.length > 0) {
      billToId = schedule.billToIds[0];
    }
    if (!billToId) {
      billToId = schedule.productId;
    }

    const billingData = {
      amount: schedule.amount,
      billTo: billToId,
      billingFor: `${schedule.billingFor} - Triggered for ${context.entityType} ${context.entityId}`,
      billingTitle: `${schedule.billingTitle} - ${context.entityType} Trigger`
    };

    const billingEntry = await BillingService.createOneTimeBilling(billingData);

    const executionResult = await this.executeBillingOnWalletLedger(billingEntry);

    if (!executionResult.success) {
      throw new Error(executionResult.error || 'Failed to execute billing on wallet ledger');
    }

    // Update billing statistics in MongoDB
    await PricingScheduleModel.findByIdAndUpdate(schedule.id, {
      $inc: {
        billingCount: 1,
        totalBilled: schedule.amount
      }
    });

    console.log(`[PRICING SERVICE] Processed triggered billing for schedule ${schedule.id}, created billing ${billingEntry.billingTitle}`);
  }

  /**
   * Get a pricing schedule by ID
   */
  static async getPricingSchedule(id: string): Promise<PricingSchedule | null> {
    const schedule = await PricingScheduleModel.findById(id);
    if (!schedule) return null;
    return schedule.toJSON() as unknown as PricingSchedule;
  }

  /**
   * List all pricing schedules
   */
  static async listPricingSchedules(): Promise<PricingSchedule[]> {
    const schedules = await PricingScheduleModel.find().sort({ createdAt: -1 });
    return schedules.map(s => s.toJSON() as unknown as PricingSchedule);
  }

  /**
   * Update a pricing schedule
   */
  static async updatePricingSchedule(
    id: string,
    updateData: Partial<Omit<PricingSchedule, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<PricingSchedule | null> {
    const updatedSchedule = await PricingScheduleModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!updatedSchedule) return null;
    return updatedSchedule.toJSON() as unknown as PricingSchedule;
  }

  /**
   * Cancel a pricing schedule
   */
  static async cancelPricingSchedule(id: string): Promise<boolean> {
    const result = await PricingScheduleModel.findByIdAndUpdate(id, {
      $set: { status: 'cancelled' }
    });

    if (!result) return false;

    console.log(`[PRICING SERVICE] Cancelled pricing schedule ${id}`);
    return true;
  }

  /**
   * Pause a pricing schedule
   */
  static async pausePricingSchedule(id: string): Promise<boolean> {
    const result = await PricingScheduleModel.findByIdAndUpdate(id, {
      $set: { status: 'paused' }
    });

    if (!result) return false;

    console.log(`[PRICING SERVICE] Paused pricing schedule ${id}`);
    return true;
  }

  /**
   * Resume a pricing schedule
   */
  static async resumePricingSchedule(id: string): Promise<boolean> {
    const result = await PricingScheduleModel.findByIdAndUpdate(id, {
      $set: { status: 'active' }
    });

    if (!result) return false;

    console.log(`[PRICING SERVICE] Resumed pricing schedule ${id}`);
    return true;
  }

  /**
   * Check if a pricing schedule meets all conditions
   */
  static async checkPricingConditions(schedule: PricingSchedule): Promise<{
    canBill: boolean;
    reason?: string;
  }> {
    if (schedule.status !== 'active') {
      return {
        canBill: false,
        reason: `Schedule is ${schedule.status}`
      };
    }

    if (schedule.billingTarget && schedule.totalBilled >= schedule.billingTarget) {
      return {
        canBill: false,
        reason: `Billing target of ${schedule.billingTarget} reached`
      };
    }

    if (schedule.conditions.maxOccurrences && schedule.billingCount > schedule.conditions.maxOccurrences) {
      return {
        canBill: false,
        reason: `Maximum occurrences of ${schedule.conditions.maxOccurrences} reached`
      };
    }

    const now = new Date();
    const dayOfWeek = now.getDay();
    const hourOfDay = now.getHours();

    if (schedule.conditions.validDays && !schedule.conditions.validDays.includes(dayOfWeek)) {
      return {
        canBill: false,
        reason: `Not a valid day for billing`
      };
    }

    if (schedule.conditions.validHours) {
      const { start, end } = schedule.conditions.validHours;
      if (hourOfDay < start || hourOfDay >= end) {
        return {
          canBill: false,
          reason: `Not a valid hour for billing`
        };
      }
    }

    if (schedule.billToIds && schedule.billToIds.length > 0) {
      const userId = schedule.billToIds[0];
      if (userId) {
        const walletCheck = await this.checkWalletConditions(userId, schedule);
        if (!walletCheck.canBill) {
          return walletCheck;
        }
      }
    }

    return {
      canBill: true
    };
  }

  /**
   * Handle billing exceptions
   */
  static async handleBillingException(schedule: PricingSchedule, error: Error): Promise<boolean> {
    if (!schedule.billingException) {
      return false;
    }

    const newExceptionCount = schedule.billingException.currentExceptionCount + 1;

    if (newExceptionCount >= schedule.billingException.maxExceptionCount) {
      switch (schedule.billingException.action) {
        case 'Suspend':
          if (schedule.billToIds && schedule.billToIds.length > 0) {
            for (const id of schedule.billToIds) {
              await this.suspendAccount(schedule.billToType, id);
            }
          }
          await this.cancelPricingSchedule(schedule.id);
          break;
      }
    }

    // Update exception count in MongoDB
    await PricingScheduleModel.findByIdAndUpdate(schedule.id, {
      $set: {
        'billingException.currentExceptionCount': newExceptionCount
      }
    });

    return true;
  }

  /**
   * Suspend a user or merchant account
   */
  private static async suspendAccount(type: 'user' | 'merchant', id: string): Promise<void> {
    console.log(`[PRICING SERVICE] Suspending ${type} account ${id} due to billing exceptions`);
  }

  /**
   * Check wallet-related conditions
   */
  private static async checkWalletConditions(
    userId: string,
    schedule: PricingSchedule
  ): Promise<{
    canBill: boolean;
    reason?: string;
  }> {
    try {
      return {
        canBill: true
      };
    } catch (error) {
      return {
        canBill: false,
        reason: 'Error checking wallet conditions'
      };
    }
  }

  /**
   * Process due pricing schedules
   */
  static async processDuePricingSchedules(): Promise<{
    success: boolean;
    processedCount: number;
    failedCount: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let processedCount = 0;
    let failedCount = 0;

    try {
      const now = new Date();

      // Query MongoDB for active schedules that are due
      const dueScheduleDocs = await PricingScheduleModel.find({
        status: 'active',
        nextBillingDate: { $lte: now },
        $or: [
          { endDate: { $exists: false } },
          { endDate: null },
          { endDate: { $gte: now } }
        ]
      });

      const dueSchedules = dueScheduleDocs.map(s => s.toJSON() as unknown as PricingSchedule);

      console.log(`[PRICING SERVICE] Processing ${dueSchedules.length} due pricing schedules`);

      for (const schedule of dueSchedules) {
        try {
          const conditionCheck = await this.checkPricingConditions(schedule);
          if (!conditionCheck.canBill) {
            console.log(`[PRICING SERVICE] Skipping schedule ${schedule.id}: ${conditionCheck.reason}`);

            if (conditionCheck.reason?.includes('target') || conditionCheck.reason?.includes('occurrences')) {
              await this.cancelPricingSchedule(schedule.id);
            }

            continue;
          }

          const billToId = (schedule.billToIds && schedule.billToIds.length > 0)
            ? schedule.billToIds[0]
            : schedule.productId;

          const billingData = {
            amount: schedule.amount,
            billTo: billToId,
            billingFor: schedule.billingFor,
            billingTitle: schedule.billingTitle
          };

          const billingEntry = await BillingService.createOneTimeBilling(billingData);

          const executionResult = await this.executeBillingOnWalletLedger(billingEntry);

          if (!executionResult.success) {
            throw new Error(executionResult.error || 'Failed to execute billing on wallet ledger');
          }

          // Calculate next billing date
          const nextBillingDate = this.calculateNextBillingDate(
            schedule.nextBillingDate,
            'day',
            schedule.billingCycle
          );

          // Update the schedule in MongoDB
          await PricingScheduleModel.findByIdAndUpdate(schedule.id, {
            $inc: {
              billingCount: 1,
              totalBilled: schedule.amount
            },
            $set: {
              nextBillingDate,
              lastError: undefined,
              retryCount: 0
            }
          });

          processedCount++;
          console.log(`[PRICING SERVICE] Processed pricing schedule ${schedule.id}, created billing ${billingEntry.billingTitle}`);
        } catch (error) {
          failedCount++;
          const errorMessage = `Failed to process pricing schedule ${schedule.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMessage);
          console.error(`[PRICING SERVICE] ${errorMessage}`);

          // Handle billing exceptions
          if (schedule.billingException) {
            await this.handleBillingException(schedule, error as Error);
          }

          // Update error information in MongoDB
          const maxRetries = schedule.conditions.maxRetries || 0;
          const newRetryCount = schedule.retryCount + 1;

          await PricingScheduleModel.findByIdAndUpdate(schedule.id, {
            $set: {
              lastError: error instanceof Error ? error.message : 'Unknown error',
              retryCount: newRetryCount
            }
          });

          if (newRetryCount < maxRetries) {
            const retryInterval = (schedule.conditions.retryInterval || 5) * 60 * 1000;
            setTimeout(async () => {
              console.log(`[PRICING SERVICE] Retrying schedule ${schedule.id}`);
            }, retryInterval);
          }
        }
      }

      return {
        success: true,
        processedCount,
        failedCount,
        errors
      };
    } catch (error) {
      const errorMessage = `Error processing due pricing schedules: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMessage);
      console.error(`[PRICING SERVICE] ${errorMessage}`);

      return {
        success: false,
        processedCount: 0,
        failedCount: 0,
        errors
      };
    }
  }

  /**
   * Calculate the next billing date based on interval and count
   */
  private static calculateNextBillingDate(
    startDate: Date,
    interval: 'day' | 'week' | 'month' | 'year',
    intervalCount: number
  ): Date {
    const nextDate = new Date(startDate);

    switch (interval) {
      case 'day':
        nextDate.setDate(nextDate.getDate() + intervalCount);
        break;
      case 'week':
        nextDate.setDate(nextDate.getDate() + (intervalCount * 7));
        break;
      case 'month':
        nextDate.setMonth(nextDate.getMonth() + intervalCount);
        break;
      case 'year':
        nextDate.setFullYear(nextDate.getFullYear() + intervalCount);
        break;
    }

    return nextDate;
  }

  /**
   * Execute billing on wallet's billing ledger
   */
  static async executeBillingOnWalletLedger(billingEntry: OneTimeBilling): Promise<{
    success: boolean;
    transaction?: any;
    error?: string;
  }> {
    try {
      const walletServiceUrl = process.env.WALLET_SERVICE_URL || 'http://localhost:3004';

      const response = await axios.post(`${walletServiceUrl}/api/v1/billing-ledger/execute`, {
        userId: billingEntry.billTo,
        amount: billingEntry.amount,
        description: billingEntry.billingFor,
        billingTitle: billingEntry.billingTitle
      }, {
        timeout: 5000
      });

      if (response.status === 200 && response.data.success) {
        return {
          success: true,
          transaction: response.data.transaction
        };
      } else {
        return {
          success: false,
          error: response.data.error || 'Failed to execute billing on wallet ledger'
        };
      }
    } catch (error: any) {
      if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          error: 'Wallet service timeout - unable to execute billing'
        };
      } else if (error.response) {
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
          error: error.message || 'Unknown error occurred while executing billing on wallet ledger'
        };
      }
    }
  }
}