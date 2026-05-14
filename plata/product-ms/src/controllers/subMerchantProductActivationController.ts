import type { Request, Response } from 'express';
import { SubMerchantProductActivationService } from '../services/subMerchantProductActivationService';
import type {
  SubMerchantComplianceDocument,
  SubMerchantComplianceStatus
} from '../types/subMerchantProductActivation';

export class SubMerchantProductActivationController {
  constructor(private readonly service: SubMerchantProductActivationService) {}

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
        status: 'active' | 'deactivated';
        complianceStatus?: SubMerchantComplianceStatus;
        complianceDocuments?: SubMerchantComplianceDocument[];
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
        status: body.status,
        complianceStatus: body.complianceStatus,
        complianceDocuments: body.complianceDocuments
      });

      res.status(200).json({ success: true, data });
    } catch (error) {
      const err = error as Error & { statusCode?: number };
      if (err.statusCode === 404) {
        res.status(404).json({ success: false, error: err.message });
        return;
      }
      console.error('sub-merchant activation upsert:', error);
      res.status(500).json({ success: false, error: 'Failed to save activation' });
    }
  };

  getMerchantDashboard = async (req: Request, res: Response): Promise<void> => {
    try {
      const authUser = req.authUser;
      if (!authUser?.merchantAccountId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const q = req.validatedQuery as {
        appId: string;
        status?: 'active' | 'deactivated';
        search?: string;
        limit: number;
        skip: number;
      };

      const data = await this.service.listMerchantDashboard({
        appId: q.appId.trim(),
        merchantId: authUser.merchantAccountId,
        status: q.status,
        search: q.search,
        limit: q.limit,
        skip: q.skip
      });

      res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('sub-merchant merchant-dashboard:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch merchant dashboard data' });
    }
  };
}
