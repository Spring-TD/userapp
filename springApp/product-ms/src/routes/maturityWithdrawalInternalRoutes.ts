import { Router, Request, Response } from 'express';
import { requireWalletInternalToken } from '../middleware/walletInternalAuth';
import { ApiError } from '../middleware/errorHandler';
import maturityWithdrawalCompletionService from '../services/maturityWithdrawalCompletionService';

const router = Router();

router.post(
  '/:localApplicationId/approved',
  requireWalletInternalToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const localApplicationId = String(req.params.localApplicationId || '').trim();
      const body = req.body || {};
      const result = await maturityWithdrawalCompletionService.completeApproved({
        localApplicationId,
        referenceId: String(body.referenceId || '').trim(),
        principal: Number(body.principal),
        interest: Number(body.interest),
        totalPayout: Number(body.totalPayout),
        currency: typeof body.currency === 'string' ? body.currency : undefined,
        productType: typeof body.productType === 'string' ? body.productType : undefined
      });
      res.status(result.duplicate ? 200 : 201).json({ success: true, duplicate: result.duplicate === true });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete approved withdrawal'
      });
    }
  }
);

router.post(
  '/:localApplicationId/rejected',
  requireWalletInternalToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const localApplicationId = String(req.params.localApplicationId || '').trim();
      const body = req.body || {};
      const result = await maturityWithdrawalCompletionService.completeRejected({
        localApplicationId,
        referenceId: String(body.referenceId || '').trim(),
        reason: typeof body.reason === 'string' ? body.reason : undefined,
        productType: typeof body.productType === 'string' ? body.productType : undefined
      });
      res.status(200).json({ success: true, rejected: result.success === true });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete rejected withdrawal'
      });
    }
  }
);

export { router as maturityWithdrawalInternalRoutes };
