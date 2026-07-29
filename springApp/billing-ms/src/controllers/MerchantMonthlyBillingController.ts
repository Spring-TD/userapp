import { Request, Response } from 'express';
import { MerchantMonthlyBillingScheduler } from '../services/merchantMonthlyBillingScheduler';
import {
  currentBillingPeriod,
  isMonthlyBillingEnabled,
  monthlyBillingDay,
  pricePerCustomer
} from '../services/merchantMonthlyBillingService';

export class MerchantMonthlyBillingController {
  static async getStatus(_req: Request, res: Response): Promise<void> {
    const scheduler = MerchantMonthlyBillingScheduler.getInstance();
    res.status(200).json({
      success: true,
      data: {
        enabled: isMonthlyBillingEnabled(),
        billingDayUtc: monthlyBillingDay(),
        pricePerCustomer: pricePerCustomer(),
        currentPeriod: currentBillingPeriod(),
        scheduler: scheduler.getStatus()
      }
    });
  }

  static async trigger(req: Request, res: Response): Promise<void> {
    try {
      const billingPeriod =
        typeof req.body?.billingPeriod === 'string' && req.body.billingPeriod.trim()
          ? req.body.billingPeriod.trim()
          : undefined;
      const force = req.body?.force !== false;

      const scheduler = MerchantMonthlyBillingScheduler.getInstance();
      const result = billingPeriod
        ? await (async () => {
            const { runMerchantMonthlyCustomerBilling } = await import(
              '../services/merchantMonthlyBillingService'
            );
            return runMerchantMonthlyCustomerBilling({ billingPeriod, force: true });
          })()
        : await scheduler.runNow(force);

      res.status(result.success ? 200 : 207).json({
        success: result.success,
        message: result.processedApps
          ? 'Merchant monthly customer billing completed'
          : result.error || 'No apps processed',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to run merchant monthly billing',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
