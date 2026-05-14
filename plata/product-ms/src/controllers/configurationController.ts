import { Request, Response } from 'express';
import { ApiError } from '../middleware/errorHandler';
import {
  MORATORIUM_OPTIONS,
  MORATORIUM_DURATION_OPTIONS,
  LOAN_MORATORIUM_TYPE_OPTIONS,
  REPAYMENT_CYCLE_OPTIONS,
  LOAN_TENURE_OPTIONS,
  AMORTIZATION_OPTIONS,
  LOAN_INTEREST_METHOD_OPTIONS,
  SAVINGS_INTEREST_METHOD_OPTIONS,
  WITHDRAWAL_FLEXIBILITY_OPTIONS,
  LOAN_REPAYMENT_WORKFLOW_OPTIONS,
  LOAN_EQUITY_REQUIREMENT_OPTIONS,
  LOAN_REPAYMENT_SCHEDULE_OPTIONS,
  LOAN_ACCEPTABLE_NPA_OPTIONS,
  LOAN_OTHER_REQUIREMENT_CONTENT_TYPE_OPTIONS,
  LOAN_OTHER_REQUIREMENT_TYPE_OPTIONS,
  FEE_AND_PENALTY_TYPE_OPTIONS,
  TRIGGER_DURATION_OPTIONS,
  CURRENCY_OPTIONS,
  COLLATERAL_TYPE_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  MORTGAGE_FACILITY_OPTIONS,
  LOAN_SECURITY_REQUIREMENT_OPTIONS,
  COMMODITY_SECURITY_REQUIREMENT_OPTIONS,
  MORTGAGE_SECURITY_REQUIREMENT_OPTIONS,
  COMMODITY_TRADING_CYCLE_OPTIONS,
  COMMODITY_TENURE_OPTIONS,
  INVESTMENT_TRADING_CYCLE_OPTIONS,
  INVESTMENT_TENURE_OPTIONS,
  INVESTMENT_TYPE_OPTIONS,
  SAVINGS_TENURE_OPTIONS,
  SAVINGS_REPAYMENT_CYCLE_OPTIONS,
  SAVINGS_TYPE_OPTIONS
} from '../types/productConfiguration';
import { normalizeProductType } from '../utils/productType';

/**
 * Dropdown/option lists for product admin forms. Map option `value`s into discriminator fields
 * (e.g. LOAN/MORTGAGE `structure`, `about`; SAVINGS/INVESTMENT `about`, `structure`, `feesAndCharges`) via `PUT /api/v1/products/:id`.
 */
