import { PricingService } from './pricingService';

export class PricingScheduler {
  private static instance: PricingScheduler;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  
  private constructor() {}
  
  static getInstance(): PricingScheduler {
    if (!PricingScheduler.instance) {
      PricingScheduler.instance = new PricingScheduler();
    }
    return PricingScheduler.instance;
  }
  
  /**
   * Start the pricing scheduler
   * @param interval - Interval in milliseconds (default: 1 hour)
   */
  start(interval: number = 60 * 60 * 1000): void {
    if (this.isRunning) {
      console.log('Pricing scheduler is already running');
      return;
    }
    
    this.isRunning = true;
    console.log(`Starting pricing scheduler with interval ${interval}ms`);
    
    // Run immediately on start
    this.runPricingProcess();
    
    // Schedule recurring execution
    this.intervalId = setInterval(() => {
      this.runPricingProcess();
    }, interval);
  }
  
  /**
   * Stop the pricing scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('Pricing scheduler is not running');
      return;
    }
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
    console.log('Pricing scheduler stopped');
  }
  
  /**
   * Run the pricing process
   */
  private async runPricingProcess(): Promise<void> {
    try {
      console.log('Running pricing schedule process...');
      
      const result = await PricingService.processDuePricingSchedules();
      
      if (result.success) {
        console.log(`Pricing schedule process completed: ${result.processedCount} schedules processed, ${result.failedCount} failed`);
        if (result.errors.length > 0) {
          console.warn('Errors during pricing schedule process:', result.errors);
        }
      } else {
        console.error('Pricing schedule process failed:', result.errors);
      }
    } catch (error) {
      console.error('Error in pricing scheduler:', error instanceof Error ? error.message : 'Unknown error');
    }
  }
  
  /**
   * Run pricing process immediately (for manual triggering)
   */
  async runNow(): Promise<void> {
    await this.runPricingProcess();
  }
}