import { Request, Response } from 'express';
import { ApiError } from '../middleware/errorHandler';
import savingsAccountService from '../services/savingsAccountService';
import savingsDepositService from '../services/savingsDepositService';
import type { CreateSavingsAccountRequest, SavingsDepositRequest, SavingsDepositWebhookRequest } from '../types/savingsAccount';

class SavingsAccountController {
  createSavingsAccount = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = (req.validatedBody ?? req.body) as CreateSavingsAccountRequest;
      const result = await savingsAccountService.createSavingsAccount(body, req);

      res.status(result.created ? 201 : 200).json({
        success: true,
        message: result.created
          ? 'Product account created successfully.'
          : 'Savings account already exists for this product.',
        data: {
          type: 'account',
          account: result.account,
          applicationId: result.applicationId
        }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error creating savings account:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create savings account'
      });
    }
  };

  getDepositDetails = async (req: Request, res: Response): Promise<void> => {
    try {
      const applicationId = String(req.params.applicationId || '').trim();
      const userId = String(req.query.userId || '').trim();
      if (!userId) {
        res.status(400).json({ success: false, error: 'userId query parameter is required' });
        return;
      }

      const details = await savingsDepositService.getDepositDetails(applicationId, userId);
      res.status(200).json({ success: true, data: details });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load savings deposit details'
      });
    }
  };

  deposit = async (req: Request, res: Response): Promise<void> => {
    try {
      const applicationId = String(req.params.applicationId || '').trim();
      const body = (req.validatedBody ?? req.body) as SavingsDepositRequest;
      const result = await savingsDepositService.depositFromWallet(applicationId, body);

      res.status(result.duplicate ? 200 : 201).json({
        success: true,
        duplicate: result.duplicate,
        message: result.duplicate ? 'Savings deposit already recorded.' : 'Savings deposit recorded successfully.',
        data: result.deposit
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to record savings deposit'
      });
    }
  };

  handleExternalDepositWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = (req.validatedBody ?? req.body) as SavingsDepositWebhookRequest;
      const result = await savingsDepositService.depositFromExternalTransfer(body);

      res.status(result.duplicate ? 200 : 201).json({
        success: true,
        duplicate: result.duplicate,
        data: result.deposit
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to record external savings deposit'
      });
    }
  };
}

export default new SavingsAccountController();
