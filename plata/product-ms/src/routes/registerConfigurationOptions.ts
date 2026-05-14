import { Router } from 'express';
import { ConfigurationController } from '../controllers/configurationController';

/**
 * Registers GET `/options/*` routes for product admin form dropdowns.
 * Must be mounted before `/:id` on the same router.
 */
export function registerConfigurationOptionsRoutes(router: Router, c: ConfigurationController): void {
  router.get('/options/moratorium', c.getMoratoriumOptions);
  router.get('/options/moratorium-duration', c.getMoratoriumDurationOptions);
  router.get('/options/moratorium-type', c.getMoratoriumTypeOptions);
  router.get('/options/repayment-cycle', c.getRepaymentCycleOptions);
  router.get('/options/repayment-schedule', c.getRepaymentScheduleOptions);
  router.get('/options/equity-requirement', c.getEquityRequirementOptions);
  router.get('/options/acceptable-npa', c.getAcceptableNpaOptions);
  router.get(
    '/options/loan-other-requirement-content-type',
    c.getLoanOtherRequirementContentTypeOptions
  );
  router.get('/options/loan-other-requirement-type', c.getLoanOtherRequirementTypeOptions);
  router.get('/options/loan-tenure', c.getLoanTenureOptions);
  router.get('/options/interest-method', c.getInterestMethodOptions);
  router.get('/options/savings-interest-method', c.getSavingsInterestMethodOptions);
  router.get('/options/withdrawal-flexibility', c.getWithdrawalFlexibilityOptions);
  router.get('/options/repayment-workflow', c.getRepaymentWorkflowOptions);
  router.get('/options/amortization', c.getAmortizationOptions);
  router.get('/options/currency', c.getCurrencyOptions);
  router.get('/options/fee-type', c.getFeeTypeOptions);
  router.get('/options/penalty-type', c.getFeeTypeOptions);
  router.get('/options/trigger-duration', c.getTriggerDurationOptions);
  router.get('/options/collateral-type', c.getCollateralTypeOptions);
  router.get('/options/property-type', c.getPropertyTypeOptions);
  router.get('/options/mortgage-facilities', c.getMortgageFacilityOptions);
  router.get('/options/security-requirements', c.getSecurityRequirementOptions);
  router.get('/options/commodity-trading-cycle', c.getCommodityTradingCycleOptions);
  router.get('/options/commodity-tenure', c.getCommodityTenureOptions);
  router.get('/options/investment-trading-cycle', c.getInvestmentTradingCycleOptions);
  router.get('/options/investment-tenure', c.getInvestmentTenureOptions);
  router.get('/options/investment-type', c.getInvestmentTypeOptions);
  router.get('/options/savings-tenure', c.getSavingsTenureOptions);
  router.get('/options/savings-type', c.getSavingsTypeOptions);
  router.get('/options/savings-repayment-cycle', c.getSavingsRepaymentCycleOptions);
  router.get('/options/savings-deposit-cycle', c.getSavingsRepaymentCycleOptions);
}
