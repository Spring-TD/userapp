export type MerchantPricingInput = {
  springTDFee?: number;
  serviceFee?: number;
  markupRate?: number;
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

export function calculateAccountMaintenanceCharge(): number {
  const raw = Number(process.env.ACCOUNT_MAINTENANCE_FEE_NGN ?? 100);
  return Number.isFinite(raw) && raw > 0 ? roundMoney(raw) : 100;
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
