import {
  isAccountMaintenanceEnabled,
  runAccountMaintenanceSettlement
} from './accountMaintenanceSettlementService';

export class AccountMaintenanceSettlementScheduler {
  private static instance: AccountMaintenanceSettlementScheduler;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastRunPeriod: string | null = null;

  private constructor() {}

  static getInstance(): AccountMaintenanceSettlementScheduler {
    if (!AccountMaintenanceSettlementScheduler.instance) {
      AccountMaintenanceSettlementScheduler.instance = new AccountMaintenanceSettlementScheduler();
    }
    return AccountMaintenanceSettlementScheduler.instance;
  }

  start(intervalMs?: number): void {
    if (this.isRunning) return;
    if (!isAccountMaintenanceEnabled()) {
      console.warn('[ACCOUNT MAINTENANCE] Scheduler not started — missing config');
      return;
    }

    const interval = intervalMs ?? parseInt(process.env.ACCOUNT_MAINTENANCE_INTERVAL || '3600000', 10);
    this.isRunning = true;
    console.log(`[ACCOUNT MAINTENANCE] Starting scheduler (interval ${interval}ms)`);
    void this.tick();
    this.intervalId = setInterval(() => void this.tick(), interval);
  }

  stop(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
    this.isRunning = false;
  }

  getStatus(): { running: boolean; lastRunPeriod: string | null; enabled: boolean } {
    return {
      running: this.isRunning,
      lastRunPeriod: this.lastRunPeriod,
      enabled: isAccountMaintenanceEnabled()
    };
  }

  async runNow(force = true) {
    const result = await runAccountMaintenanceSettlement({ force });
    if (result.processedCustomers > 0) {
      this.lastRunPeriod = result.billingPeriod;
    }
    return result;
  }

  private async tick(): Promise<void> {
    try {
      const result = await runAccountMaintenanceSettlement();
      if (result.processedCustomers > 0) {
        this.lastRunPeriod = result.billingPeriod;
        console.log('[ACCOUNT MAINTENANCE] Run complete', {
          billingPeriod: result.billingPeriod,
          processedCustomers: result.processedCustomers,
          chargedCustomers: result.chargedCustomers,
          failedCustomers: result.failedCustomers
        });
      }
    } catch (error) {
      console.error('[ACCOUNT MAINTENANCE] Scheduler tick failed', error);
    }
  }
}
