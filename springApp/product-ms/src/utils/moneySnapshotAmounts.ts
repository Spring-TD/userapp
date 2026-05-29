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
  for (const value of values) {
    const parsed = toNonNegativeNumber(value);
    if (parsed != null && parsed > 0) {
      return parsed;
    }
  }
  return 0;
}

function fromAmountRange(value: unknown): number {
  const record = asRecord(value);
  if (!record) {
    return 0;
  }
  return firstPositive(record.max, record.min, record.amount, record.value, record.balance);
}

export function extractPrincipalFromSnapshot(snapshot: Record<string, unknown> | undefined): number {
  if (!snapshot) {
    return 0;
  }

  const direct = firstPositive(
    snapshot.requestedAmount,
    snapshot.requestedPrincipal,
    snapshot.approvedPrincipal,
    snapshot.principalAmount,
    snapshot.principal,
    snapshot.loanAmount,
    snapshot.amount,
    snapshot.applicationAmount
  );
  if (direct > 0) {
    return direct;
  }

  const effective = asRecord(snapshot.effective);
  const effectiveStructure = asRecord(effective?.structure);
  const structure = asRecord(snapshot.structure);
  return firstPositive(
    effective?.requestedAmount,
    effective?.approvedPrincipal,
    effective?.principalAmount,
    effective?.principal,
    effective?.amount,
    fromAmountRange(effectiveStructure?.loanAmount),
    fromAmountRange(structure?.loanAmount)
  );
}

export function extractRepaymentFromSnapshot(snapshot: Record<string, unknown> | undefined): number {
  if (!snapshot) {
    return 0;
  }

  const effective = asRecord(snapshot.effective);
  const structure = asRecord(snapshot.structure);
  return firstPositive(
    snapshot.totalRepaid,
    snapshot.repaymentAmount,
    snapshot.cumulativeRepayment,
    snapshot.repaidAmount,
    snapshot.amountRepaid,
    effective?.totalRepaid,
    effective?.repaymentAmount,
    effective?.cumulativeRepayment,
    effective?.repaidAmount,
    structure?.totalRepaid,
    structure?.repaymentAmount
  );
}

export function extractDepositBalanceFromSnapshot(snapshot: Record<string, unknown> | undefined): number {
  if (!snapshot) {
    return 0;
  }

  const effective = asRecord(snapshot.effective);
  const effectiveStructure = asRecord(effective?.structure);
  const structure = asRecord(snapshot.structure);
  return firstPositive(
    snapshot.currentBalance,
    snapshot.accountBalance,
    snapshot.savingsBalance,
    snapshot.depositBalance,
    snapshot.totalDeposits,
    snapshot.balance,
    snapshot.principal,
    snapshot.portfolioValue,
    snapshot.investmentBalance,
    snapshot.amount,
    effective?.currentBalance,
    effective?.accountBalance,
    effective?.balance,
    effective?.principal,
    effective?.portfolioValue,
    fromAmountRange(effectiveStructure?.savingsAmount),
    fromAmountRange(effectiveStructure?.investmentAmount),
    fromAmountRange(structure?.savingsAmount),
    fromAmountRange(structure?.investmentAmount)
  );
}

export function extractInterestPaidFromSnapshot(snapshot: Record<string, unknown> | undefined): number {
  if (!snapshot) {
    return 0;
  }

  const effective = asRecord(snapshot.effective);
  const structure = asRecord(snapshot.structure);
  return firstPositive(
    snapshot.interestPaid,
    snapshot.totalInterestPaid,
    snapshot.cumulativeInterestPaid,
    snapshot.interestPaidOut,
    snapshot.interestCreditedToCustomer,
    effective?.interestPaid,
    effective?.totalInterestPaid,
    effective?.cumulativeInterestPaid,
    structure?.interestPaid,
    structure?.totalInterestPaid
  );
}

export function extractWithdrawalsFromSnapshot(snapshot: Record<string, unknown> | undefined): number {
  if (!snapshot) {
    return 0;
  }

  const effective = asRecord(snapshot.effective);
  const structure = asRecord(snapshot.structure);
  return firstPositive(
    snapshot.totalWithdrawals,
    snapshot.withdrawals,
    snapshot.cumulativeWithdrawals,
    snapshot.amountWithdrawn,
    snapshot.withdrawnAmount,
    effective?.totalWithdrawals,
    effective?.cumulativeWithdrawals,
    effective?.amountWithdrawn,
    structure?.totalWithdrawals,
    structure?.withdrawals
  );
}

export function extractInventoryFromSnapshot(snapshot: Record<string, unknown> | undefined): number {
  if (!snapshot) {
    return 0;
  }

  const effective = asRecord(snapshot.effective);
  const structure = asRecord(snapshot.structure);
  return firstPositive(
    snapshot.inventoryAmount,
    snapshot.inventoryValue,
    snapshot.totalInventoryValue,
    snapshot.stockValue,
    snapshot.carryingValue,
    effective?.inventoryAmount,
    effective?.inventoryValue,
    effective?.totalInventoryValue,
    effective?.stockValue,
    structure?.inventoryAmount,
    structure?.inventoryValue,
    structure?.totalInventoryValue
  );
}

export function extractSalesFromSnapshot(snapshot: Record<string, unknown> | undefined): number {
  if (!snapshot) {
    return 0;
  }

  const effective = asRecord(snapshot.effective);
  const structure = asRecord(snapshot.structure);
  return firstPositive(
    snapshot.salesAmount,
    snapshot.totalSales,
    snapshot.grossSales,
    snapshot.grossIncome,
    snapshot.revenue,
    effective?.salesAmount,
    effective?.totalSales,
    effective?.grossSales,
    effective?.grossIncome,
    effective?.revenue,
    structure?.salesAmount,
    structure?.totalSales,
    structure?.grossSales,
    structure?.revenue
  );
}

export function extractCostOfGoodsSoldFromSnapshot(snapshot: Record<string, unknown> | undefined): number {
  if (!snapshot) {
    return 0;
  }

  const effective = asRecord(snapshot.effective);
  const structure = asRecord(snapshot.structure);
  return firstPositive(
    snapshot.costOfGoodsSold,
    snapshot.cogs,
    snapshot.totalCOGS,
    snapshot.totalCostOfGoodsSold,
    snapshot.costSpentOnSoldGoods,
    effective?.costOfGoodsSold,
    effective?.cogs,
    effective?.totalCOGS,
    effective?.totalCostOfGoodsSold,
    structure?.costOfGoodsSold,
    structure?.cogs,
    structure?.totalCOGS
  );
}