export class ConfigurationController {
  getMoratoriumOptions = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: MORATORIUM_OPTIONS
      });
    } catch (error) {
      console.error('Error in getMoratoriumOptions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getMoratoriumDurationOptions = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: MORATORIUM_DURATION_OPTIONS
      });
    } catch (error) {
      console.error('Error in getMoratoriumDurationOptions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getMoratoriumTypeOptions = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: LOAN_MORATORIUM_TYPE_OPTIONS
      });
    } catch (error) {
      console.error('Error in getMoratoriumTypeOptions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getRepaymentCycleOptions = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: REPAYMENT_CYCLE_OPTIONS
      });
    } catch (error) {
      console.error('Error in getRepaymentCycleOptions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getLoanTenureOptions = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: LOAN_TENURE_OPTIONS
      });
    } catch (error) {
      console.error('Error in getLoanTenureOptions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getAmortizationOptions = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: AMORTIZATION_OPTIONS
      });
    } catch (error) {
      console.error('Error in getAmortizationOptions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getInterestMethodOptions = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: LOAN_INTEREST_METHOD_OPTIONS
      });
    } catch (error) {
      console.error('Error in getInterestMethodOptions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getSavingsInterestMethodOptions = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: SAVINGS_INTEREST_METHOD_OPTIONS
      });
    } catch (error) {
      console.error('Error in getSavingsInterestMethodOptions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getWithdrawalFlexibilityOptions = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: WITHDRAWAL_FLEXIBILITY_OPTIONS
      });
    } catch (error) {
      console.error('Error in getWithdrawalFlexibilityOptions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getRepaymentWorkflowOptions = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: LOAN_REPAYMENT_WORKFLOW_OPTIONS
      });
    } catch (error) {
      console.error('Error in getRepaymentWorkflowOptions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getEquityRequirementOptions = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: LOAN_EQUITY_REQUIREMENT_OPTIONS
      });
    } catch (error) {
      console.error('Error in getEquityRequirementOptions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getRepaymentScheduleOptions = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: LOAN_REPAYMENT_SCHEDULE_OPTIONS
      });
    } catch (error) {
      console.error('Error in getRepaymentScheduleOptions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getAcceptableNpaOptions = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: LOAN_ACCEPTABLE_NPA_OPTIONS
      });
    } catch (error) {
      console.error('Error in getAcceptableNpaOptions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getLoanOtherRequirementContentTypeOptions = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: LOAN_OTHER_REQUIREMENT_CONTENT_TYPE_OPTIONS
      });
    } catch (error) {
      console.error('Error in getLoanOtherRequirementContentTypeOptions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getLoanOtherRequirementTypeOptions = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: LOAN_OTHER_REQUIREMENT_TYPE_OPTIONS
      });
    } catch (error) {
      console.error('Error in getLoanOtherRequirementTypeOptions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getCurrencyOptions = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: CURRENCY_OPTIONS
      });
    } catch (error) {
      console.error('Error in getCurrencyOptions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getFeeTypeOptions = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: FEE_AND_PENALTY_TYPE_OPTIONS
      });
    } catch (error) {
      console.error('Error in getFeeTypeOptions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getTriggerDurationOptions = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: TRIGGER_DURATION_OPTIONS
      });
    } catch (error) {
      console.error('Error in getTriggerDurationOptions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getCollateralTypeOptions = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: COLLATERAL_TYPE_OPTIONS
      });
    } catch (error) {
      console.error('Error in getCollateralTypeOptions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getPropertyTypeOptions = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: PROPERTY_TYPE_OPTIONS
      });
    } catch (error) {
      console.error('Error in getPropertyTypeOptions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getMortgageFacilityOptions = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: MORTGAGE_FACILITY_OPTIONS
      });
    } catch (error) {
      console.error('Error in getMortgageFacilityOptions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getCommodityTradingCycleOptions = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: COMMODITY_TRADING_CYCLE_OPTIONS
      });
    } catch (error) {
      console.error('Error in getCommodityTradingCycleOptions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getCommodityTenureOptions = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: COMMODITY_TENURE_OPTIONS
      });
    } catch (error) {
      console.error('Error in getCommodityTenureOptions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getInvestmentTradingCycleOptions = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: INVESTMENT_TRADING_CYCLE_OPTIONS
      });
    } catch (error) {
      console.error('Error in getInvestmentTradingCycleOptions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getInvestmentTenureOptions = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: INVESTMENT_TENURE_OPTIONS
      });
    } catch (error) {
      console.error('Error in getInvestmentTenureOptions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getInvestmentTypeOptions = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: INVESTMENT_TYPE_OPTIONS
      });
    } catch (error) {
      console.error('Error in getInvestmentTypeOptions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getSavingsTenureOptions = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: SAVINGS_TENURE_OPTIONS
      });
    } catch (error) {
      console.error('Error in getSavingsTenureOptions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getSavingsTypeOptions = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: SAVINGS_TYPE_OPTIONS
      });
    } catch (error) {
      console.error('Error in getSavingsTypeOptions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getSavingsRepaymentCycleOptions = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: SAVINGS_REPAYMENT_CYCLE_OPTIONS
      });
    } catch (error) {
      console.error('Error in getSavingsRepaymentCycleOptions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getSecurityRequirementOptions = async (req: Request, res: Response): Promise<void> => {
    try {
      const productTypeRaw = (req.query.productType as string)?.trim();
      const map: Record<string, Array<{ value: string; label: string }>> = {
        LOAN: LOAN_SECURITY_REQUIREMENT_OPTIONS,
        COMMODITY: COMMODITY_SECURITY_REQUIREMENT_OPTIONS,
        MORTGAGE: MORTGAGE_SECURITY_REQUIREMENT_OPTIONS,
        INVESTMENT: COMMODITY_SECURITY_REQUIREMENT_OPTIONS
      };
      let productType: string;
      try {
        productType = normalizeProductType(productTypeRaw ?? '');
      } catch {
        productType = '';
      }
      if (!productTypeRaw || !map[productType]) {
        throw new ApiError(
          400,
          'Query parameter productType is required and must be one of: LOAN, COMMODITY, MORTGAGE, INVESTMENT (or legacy Loan, Commodity, Mortgage, Investment)'
        );
      }
      res.json({
        success: true,
        data: map[productType]
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      console.error('Error in getSecurityRequirementOptions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
}
