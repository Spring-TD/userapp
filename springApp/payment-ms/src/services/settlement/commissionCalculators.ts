function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
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

export function defaultTransactionPercentRate(): number {
  const raw = Number(process.env.DEFAULT_TRANSACTION_CHARGE_PERCENT || 0);
  return Number.isFinite(raw) && raw >= 0 ? raw : 0;
}

export function defaultTransactionFixedFee(): number {
  const raw = Number(process.env.DEFAULT_TRANSACTION_CHARGE_FIXED_NGN ?? 50);
  return Number.isFinite(raw) && raw >= 0 ? raw : 50;
}
