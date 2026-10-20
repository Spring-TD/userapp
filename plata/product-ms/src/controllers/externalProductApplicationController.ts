import type { Request, Response } from 'express';
import { ApiError } from '../middleware/errorHandler';
import { ExternalProductApplicationService } from '../services/externalProductApplicationService';
import type {
  CreateExternalProductAccountInput,
  SubmitExternalProductApplicationInput
} from '../types/externalProductApplication';

export class ExternalProductApplicationController {
  constructor(private readonly service: ExternalProductApplicationService) {}

  createAccount = async (req: Request, res: Response): Promise<void> => {
    try {
      const gm = req.gatewayMerchant;
      if (!gm) {
        res.status(401).json({ success: false, error: 'Gateway context missing' });
        return;
      }
      const body = ((req as any).validatedBody ?? req.body) as Omit<
        CreateExternalProductAccountInput,
        'plataMerchantId' | 'apiKeyId' | 'gatewayEnvironment'
      >;
      const data = await this.service.createAccount({
        plataMerchantId: gm.merchantId,
        apiKeyId: gm.apiKeyId,
        gatewayEnvironment: gm.gatewayEnvironment,
        ...body
      });
      res.status(data.wallet.created ? 201 : 200).json({
        success: true,
        message: data.wallet.created
          ? 'Bank account created for user'
          : 'Existing bank account returned for user',
        data
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      console.error('external product account create:', error);
      res.status(500).json({ success: false, error: 'Failed to create bank account' });
    }
  };

  submit = async (req: Request, res: Response): Promise<void> => {
    try {
      const gm = req.gatewayMerchant;
      if (!gm) {
        res.status(401).json({ success: false, error: 'Gateway context missing' });
        return;
      }
      const body = ((req as any).validatedBody ?? req.body) as Omit<
        SubmitExternalProductApplicationInput,
        'plataMerchantId' | 'plataMerchantName' | 'apiKeyId' | 'gatewayEnvironment'
      >;
      const data = await this.service.submit({
        plataMerchantId: gm.merchantId,
        plataMerchantName: gm.merchantName,
        apiKeyId: gm.apiKeyId,
        gatewayEnvironment: gm.gatewayEnvironment,
        ...body
      });
      res.status(data.applicationCreated ? 201 : 200).json({
        success: true,
        message: data.applicationCreated
          ? 'External product application submitted and user provisioned'
          : 'User provisioned; existing application returned',
        data
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      console.error('external product application submit:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit external product application'
      });
    }
  };
}
