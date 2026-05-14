import type { Request, Response } from 'express';
import { SubMerchantProductUsageEventService } from '../services/subMerchantProductUsageEventService';

export class SubMerchantProductUsageEventController {
  constructor(private readonly service: SubMerchantProductUsageEventService) {}

  upsert = async (req: Request, res: Response): Promise<void> => {
    try {
      const gm = req.gatewayMerchant;
      if (!gm) {
        res.status(401).json({ success: false, error: 'Gateway context missing' });
        return;
      }

      const body = req.validatedBody as {
        appId: string;
        productId: string;
        productName?: string;
        merchantId: string;
        merchantName: string;
        subMerchant: { id: string; name: string; email: string; phone: string };
        externalUser: { id: string; name: string; email: string; phone: string };
        startedAt?: string;
      };

      const data = await this.service.upsert({
        plataMerchantId: gm.merchantId,
        apiKeyId: gm.apiKeyId,
        gatewayEnvironment: gm.gatewayEnvironment,
        appId: body.appId,
        productId: body.productId,
        productName: body.productName,
        merchantId: body.merchantId,
        merchantName: body.merchantName,
        subMerchant: body.subMerchant,
        externalUser: body.externalUser,
        startedAt: body.startedAt
      });

      res.status(200).json({ success: true, data });
    } catch (error) {
      const err = error as Error & { statusCode?: number };
      if (err.statusCode === 404) {
        res.status(404).json({ success: false, error: err.message });
        return;
      }
      console.error('sub-merchant usage upsert:', error);
      res.status(500).json({ success: false, error: 'Failed to save usage event' });
    }
  };

  getCustomerDashboard = async (req: Request, res: Response): Promise<void> => {
    try {
      const authUser = req.authUser;
      if (!authUser?.merchantAccountId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const q = req.validatedQuery as {
        appId: string;
        subMerchantId?: string;
        search?: string;
        limit: number;
        skip: number;
      };

      const data = await this.service.listCustomerDashboard({
        appId: q.appId.trim(),
        merchantId: authUser.merchantAccountId,
        subMerchantId: q.subMerchantId,
        search: q.search,
        limit: q.limit,
        skip: q.skip
      });

      res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('sub-merchant customers-dashboard:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch customers dashboard data' });
    }
  };
}
