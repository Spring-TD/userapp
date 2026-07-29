import { config } from '../config/environment';
import { ProductService } from './productService';

const productService = new ProductService();

export type CatalogReconcileResult = Awaited<
  ReturnType<ProductService['reconcileLocalCatalogClones']>
>;

/**
 * Periodically re-syncs Spring local product clones from Plata when
 * `metadata.upstreamCatalogUpdatedAt` drifts (missed webhooks).
 */
export class ProductCatalogSyncScheduler {
  private static instance: ProductCatalogSyncScheduler;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private tickInFlight = false;
  private lastResult: CatalogReconcileResult | null = null;
  private lastRunAt: string | null = null;
  private lastError: string | null = null;

  private constructor() {}

  static getInstance(): ProductCatalogSyncScheduler {
    if (!ProductCatalogSyncScheduler.instance) {
      ProductCatalogSyncScheduler.instance = new ProductCatalogSyncScheduler();
    }
    return ProductCatalogSyncScheduler.instance;
  }

  start(intervalMs?: number): void {
    if (this.isRunning) {
      console.log('[PRODUCT CATALOG SYNC] Scheduler already running');
      return;
    }

    if (!config.productCatalogSyncEnabled) {
      console.warn('[PRODUCT CATALOG SYNC] Scheduler not started (PRODUCT_CATALOG_SYNC_ENABLED=false)');
      return;
    }

    if (!config.plataPublicKey || !config.plataSecretKey) {
      console.warn('[PRODUCT CATALOG SYNC] Scheduler not started — Plata gateway keys not configured');
      return;
    }

    const interval = intervalMs ?? config.productCatalogSyncIntervalMs;
    this.isRunning = true;
    console.log(`[PRODUCT CATALOG SYNC] Starting scheduler (interval ${interval}ms)`);

    // Delay first tick slightly so Mongo has time to connect after listen.
    setTimeout(() => void this.tick(), 15_000);
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
    console.log('[PRODUCT CATALOG SYNC] Scheduler stopped');
  }

  getStatus(): {
    running: boolean;
    enabled: boolean;
    intervalMs: number;
    lastRunAt: string | null;
    lastError: string | null;
    lastResult: CatalogReconcileResult | null;
  } {
    return {
      running: this.isRunning,
      enabled: config.productCatalogSyncEnabled,
      intervalMs: config.productCatalogSyncIntervalMs,
      lastRunAt: this.lastRunAt,
      lastError: this.lastError,
      lastResult: this.lastResult
    };
  }

  async runNow(force = false): Promise<CatalogReconcileResult> {
    const result = await productService.reconcileLocalCatalogClones({ force });
    this.lastRunAt = new Date().toISOString();
    this.lastResult = result;
    this.lastError = null;
    return result;
  }

  private async tick(): Promise<void> {
    if (this.tickInFlight) {
      return;
    }
    this.tickInFlight = true;
    try {
      const result = await productService.reconcileLocalCatalogClones();
      this.lastRunAt = new Date().toISOString();
      this.lastResult = result;
      this.lastError = null;
      if (result.syncedUpstreamIds.length > 0 || result.failed.length > 0) {
        console.log('[PRODUCT CATALOG SYNC] Reconcile complete', {
          checked: result.checked,
          synced: result.syncedUpstreamIds.length,
          skipped: result.skipped,
          failed: result.failed.length
        });
      }
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      console.error('[PRODUCT CATALOG SYNC] Reconcile failed:', this.lastError);
    } finally {
      this.tickInFlight = false;
    }
  }
}

export default ProductCatalogSyncScheduler.getInstance();
