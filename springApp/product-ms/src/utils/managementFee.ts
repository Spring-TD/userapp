import type { LoanFeesAndCharges } from '../types/product';
import { ApiError } from '../middleware/errorHandler';

/** Shared name for the default Management Fee fee row (Plata + Spring merchant mark-up). */
export const MANAGEMENT_FEE_NAME = 'Management Fee';

export function isManagementFeeName(name: unknown): boolean {
  return typeof name === 'string' && name.trim().toLowerCase() === MANAGEMENT_FEE_NAME.toLowerCase();
}

function toNonNegativeNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/,/g, '').trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

/**
 * SpringApp offering merchants may only send Management Fee mark-ups.
 * All other feesAndCharges fields / fee names are rejected.
 */
export function sanitizeSpringMerchantFeeAdditions(
  additions?: LoanFeesAndCharges | null
): LoanFeesAndCharges | undefined {
  if (!additions) {
    return undefined;
  }

  if (additions.lateRepayment !== undefined) {
    throw new ApiError(
      400,
      'Spring merchants may only configure Management Fee; late repayment charges cannot be changed'
    );
  }
  if (additions.forcefulWithdrawalPenalties !== undefined) {
    throw new ApiError(
      400,
      'Spring merchants may only configure Management Fee; forceful withdrawal charges cannot be changed'
    );
  }
  if (additions.deductAllChargesOnLoan !== undefined || additions.customerPaysChargesBeforeDisbursement !== undefined) {
    throw new ApiError(
      400,
      'Spring merchants may only configure Management Fee; other feesAndCharges settings cannot be changed'
    );
  }

  const fees = additions.fees ?? [];
  for (const item of fees) {
    if (!isManagementFeeName(item?.name)) {
      const label = typeof item?.name === 'string' && item.name.trim() ? item.name.trim() : 'Unnamed fee';
      throw new ApiError(400, `Spring merchants may only mark up Management Fee; "${label}" is not allowed`);
    }
  }

  if (fees.length === 0) {
    return { fees: [] };
  }

  return {
    fees: fees.map((item) => {
      const numeric = toNonNegativeNumber(item.value);
      if (numeric < 0) {
        throw new ApiError(400, 'Merchant Management Fee addition cannot be negative');
      }
      return {
        name: MANAGEMENT_FEE_NAME,
        feeType: item.feeType,
        value: String(numeric)
      };
    })
  };
}
