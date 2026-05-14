import { Request, Response } from 'express';
import { UserProductApplicationService } from '../services/userProductApplicationService';
import { ApiError } from '../middleware/errorHandler';
import type {
  CreateUserProductApplicationRequest,
  ListLoanWorkflowQuery,
  ListUserProductApplicationsQuery,
  LoanWorkflowStatus
} from '../types/userProductApplication';

export class UserProductApplicationController {
  constructor(private readonly applicationService: UserProductApplicationService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.validatedBody as CreateUserProductApplicationRequest;
      const data = await this.applicationService.create(body);
      res.status(201).json({
        success: true,
        message: 'User product application snapshot created',
        data
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      console.error('Error in create user product application:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const q = req.validatedQuery as unknown as ListUserProductApplicationsQuery;
      const result = await this.applicationService.list(q);
      res.status(200).json({
        success: true,
        data: result.items,
        meta: {
          total: result.total,
          limit: q.limit,
          skip: q.skip
        }
      });
    } catch (error) {
      console.error('Error in list user product applications:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { applicationId } = req.params;
      const data = await this.applicationService.getById(applicationId);
      if (!data) {
        res.status(404).json({
          success: false,
          error: 'Application not found'
        });
        return;
      }
      res.status(200).json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Error in get user product application:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /** GET .../applications/me/loan-workflow — JWT merchant must match snapshot `merchantId` (product creator). */
  listLoanWorkflow = async (req: Request, res: Response): Promise<void> => {
    try {
      const creatorId = req.authUser!.merchantAccountId;
      const q = req.validatedQuery as unknown as ListLoanWorkflowQuery;
      const result = await this.applicationService.listLoanWorkflowForCreator(creatorId, q);
      res.status(200).json({
        success: true,
        data: result.items,
        meta: {
          total: result.total,
          limit: q.limit,
          skip: q.skip
        }
      });
    } catch (error) {
      console.error('Error in list loan workflow:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  patchLoanWorkflow = async (req: Request, res: Response): Promise<void> => {
    try {
      const creatorId = req.authUser!.merchantAccountId;
      const { applicationId } = req.params;
      const { loanWorkflowStatus } = req.validatedBody as { loanWorkflowStatus: LoanWorkflowStatus };
      const data = await this.applicationService.setLoanWorkflowStatus(
        applicationId,
        creatorId,
        loanWorkflowStatus
      );
      res.status(200).json({
        success: true,
        message: 'Loan workflow status updated',
        data
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      console.error('Error in patch loan workflow:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
}
