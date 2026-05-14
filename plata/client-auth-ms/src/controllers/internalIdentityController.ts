import { Request, Response } from 'express';
import { ExternalUserUsageIdentityModel } from '../models/ExternalUserUsageIdentityModel';

export class InternalIdentityController {
  static async upsertUsageEvent(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as {
        plataMerchantId: string;
        apiKeyId?: string;
        gatewayEnvironment?: string;
        appId: string;
        productId: string;
        productNameSnapshot?: string;
        merchantId: string;
        merchantName: string;
        subMerchantId: string;
        subMerchantName: string;
        subMerchantEmail: string;
        subMerchantPhone: string;
        externalUserId: string;
        externalUserName: string;
        externalUserEmail: string;
        externalUserPhone: string;
        eventType: 'started_using_product';
        startedAt: string | Date;
      };

      const startedAt = new Date(body.startedAt);
      if (Number.isNaN(startedAt.getTime())) {
        res.status(400).json({ success: false, error: 'Invalid startedAt value' });
        return;
      }

      const filter = {
        plataMerchantId: body.plataMerchantId,
        appId: body.appId,
        productId: body.productId,
        merchantId: body.merchantId,
        subMerchantId: body.subMerchantId,
        externalUserId: body.externalUserId,
        eventType: 'started_using_product' as const
      };

      const setDoc = {
        plataMerchantId: body.plataMerchantId,
        appId: body.appId,
        productId: body.productId,
        merchantId: body.merchantId,
        merchantName: body.merchantName,
        subMerchantId: body.subMerchantId,
        subMerchantName: body.subMerchantName,
        subMerchantEmail: body.subMerchantEmail,
        subMerchantPhone: body.subMerchantPhone,
        externalUserId: body.externalUserId,
        externalUserName: body.externalUserName,
        externalUserEmail: body.externalUserEmail,
        externalUserPhone: body.externalUserPhone,
        eventType: 'started_using_product' as const,
        startedAt,
        ...(body.apiKeyId ? { apiKeyId: body.apiKeyId } : {}),
        ...(body.gatewayEnvironment ? { gatewayEnvironment: body.gatewayEnvironment } : {}),
        ...(body.productNameSnapshot ? { productNameSnapshot: body.productNameSnapshot } : {})
      };

      await ExternalUserUsageIdentityModel.findOneAndUpdate(
        filter,
        { $set: setDoc },
        { upsert: true, new: true, runValidators: true }
      ).exec();

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('internal identity usage upsert:', error);
      res.status(500).json({ success: false, error: 'Failed to save identity usage event' });
    }
  }
}
