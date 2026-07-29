import {
  isMonthlyBillingEnabled,
  runMerchantMonthlyCustomerBilling
} from './merchantMonthlyBillingService';

export class MerchantMonthlyBillingScheduler {
  private static instance: MerchantMonthlyBillingScheduler;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastRunPeriod: string | null = null;

  private constructor() {}

  static getInstance(): MerchantMonthlyBillingScheduler {
    if (!MerchantMonthlyBillingScheduler.instance) {
      MerchantMonthlyBillingScheduler.instance = new MerchantMonthlyBillingScheduler();
    }
    return MerchantMonthlyBillingScheduler.instance;
  }

  start(intervalMs?: number): void {
    if (this.isRunning) {
      console.log('[MERCHANT MONTHLY BILLING] Scheduler already running');
      return;
    }

    if (!isMonthlyBillingEnabled()) {
      console.warn(
        '[MERCHANT MONTHLY BILLING] Scheduler not started — missing JWT_SECRET or service URLs'
      );
      return;
    }

    const interval = intervalMs ?? parseInt(process.env.MERCHANT_MONTHLY_BILLING_INTERVAL || '3600000', 10);
    this.isRunning = true;

    console.log(`[MERCHANT MONTHLY BILLING] Starting scheduler (interval ${interval}ms)`);

    void this.tick();
    this.intervalId = setInterval(() => {
      void this.tick();
    }, interval);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[MERCHANT MONTHLY BILLING] Scheduler stopped');
  }

  getStatus(): { running: boolean; lastRunPeriod: string | null; enabled: boolean } {
    return {
      running: this.isRunning,
      lastRunPeriod: this.lastRunPeriod,
      enabled: isMonthlyBillingEnabled()
    };
  }

  async runNow(force = true): Promise<ReturnType<typeof runMerchantMonthlyCustomerBilling>> {
    const result = await runMerchantMonthlyCustomerBilling({ force });
    if (result.processedApps > 0) {
      this.lastRunPeriod = result.billingPeriod;
    }
    return result;
  }

  private async tick(): Promise<void> {
    try {
      const result = await runMerchantMonthlyCustomerBilling();
      if (result.processedApps > 0) {
        this.lastRunPeriod = result.billingPeriod;
        console.log('[MERCHANT MONTHLY BILLING] Run complete', {
          billingPeriod: result.billingPeriod,
          processedApps: result.processedApps,
          chargedApps: result.chargedApps,
          failedApps: result.failedApps
        });
      }
    } catch (error) {
      console.error('[MERCHANT MONTHLY BILLING] Scheduler tick failed', error);
    }
  }
}
