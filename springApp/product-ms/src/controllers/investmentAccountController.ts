import { Request, Response } from 'express';
import { ApiError } from '../middleware/errorHandler';
import investmentAccountService from '../services/investmentAccountService';
import investmentDepositService from '../services/investmentDepositService';
import type {
  CreateInvestmentAccountRequest,
  InvestmentDepositRequest
} from '../types/investmentAccount';

class InvestmentAccountController {
  createInvestmentAccount = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = (req.validatedBody ?? req.body) as CreateInvestmentAccountRequest;
      const result = await investmentAccountService.createInvestmentAccount(body, req);

      res.status(result.created ? 201 : 200).json({
        success: true,
        message: result.created
          ? 'Investment account created successfully.'
          : 'Investment account already exists for this product.',
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

      console.error('Error creating investment account:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create investment account'
      });
    }
  };

  getDepositDetails = async (req: Request, res: Response): Promise<void> => {
    try {
      const applicationId = String(req.params.applicationId || '').trim();
      const userId = String(req.query.userId || req.body?.userId || '').trim();
      if (!userId) {
        res.status(400).json({ success: false, error: 'userId is required' });
        return;
      }

      const details = await investmentDepositService.getDepositDetails(applicationId, userId);
      res.status(200).json({
        success: true,
        data: details
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error fetching investment deposit details:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch deposit details'
      });
    }
  };

  deposit = async (req: Request, res: Response): Promise<void> => {
    try {
      const applicationId = String(req.params.applicationId || '').trim();
      const body = (req.validatedBody ?? req.body) as InvestmentDepositRequest;
      const result = await investmentDepositService.depositFromWallet(applicationId, body);

      res.status(result.duplicate ? 200 : 201).json({
        success: true,
        message: result.duplicate
          ? 'Investment deposit already processed.'
          : 'Investment funded successfully.',
        data: {
          type: 'deposit',
          deposit: result.deposit,
          duplicate: result.duplicate
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

      console.error('Error depositing to investment account:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fund investment'
      });
    }
  };
}

export default new InvestmentAccountController();
