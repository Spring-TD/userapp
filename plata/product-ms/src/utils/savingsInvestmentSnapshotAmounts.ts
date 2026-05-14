/**
 * Best-effort extraction from `UserProductApplication.contractSnapshot` for SAVINGS / INVESTMENT rows.
 * Field names vary by client; first positive match wins (major currency units).
 */

function toNonNegativeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseFloat(value.replace(/,/g, ''));
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function firstPositive(...values: unknown[]): number {
  for (const v of values) {
    const n = toNonNegativeNumber(v);
    if (n != null && n > 0) {
      return n;
    }
  }
  return 0;
}

function fromSavingsAmountField(savingsAmount: unknown): number {
  const o = asRecord(savingsAmount);
  if (!o) {
    return 0;
  }
  return firstPositive(o.max, o.min, o.amount, o.value, o.balance);
}

function fromInvestmentAmountField(investmentAmount: unknown): number {
  const o = asRecord(investmentAmount);
  if (!o) {
    return 0;
  }
  return firstPositive(o.max, o.min, o.amount, o.value, o.balance);
}

/** Current balance / deposits held (one application ≈ one account in snapshot terms). */
export function extractDepositBalanceFromContractSnapshot(
  snapshot: Record<string, unknown> | undefined
): number {
  if (!snapshot) {
    return 0;
  }

  const s = snapshot;
  const direct = firstPositive(
    s.currentBalance,
    s.accountBalance,
    s.savingsBalance,
    s.depositBalance,
    s.totalDeposits,
    s.balance,
    s.principal,
    s.portfolioValue,
    s.investmentBalance,
    s.amount
  );
  if (direct > 0) {
    return direct;
  }

  const effective = asRecord(s.effective);
  if (effective) {
    const fromEff = firstPositive(
      effective.currentBalance,
      effective.accountBalance,
      effective.balance,
      effective.principal,
      effective.portfolioValue
    );
    if (fromEff > 0) {
      return fromEff;
    }
    const effStruct = asRecord(effective.structure);
    if (effStruct) {
      const a = fromSavingsAmountField(effStruct.savingsAmount);
      if (a > 0) {
        return a;
      }
      const inv = fromInvestmentAmountField(effStruct.investmentAmount);
      if (inv > 0) {
        return inv;
      }
    }
  }

  const structure = asRecord(s.structure);
  if (structure) {
    const a = fromSavingsAmountField(structure.savingsAmount);
    if (a > 0) {
      return a;
    }
    const inv = fromInvestmentAmountField(structure.investmentAmount);
    if (inv > 0) {
      return inv;
    }
  }

  return 0;
}

/** Cumulative interest paid out to the customer (institution cost). */
export function extractInterestPaidFromContractSnapshot(
  snapshot: Record<string, unknown> | undefined
): number {
  if (!snapshot) {
    return 0;
  }

  const s = snapshot;
  const direct = firstPositive(
    s.interestPaid,
    s.totalInterestPaid,
    s.cumulativeInterestPaid,
    s.interestPaidOut,
    s.interestCreditedToCustomer
  );
  if (direct > 0) {
    return direct;
  }

  const effective = asRecord(s.effective);
  if (effective) {
    const fromEff = firstPositive(
      effective.interestPaid,
      effective.totalInterestPaid,
      effective.cumulativeInterestPaid
    );
    if (fromEff > 0) {
      return fromEff;
    }
  }

  const structure = asRecord(s.structure);
  if (structure) {
    const fromStruct = firstPositive(structure.interestPaid, structure.totalInterestPaid);
    if (fromStruct > 0) {
      return fromStruct;
    }
  }

  return 0;
}

/** Cumulative withdrawals from the account. */
export function extractWithdrawalsFromContractSnapshot(
  snapshot: Record<string, unknown> | undefined
): number {
  if (!snapshot) {
    return 0;
  }

  const s = snapshot;
  const direct = firstPositive(
    s.totalWithdrawals,
    s.withdrawals,
    s.cumulativeWithdrawals,
    s.amountWithdrawn,
    s.withdrawnAmount
  );
  if (direct > 0) {
    return direct;
  }

  const effective = asRecord(s.effective);
  if (effective) {
    const fromEff = firstPositive(
      effective.totalWithdrawals,
      effective.cumulativeWithdrawals,
      effective.amountWithdrawn
    );
    if (fromEff > 0) {
      return fromEff;
    }
  }

  const structure = asRecord(s.structure);
  if (structure) {
    const fromStruct = firstPositive(structure.totalWithdrawals, structure.withdrawals);
    if (fromStruct > 0) {
      return fromStruct;
    }
  }

  return 0;
}
