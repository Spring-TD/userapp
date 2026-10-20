import type { UserProductApplication } from '../types/userProductApplication';

/** Resolve approved facility amount from application fields / snapshot. */
export function resolveLoanApprovedAmount(
  application: UserProductApplication,
  override?: number
): number | undefined {
  if (typeof override === 'number' && Number.isFinite(override) && override > 0) {
    return override;
  }
  if (
    typeof application.approvedLoanAmount === 'number' &&
    Number.isFinite(application.approvedLoanAmount) &&
    application.approvedLoanAmount > 0
  ) {
    return application.approvedLoanAmount;
  }
  const snapshot = application.contractSnapshot ?? {};
  const candidates = [
    snapshot.approvedAmount,
    snapshot.approvedLoanAmount,
    snapshot.loanAmount,
    snapshot.principal,
    snapshot.amount
  ];
  for (const value of candidates) {
    const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    if (Number.isFinite(n) && n > 0) {
      return n;
    }
  }
  return undefined;
}
