/**
 * Best-effort extraction of monetary amounts from `UserProductApplication.contractSnapshot`.
 * Shapes vary by client; we use a fixed precedence (first positive wins).
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

function fromLoanAmountField(loanAmount: unknown): number {
  const o = asRecord(loanAmount);
  if (!o) {
    return 0;
  }
  return firstPositive(o.max, o.min, o.amount, o.value);
}

/**
 * Single principal figure for one application (major currency units).
 */
export function extractPrincipalFromContractSnapshot(
  snapshot: Record<string, unknown> | undefined
): number {
  if (!snapshot) {
    return 0;
  }

  const s = snapshot;
  const direct = firstPositive(
    s.requestedAmount,
    s.requestedPrincipal,
    s.approvedPrincipal,
    s.principalAmount,
    s.principal,
    s.loanAmount,
    s.amount,
    s.applicationAmount
  );
  if (direct > 0) {
    return direct;
  }

  const effective = asRecord(s.effective);
  if (effective) {
    const fromEff = firstPositive(
      effective.requestedAmount,
      effective.approvedPrincipal,
      effective.principalAmount,
      effective.principal,
      effective.amount
    );
    if (fromEff > 0) {
      return fromEff;
    }
    const effStruct = asRecord(effective.structure);
    if (effStruct) {
      const fromStruct = fromLoanAmountField(effStruct.loanAmount);
      if (fromStruct > 0) {
        return fromStruct;
      }
    }
  }

  const structure = asRecord(s.structure);
  if (structure) {
    const fromStruct = fromLoanAmountField(structure.loanAmount);
    if (fromStruct > 0) {
      return fromStruct;
    }
  }

  return 0;
}

/**
 * Optional cumulative repayment stored on the snapshot (until ledger integration).
 */
export function extractRepaymentFromContractSnapshot(
  snapshot: Record<string, unknown> | undefined
): number {
  if (!snapshot) {
    return 0;
  }

  const s = snapshot;
  const direct = firstPositive(
    s.totalRepaid,
    s.repaymentAmount,
    s.cumulativeRepayment,
    s.repaidAmount,
    s.amountRepaid
  );
  if (direct > 0) {
    return direct;
  }

  const effective = asRecord(s.effective);
  if (effective) {
    const fromEff = firstPositive(
      effective.totalRepaid,
      effective.repaymentAmount,
      effective.cumulativeRepayment,
      effective.repaidAmount
    );
    if (fromEff > 0) {
      return fromEff;
    }
  }

  const structure = asRecord(s.structure);
  if (structure) {
    const fromStruct = firstPositive(structure.totalRepaid, structure.repaymentAmount);
    if (fromStruct > 0) {
      return fromStruct;
    }
  }

  return 0;
}

export function isLendingRequestedPipelineStatus(
  loanWorkflowStatus: string | null | undefined
): boolean {
  if (loanWorkflowStatus == null || loanWorkflowStatus === '') {
    return true;
  }
  return loanWorkflowStatus === 'requested' || loanWorkflowStatus === 'under_review';
}
