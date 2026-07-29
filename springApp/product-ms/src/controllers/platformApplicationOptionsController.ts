import { Request, Response } from 'express';
import { PLATFORM_APPLICATION_FIELD_DEFINITIONS } from '../types/platformApplicationFields';
import { LOAN_REASON_OPTIONS } from '../types/loanReason';
import { MARITAL_STATUS_OPTIONS } from '../types/maritalStatus';
import { REPAYMENT_SOURCE_OPTIONS } from '../types/repaymentSource';

export class PlatformApplicationOptionsController {
  getPlatformApplicationFieldOptions = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: PLATFORM_APPLICATION_FIELD_DEFINITIONS
      });
    } catch (error) {
      console.error('Error in getPlatformApplicationFieldOptions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getRepaymentSourceOptions = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: REPAYMENT_SOURCE_OPTIONS
      });
    } catch (error) {
      console.error('Error in getRepaymentSourceOptions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getMaritalStatusOptions = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: MARITAL_STATUS_OPTIONS
      });
    } catch (error) {
      console.error('Error in getMaritalStatusOptions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getLoanReasonOptions = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: LOAN_REASON_OPTIONS
      });
    } catch (error) {
      console.error('Error in getLoanReasonOptions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
}

export default new PlatformApplicationOptionsController();
