import { Request, Response } from 'express';
import { ApiError } from '../middleware/errorHandler';
import commodityAccountService from '../services/commodityAccountService';
import commodityWithdrawalService from '../services/commodityWithdrawalService';
import type { ApplyCommodityAccountRequest, CommodityWithdrawRequest } from '../types/commodityAccount';

class CommodityAccountController {
  applyForCommodity = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = (req.validatedBody ?? req.body) as ApplyCommodityAccountRequest;
      const result = await commodityAccountService.applyForCommodity(body, req);

      res.status(201).json({
        success: true,
        message: 'Commodity enrolled and funded successfully. Funds are locked until maturity.',
        data: {
          type: 'account',
          account: result.account,
          applicationId: result.applicationId
        }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      console.error('Error enrolling in commodity:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enroll in commodity product'
      });
    }
  };

  getCommodityAccount = async (req: Request, res: Response): Promise<void> => {
    try {
      const applicationId = String(req.params.applicationId || '').trim();
      const userId = String(req.query.userId || '').trim();
      if (!userId) {
        res.status(400).json({ success: false, error: 'userId query parameter is required' });
        return;
      }

      const account = await commodityAccountService.getCommodityAccount(applicationId, userId);
      res.status(200).json({ success: true, data: account });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load commodity account'
      });
    }
  };

  withdraw = async (req: Request, res: Response): Promise<void> => {
    try {
      const applicationId = String(req.params.applicationId || '').trim();
      const body = (req.validatedBody ?? req.body) as CommodityWithdrawRequest;
      const result = await commodityWithdrawalService.withdraw(applicationId, body);

      res.status(result.duplicate ? 200 : 201).json({
        success: true,
        duplicate: result.duplicate,
        message: result.duplicate
          ? 'Commodity withdrawal already processed.'
          : 'Commodity principal and interest paid out successfully.',
        data: result.withdrawal
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to withdraw commodity holding'
      });
    }
  };
}

export default new CommodityAccountController();
