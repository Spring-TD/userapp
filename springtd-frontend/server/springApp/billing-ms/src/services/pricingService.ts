import { BillingType, OneTimeBilling } from '../types/billingTypes';
import { BillingService } from './billingService';
import axios from 'axios';

// Define trigger types
export type TriggerType = 'perProduct' | 'walletFunding' | 'merchantUsersCount' | 'generic';

export interface PerProductTrigger {
  type: 'perProduct';
  // Additional configuration for per product trigger if needed
}

export interface WalletFundingTrigger {
  type: 'walletFunding';
  // Can specify which wallet types to monitor (user, merchant, both)
  walletTypes?: ('user' | 'merchant')[];
  // Minimum funding amount to trigger billing
  minimumAmount?: number;
}

export interface MerchantUsersCountTrigger {
  type: 'merchantUsersCount';
  // The user count threshold that triggers billing
  userCountThreshold: number;
  // Whether to trigger for each user or only when threshold is reached
  triggerPerUser?: boolean;
}

export interface GenericTrigger {
  type: 'generic';
  // No specific configuration needed for generic trigger
}

export type PricingTrigger = PerProductTrigger | WalletFundingTrigger | MerchantUsersCountTrigger | GenericTrigger;

export interface BillingException {
  // Exception type: Counts (track exception occurrences)
  exceptionType: 'Counts';
  // Action: Suspend user/merchant when the specified exception count threshold is met
  action: 'Suspend';
  // Maximum exception count before taking action
  maxExceptionCount: number;
  // Current exception count
  currentExceptionCount: number;
}

export interface PricingConditions {
  // Target-based conditions
  billingTarget?: number; // Stop billing when this target amount is reached
  maxOccurrences?: number; // Maximum number of times this billing can occur
  
  // User/merchant conditions
  billToType: 'merchant' | 'user'; // Specify whether billing applies to merchants or users
  billToIds?: string[]; // Specific merchant/user IDs to bill
  userGroup?: string; // Group of users to bill
  
  // Wallet conditions
  minimumBalance?: number; // Minimum wallet balance required
  maximumBalance?: number; // Maximum wallet balance allowed
  
  // Time-based conditions
  validDays?: number[]; // Days of week when billing is valid (0-6, Sunday-Saturday)
  validHours?: { start: number; end: number }; // Hours when billing is valid (0-23)
  
  // Retry conditions
  maxRetries?: number; // Maximum retry attempts on failure
  retryInterval?: number; // Interval between retries in minutes
  
  // Exception handling
  billingException?: BillingException;
}

