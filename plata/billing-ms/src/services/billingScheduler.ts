import { RecurringBillingService } from './recurringBillingService';

export class BillingScheduler {
  private static instance: BillingScheduler;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  
  private constructor() {}
  
  static getInstance(): BillingScheduler {
    if (!BillingScheduler.instance) {
      BillingScheduler.instance = new BillingScheduler();
    }
    return BillingScheduler.instance;
  }
  
  /**
   * Start the billing scheduler
   * @param interval - Interval in milliseconds (default: 1 hour)
   */
  start(interval: number = 60 * 60 * 1000): void {
    if (this.isRunning) {
      console.log('Billing scheduler is already running');
      return;
    }
    
    this.isRunning = true;
    console.log(`Starting billing scheduler with interval ${interval}ms`);
    
    // Run immediately on start
    this.runBillingProcess();
    
    // Schedule recurring execution
    this.intervalId = setInterval(() => {
      this.runBillingProcess();
    }, interval);
  }
  
  /**
   * Stop the billing scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('Billing scheduler is not running');
      return;
    }
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
    console.log('Billing scheduler stopped');
  }
  
  /**
   * Run the billing process
   */
  private async runBillingProcess(): Promise<void> {
    try {
      console.log('Running recurring billing process...');
      
      const result = await RecurringBillingService.processDueRecurringBillings();
      
      if (result.success) {
        console.log(`Recurring billing process completed: ${result.processedCount} billings processed, ${result.failedCount} failed`);
        if (result.errors.length > 0) {
          console.warn('Errors during billing process:', result.errors);
        }
      } else {
        console.error('Recurring billing process failed:', result.errors);
      }
    } catch (error) {
      console.error('Error in billing scheduler:', error instanceof Error ? error.message : 'Unknown error');
    }
  }
  
  /**
   * Run billing process immediately (for manual triggering)
   */
  async runNow(): Promise<void> {
    await this.runBillingProcess();
  }
}