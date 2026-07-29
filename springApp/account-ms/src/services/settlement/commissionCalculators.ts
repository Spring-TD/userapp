export type MerchantPricingInput = {
  springTDFee?: number;
  serviceFee?: number;
  markupRate?: number;
};

export type LoanChargeInput = {
  loanPrincipal: number;
  equityContribution?: number;
  merchantRatePercent: number;
};

export type LoanChargeResult = {
  merchantAmount: number;
  ofiAmount: number;
  loanFeeComponent: number;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function resolveMerchantCommissionRatePercent(pricing?: MerchantPricingInput): number {
  if (pricing?.springTDFee != null && Number.isFinite(pricing.springTDFee) && pricing.springTDFee >= 0) {
    return pricing.springTDFee;
  }
  if (pricing?.serviceFee != null && Number.isFinite(pricing.serviceFee) && pricing.serviceFee >= 0) {
    return pricing.serviceFee;
  }
  const fallback = Number(process.env.DEFAULT_MERCHANT_COMMISSION_RATE_PERCENT || 1);
  return Number.isFinite(fallback) && fallback >= 0 ? fallback : 1;
}

export function calculateCommodityCharge(basePrice: number, merchantRatePercent: number): number {
  if (!Number.isFinite(basePrice) || basePrice <= 0) return 0;
  return roundMoney(basePrice * (merchantRatePercent / 100));
}

export function calculateLoanCharge(input: LoanChargeInput): LoanChargeResult {
  const loanPrincipal = Number(input.loanPrincipal);
  const merchantRatePercent = Number(input.merchantRatePercent);
  if (!Number.isFinite(loanPrincipal) || loanPrincipal <= 0) {
    return { merchantAmount: 0, ofiAmount: 0, loanFeeComponent: 0 };
  }
  const loanFeeComponent = roundMoney(loanPrincipal * (merchantRatePercent / 100));
  const equity = Number(input.equityContribution ?? 0);
  if (Number.isFinite(equity) && equity > 0) {
    const merchantAmount = roundMoney(Math.max(0, equity - loanFeeComponent));
    const ofiAmount = roundMoney(Math.max(0, loanFeeComponent));
    return { merchantAmount, ofiAmount, loanFeeComponent };
  }
  return { merchantAmount: loanFeeComponent, ofiAmount: 0, loanFeeComponent };
}

export function calculateMortgageCharge(input: LoanChargeInput): LoanChargeResult {
  return calculateLoanCharge(input);
}

export function calculateAccountMaintenanceCharge(): number {
  const raw = Number(process.env.ACCOUNT_MAINTENANCE_FEE_NGN ?? 100);
  return Number.isFinite(raw) && raw > 0 ? roundMoney(raw) : 100;
}

export function calculateInvestmentCharge(principal: number, merchantExtraRatePercent: number): number {
  if (!Number.isFinite(principal) || principal <= 0) return 0;
  return roundMoney(principal * (merchantExtraRatePercent / 100));
}

export type TransactionChargeInput = {
  amount: number;
  merchantCommission?: number;
  fixedFee?: number;
  percentRate?: number;
};

export function calculateTransactionCharge(input: TransactionChargeInput): number {
  if (input.merchantCommission != null && Number.isFinite(input.merchantCommission) && input.merchantCommission > 0) {
    return roundMoney(input.merchantCommission);
  }
  if (input.fixedFee != null && Number.isFinite(input.fixedFee) && input.fixedFee > 0) {
    return roundMoney(input.fixedFee);
  }
  if (input.percentRate != null && Number.isFinite(input.percentRate) && input.amount > 0) {
    return roundMoney(input.amount * (input.percentRate / 100));
  }
  return 0;
}

export function calculateOtherServiceCharge(input: TransactionChargeInput): number {
  return calculateTransactionCharge(input);
}

export function resolveEquityContributionFromSnapshot(snapshot: Record<string, unknown> | undefined): number | undefined {
  if (!snapshot || typeof snapshot !== 'object') return undefined;
  const structure = snapshot.structure as Record<string, unknown> | undefined;
  const direct =
    snapshot.equityContribution ??
    snapshot.equity_contribution ??
    structure?.equityContribution ??
    structure?.equity_contribution;
  if (typeof direct === 'number' && Number.isFinite(direct) && direct > 0) {
    return direct;
  }
  const propertyValue = Number(snapshot.propertyValue ?? snapshot.property_value ?? structure?.propertyValue);
  const equityPercent = Number(
    structure?.equityContribution ?? structure?.equityRequirement ?? snapshot.equityContribution
  );
  if (Number.isFinite(propertyValue) && propertyValue > 0 && Number.isFinite(equityPercent) && equityPercent > 0) {
    if (equityPercent <= 100) {
      return roundMoney(propertyValue * (equityPercent / 100));
    }
    return roundMoney(equityPercent);
  }
  return undefined;
}