export interface PricingSchedule {
  id: string;
  productId: string;
  amount: number;
  type: 'recurring'; // Type: recurring (string literal)
  billingCycle: number; // Billing cycle: 30 days (or configurable interval)
  billingTarget?: number; // Billing_target: a numeric target amount
  billingCount: number; // Billing_count: starting at 1 and incrementing with each billing occurrence
  billToType: 'merchant' | 'user'; // Bill_to: specify whether billing applies to merchants or users
  billToIds?: string[]; // Specific merchant/user IDs to bill
  billingFor: string; // billing_for: a description field explaining what the billing is for
  billingTitle: string; // Billing_title: a name/title for this billing entry
  billingException?: BillingException; // Billing_Exception
  description: string;
  startDate: Date;
  endDate?: Date;
  nextBillingDate: Date;
  status: 'active' | 'paused' | 'cancelled';
  conditions: PricingConditions;
  // Trigger configuration
  trigger: PricingTrigger;
  totalBilled: number; // Track total amount billed
  lastError?: string; // Last error message if any
  retryCount: number; // Current retry count
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePricingScheduleData {
  productId: string;
  amount: number;
  billingCycle: number; // Billing cycle: 30 days (or configurable interval)
  billingTarget?: number; // Billing_target: a numeric target amount
  billToType: 'merchant' | 'user'; // Bill_to: specify whether billing applies to merchants or users
  billToIds?: string[]; // Specific merchant/user IDs to bill
  billingFor: string; // billing_for: a description field explaining what the billing is for
  billingTitle: string; // Billing_title: a name/title for this billing entry
  billingException?: BillingException; // Billing_Exception
  description: string;
  startDate: Date;
  endDate?: Date;
  // Trigger configuration
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
  fundingMethod: string; // card, bank_transfer, etc.
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
  private static schedules: Map<string, PricingSchedule> = new Map();
  // Store event triggers for efficient lookup
  private static productTriggers: Map<string, PricingSchedule[]> = new Map();
  private static walletFundingTriggers: Map<string, PricingSchedule[]> = new Map();
  private static merchantUsersTriggers: Map<string, PricingSchedule[]> = new Map();
  
  /**
   * Create a new pricing schedule
   * @param scheduleData - The pricing schedule data
   * @returns The created pricing schedule
   */
  static async createPricingSchedule(scheduleData: CreatePricingScheduleData): Promise<PricingSchedule> {
    const scheduleId = `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const nextBillingDate = this.calculateNextBillingDate(
      scheduleData.startDate,
      'day', // Default to daily for recurring billing
      scheduleData.billingCycle // Use billingCycle as the interval count
    );
    
    // Create conditions object with required fields
    const conditions: PricingConditions = {
      billToType: scheduleData.billToType,
      billToIds: scheduleData.billToIds,
      billingTarget: scheduleData.billingTarget,
      ...scheduleData.conditions
    };
    
    const schedule: PricingSchedule = {
      id: scheduleId,
      productId: scheduleData.productId,
      amount: scheduleData.amount,
      type: 'recurring', // Type: recurring (string literal)
      billingCycle: scheduleData.billingCycle, // Billing cycle: 30 days (or configurable interval)
      billingTarget: scheduleData.billingTarget, // Billing_target: a numeric target amount
      billingCount: 1, // Billing_count: starting at 1
      billToType: scheduleData.billToType, // Bill_to: specify whether billing applies to merchants or users
      billToIds: scheduleData.billToIds, // Specific merchant/user IDs to bill
      billingFor: scheduleData.billingFor, // billing_for: a description field explaining what the billing is for
      billingTitle: scheduleData.billingTitle, // Billing_title: a name/title for this billing entry
      billingException: scheduleData.billingException, // Billing_Exception
      description: scheduleData.description,
      startDate: scheduleData.startDate,
      endDate: scheduleData.endDate,
      nextBillingDate,
      status: 'active',
      conditions,
      trigger: scheduleData.trigger,
      totalBilled: 0,
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.schedules.set(scheduleId, schedule);
    
    // Register trigger for efficient event handling
    this.registerTrigger(schedule);
    
    // In a real implementation, this would be stored in a database
    console.log(`[PRICING SERVICE] Created pricing schedule ${scheduleId} for product ${scheduleData.productId}`);
    
    return schedule;
  }
  
  /**
   * Register a trigger for efficient event handling
   * @param schedule - The pricing schedule to register
   */
  private static registerTrigger(schedule: PricingSchedule): void {
    switch (schedule.trigger.type) {
      case 'perProduct':
        // For per product triggers, we don't need to register anything specific
        // as they are triggered by external events
        break;
      case 'walletFunding':
        // Register wallet funding trigger
        const walletKey = 'walletFunding';
        if (!this.walletFundingTriggers.has(walletKey)) {
          this.walletFundingTriggers.set(walletKey, []);
        }
        this.walletFundingTriggers.get(walletKey)!.push(schedule);
        break;
      case 'merchantUsersCount':
        // Register merchant users count trigger
        const merchantKey = 'merchantUsersCount';
        if (!this.merchantUsersTriggers.has(merchantKey)) {
          this.merchantUsersTriggers.set(merchantKey, []);
        }
        this.merchantUsersTriggers.get(merchantKey)!.push(schedule);
        break;
      case 'generic':
        // For generic triggers, we don't need to register anything specific
        // as they are not event-driven like the others
        break;
    }
  }
  
  /**
   * Handle product created event
   * @param event - The product created event data
   */
  static async handleProductCreatedEvent(event: ProductCreatedEvent): Promise<void> {
    console.log(`[PRICING SERVICE] Handling product created event for product ${event.productId}`);
    
    // Find all active per product triggers
    const perProductSchedules: PricingSchedule[] = [];
    for (const schedule of this.schedules.values()) {
      if (schedule.trigger.type === 'perProduct' && schedule.status === 'active') {
        perProductSchedules.push(schedule);
      }
    }
    
    // Process each matching schedule
    for (const schedule of perProductSchedules) {
      try {
        await this.processTriggeredBilling(schedule, {
          entityId: event.productId,
          entityType: 'product',
          merchantId: event.merchantId
        });
      } catch (error) {
        console.error(`[PRICING SERVICE] Error processing product created trigger for schedule ${schedule.id}:`, error);
        // Handle billing exceptions if configured
        if (schedule.billingException) {
          await this.handleBillingException(schedule, error as Error);
        }
      }
    }
  }
  
  /**
   * Handle wallet funding event
   * @param event - The wallet funding event data
   */
  static async handleWalletFundingEvent(event: WalletFundingEvent): Promise<void> {
    console.log(`[PRICING SERVICE] Handling wallet funding event for wallet ${event.walletId}`);
    
    // Get all active wallet funding triggers
    const walletFundingSchedules = this.walletFundingTriggers.get('walletFunding') || [];
    const activeSchedules = walletFundingSchedules.filter(schedule => schedule.status === 'active');
    
    // Filter by wallet type and minimum amount if configured
    const matchingSchedules = activeSchedules.filter(schedule => {
      const trigger = schedule.trigger as WalletFundingTrigger;
      
      // Check minimum amount if configured
      if (trigger.minimumAmount && event.amount < trigger.minimumAmount) {
        return false;
      }
      
      // Check wallet types if configured
      if (trigger.walletTypes && trigger.walletTypes.length > 0) {
        // Determine wallet type from event
        const walletType = event.userId ? 'user' : 'merchant';
        return trigger.walletTypes.includes(walletType as 'user' | 'merchant');
      }
      
      return true;
    });
    
    // Process each matching schedule
    for (const schedule of matchingSchedules) {
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
        // Handle billing exceptions if configured
        if (schedule.billingException) {
          await this.handleBillingException(schedule, error as Error);
        }
      }
    }
  }
  
  /**
   * Handle merchant users count event
   * @param event - The merchant users count event data
   */
  static async handleMerchantUsersCountEvent(event: MerchantUsersCountEvent): Promise<void> {
    console.log(`[PRICING SERVICE] Handling merchant users count event for merchant ${event.merchantId}`);
    
    // Get all active merchant users count triggers
    const merchantUsersSchedules = this.merchantUsersTriggers.get('merchantUsersCount') || [];
    const activeSchedules = merchantUsersSchedules.filter(schedule => schedule.status === 'active');
    
    // Filter by user count threshold
    const matchingSchedules = activeSchedules.filter(schedule => {
      const trigger = schedule.trigger as MerchantUsersCountTrigger;
      
      // Check if user count threshold is met
      if (event.currentUsersCount >= trigger.userCountThreshold) {
        // If triggerPerUser is set, trigger for each user
        // Otherwise, only trigger when threshold is exactly met
        if (trigger.triggerPerUser) {
          return true;
        } else {
          return event.currentUsersCount === trigger.userCountThreshold;
        }
      }
      
      return false;
    });
    
    // Process each matching schedule
    for (const schedule of matchingSchedules) {
      try {
        await this.processTriggeredBilling(schedule, {
          entityId: event.merchantId,
          entityType: 'merchant',
          userId: event.newUserId,
          userCount: event.currentUsersCount
        });
      } catch (error) {
        console.error(`[PRICING SERVICE] Error processing merchant users count trigger for schedule ${schedule.id}:`, error);
        // Handle billing exceptions if configured
        if (schedule.billingException) {
          await this.handleBillingException(schedule, error as Error);
        }
      }
    }
  }
  
  /**
   * Process triggered billing for a schedule
   * @param schedule - The pricing schedule
   * @param context - Context information for the trigger
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
    // Check conditions before processing
    const conditionCheck = await this.checkPricingConditions(schedule);
    if (!conditionCheck.canBill) {
      console.log(`[PRICING SERVICE] Skipping triggered billing for schedule ${schedule.id}: ${conditionCheck.reason}`);
      
      // If it's a terminal condition (like billing target reached), cancel the schedule
      if (conditionCheck.reason?.includes('target') || conditionCheck.reason?.includes('occurrences')) {
        await this.cancelPricingSchedule(schedule.id);
      }
      
      return;
    }
    
    // Determine who to bill (from context or schedule)
    let billToId = context.merchantId || context.userId;
    if (!billToId && schedule.billToIds && schedule.billToIds.length > 0) {
      billToId = schedule.billToIds[0];
    }
    if (!billToId) {
      billToId = schedule.productId;
    }
    
    // Create a one-time billing entry for this schedule
    const billingData = {
      amount: schedule.amount,
      billTo: billToId,
      billingFor: `${schedule.billingFor} - Triggered for ${context.entityType} ${context.entityId}`,
      billingTitle: `${schedule.billingTitle} - ${context.entityType} Trigger`
    };
    
    const billingEntry = await BillingService.createOneTimeBilling(billingData);
    
    // Execute billing on wallet's billing ledger
    const executionResult = await this.executeBillingOnWalletLedger(billingEntry);
    
    if (!executionResult.success) {
      throw new Error(executionResult.error || 'Failed to execute billing on wallet ledger');
    }
    
    // Update billing statistics
    schedule.billingCount += 1;
    schedule.totalBilled += schedule.amount;
    
    // Update the schedule
    await this.updatePricingSchedule(schedule.id, {
      billingCount: schedule.billingCount,
      totalBilled: schedule.totalBilled
    });
    
    console.log(`[PRICING SERVICE] Processed triggered billing for schedule ${schedule.id}, created billing ${billingEntry.billingTitle}`);
  }
  
  /**
   * Get a pricing schedule by ID
   * @param id - The schedule ID
   * @returns The pricing schedule or null if not found
   */
  static async getPricingSchedule(id: string): Promise<PricingSchedule | null> {
    return this.schedules.get(id) || null;
  }
  
  /**
   * List all pricing schedules
   * @returns Array of all pricing schedules
   */
  static async listPricingSchedules(): Promise<PricingSchedule[]> {
    return Array.from(this.schedules.values());
  }
  
  /**
   * Update a pricing schedule
   * @param id - The schedule ID
   * @param updateData - The update data
   * @returns The updated pricing schedule or null if not found
   */
  static async updatePricingSchedule(
    id: string, 
    updateData: Partial<Omit<PricingSchedule, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<PricingSchedule | null> {
    const schedule = this.schedules.get(id);
    if (!schedule) return null;
    
    // If trigger is being updated, unregister the old trigger and register the new one
    if (updateData.trigger) {
      // In a real implementation, you would also unregister the old trigger
      // For this implementation, we'll just register the new one
    }
    
    const updatedSchedule = {
      ...schedule,
      ...updateData,
      updatedAt: new Date()
    };
    
    this.schedules.set(id, updatedSchedule);
    
    // If trigger was updated, re-register it
    if (updateData.trigger) {
      this.registerTrigger(updatedSchedule);
    }
    
    return updatedSchedule;
  }
  
  /**
   * Cancel a pricing schedule
   * @param id - The schedule ID
   * @returns Boolean indicating success
   */
  static async cancelPricingSchedule(id: string): Promise<boolean> {
    const schedule = this.schedules.get(id);
    if (!schedule) return false;
    
    schedule.status = 'cancelled';
    schedule.updatedAt = new Date();
    this.schedules.set(id, schedule);
    
    console.log(`[PRICING SERVICE] Cancelled pricing schedule ${id}`);
    return true;
  }
  
  /**
   * Pause a pricing schedule
   * @param id - The schedule ID
   * @returns Boolean indicating success
   */
  static async pausePricingSchedule(id: string): Promise<boolean> {
    const schedule = this.schedules.get(id);
    if (!schedule) return false;
    
    schedule.status = 'paused';
    schedule.updatedAt = new Date();
    this.schedules.set(id, schedule);
    
    console.log(`[PRICING SERVICE] Paused pricing schedule ${id}`);
    return true;
  }
  
  /**
   * Resume a pricing schedule
   * @param id - The schedule ID
   * @returns Boolean indicating success
   */
  static async resumePricingSchedule(id: string): Promise<boolean> {
    const schedule = this.schedules.get(id);
    if (!schedule) return false;
    
    schedule.status = 'active';
    schedule.updatedAt = new Date();
    this.schedules.set(id, schedule);
    
    console.log(`[PRICING SERVICE] Resumed pricing schedule ${id}`);
    return true;
  }
  
  /**
   * Check if a pricing schedule meets all conditions
   * @param schedule - The pricing schedule to check
   * @returns Object with success status and message
   */
  static async checkPricingConditions(schedule: PricingSchedule): Promise<{
    canBill: boolean;
    reason?: string;
  }> {
    // Check if schedule is active
    if (schedule.status !== 'active') {
      return {
        canBill: false,
        reason: `Schedule is ${schedule.status}`
      };
    }
    
    // Check billing target condition
    if (schedule.billingTarget && schedule.totalBilled >= schedule.billingTarget) {
      return {
        canBill: false,
        reason: `Billing target of ${schedule.billingTarget} reached`
      };
    }
    
    // Check maximum occurrences condition (based on billingCount)
    if (schedule.conditions.maxOccurrences && schedule.billingCount > schedule.conditions.maxOccurrences) {
      return {
        canBill: false,
        reason: `Maximum occurrences of ${schedule.conditions.maxOccurrences} reached`
      };
    }
    
    // Check time-based conditions
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0-6 (Sunday-Saturday)
    const hourOfDay = now.getHours(); // 0-23
    
    // Check valid days
    if (schedule.conditions.validDays && !schedule.conditions.validDays.includes(dayOfWeek)) {
      return {
        canBill: false,
        reason: `Not a valid day for billing`
      };
    }
    
    // Check valid hours
    if (schedule.conditions.validHours) {
      const { start, end } = schedule.conditions.validHours;
      if (hourOfDay < start || hourOfDay >= end) {
        return {
          canBill: false,
          reason: `Not a valid hour for billing`
        };
      }
    }
    
    // Check wallet balance conditions (if user/merchant specified)
    if (schedule.billToIds && schedule.billToIds.length > 0) {
      const userId = schedule.billToIds[0]; // For simplicity, check the first ID
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
   * @param schedule - The pricing schedule
   * @param error - The error that occurred
   * @returns Boolean indicating if the exception was handled
   */
  static async handleBillingException(schedule: PricingSchedule, error: Error): Promise<boolean> {
    if (!schedule.billingException) {
      return false;
    }
    
    // Increment exception count
    schedule.billingException.currentExceptionCount += 1;
    
    // Check if threshold is met
    if (schedule.billingException.currentExceptionCount >= schedule.billingException.maxExceptionCount) {
      // Take action based on exception type
      switch (schedule.billingException.action) {
        case 'Suspend':
          // Suspend user/merchant accounts
          if (schedule.billToIds && schedule.billToIds.length > 0) {
            for (const id of schedule.billToIds) {
              await this.suspendAccount(schedule.billToType, id);
            }
          }
          // Cancel the schedule
          await this.cancelPricingSchedule(schedule.id);
          break;
      }
    }
    
    // Update the schedule with the new exception count
    await this.updatePricingSchedule(schedule.id, {
      billingException: schedule.billingException
    });
    
    return true;
  }
  
  /**
   * Suspend a user or merchant account
   * @param type - The type of account (user or merchant)
   * @param id - The ID of the account
   */
  private static async suspendAccount(type: 'user' | 'merchant', id: string): Promise<void> {
    console.log(`[PRICING SERVICE] Suspending ${type} account ${id} due to billing exceptions`);
    // In a real implementation, this would call the user service or account service
    // to suspend the user's/merchant's account
  }
  
  /**
   * Check wallet-related conditions
   * @param userId - The user ID to check
   * @param schedule - The pricing schedule
   * @returns Object with success status and message
   */
  private static async checkWalletConditions(
    userId: string, 
    schedule: PricingSchedule
  ): Promise<{
    canBill: boolean;
    reason?: string;
  }> {
    try {
      // In a real implementation, this would call the wallet service to check balance
      // For now, we'll simulate this check
      const walletServiceUrl = process.env.WALLET_SERVICE_URL || 'http://localhost:3004';
      
      // This is a simplified check - in reality, you'd make an API call to the wallet service
      // to get the actual wallet balance
      
      // For demonstration purposes, we'll return true
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
   * This method should be called by the scheduler at regular intervals
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
      const dueSchedules: PricingSchedule[] = [];
      
      // Find all active schedules that are due
      for (const schedule of this.schedules.values()) {
        if (
          schedule.status === 'active' &&
          schedule.nextBillingDate <= now &&
          (!schedule.endDate || schedule.endDate >= now)
        ) {
          dueSchedules.push(schedule);
        }
      }
      
      console.log(`[PRICING SERVICE] Processing ${dueSchedules.length} due pricing schedules`);
      
      // Process each due schedule
      for (const schedule of dueSchedules) {
        try {
          // Check conditions before processing
          const conditionCheck = await this.checkPricingConditions(schedule);
          if (!conditionCheck.canBill) {
            console.log(`[PRICING SERVICE] Skipping schedule ${schedule.id}: ${conditionCheck.reason}`);
            
            // If it's a terminal condition (like billing target reached), cancel the schedule
            if (conditionCheck.reason?.includes('target') || conditionCheck.reason?.includes('occurrences')) {
              await this.cancelPricingSchedule(schedule.id);
            }
            
            continue;
          }
          
          // Create a one-time billing entry for this schedule
          // For now, we'll use the first billToId if available, otherwise the productId
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
          
          // Execute billing on wallet's billing ledger
          const executionResult = await this.executeBillingOnWalletLedger(billingEntry);
          
          if (!executionResult.success) {
            throw new Error(executionResult.error || 'Failed to execute billing on wallet ledger');
          }
          
          // Update billing statistics
          schedule.billingCount += 1;
          schedule.totalBilled += schedule.amount;
          schedule.lastError = undefined;
          schedule.retryCount = 0;
          
          // Calculate next billing date
          const nextBillingDate = this.calculateNextBillingDate(
            schedule.nextBillingDate,
            'day', // Default to daily for recurring billing
            schedule.billingCycle // Use billingCycle as the interval count
          );
          
          // Update the schedule
          await this.updatePricingSchedule(schedule.id, {
            nextBillingDate,
            billingCount: schedule.billingCount,
            totalBilled: schedule.totalBilled,
            lastError: schedule.lastError,
            retryCount: schedule.retryCount
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
          
          // Update error information
          schedule.lastError = error instanceof Error ? error.message : 'Unknown error';
          schedule.retryCount += 1;
          
          // Check if we should retry based on conditions
          const maxRetries = schedule.conditions.maxRetries || 0;
          if (schedule.retryCount < maxRetries) {
            // Schedule a retry
            const retryInterval = (schedule.conditions.retryInterval || 5) * 60 * 1000; // Convert minutes to ms
            setTimeout(async () => {
              console.log(`[PRICING SERVICE] Retrying schedule ${schedule.id}`);
              // In a real implementation, you'd trigger a reprocessing
            }, retryInterval);
          }
          
          await this.updatePricingSchedule(schedule.id, {
            lastError: schedule.lastError,
            retryCount: schedule.retryCount
          });
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
   * @param startDate - The start date
   * @param interval - The interval type
   * @param intervalCount - The interval count
   * @returns The next billing date
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
   * @param billingEntry - The one-time billing entry to execute
   * @returns Result of the execution
   */
  static async executeBillingOnWalletLedger(billingEntry: OneTimeBilling): Promise<{
    success: boolean;
    transaction?: any;
    error?: string;
  }> {
    try {
      const walletServiceUrl = process.env.WALLET_SERVICE_URL || 'http://localhost:3004';
      
      // Make an actual API call to the wallet service's billing ledger endpoint
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
      // Handle different types of errors
      if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          error: 'Wallet service timeout - unable to execute billing'
        };
      } else if (error.response) {
        // Server responded with error status
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
          error: error.message || 'Unknown error occurred while executing billing on wallet ledger'
        };
      }
    }
  }
}