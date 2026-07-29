const TERMINAL_FUSPAY_VERIFICATION_STATUSES = new Set([
  'completed',
  'complete',
  'approved',
  'verified',
  'success',
  'successful',
  'failed',
  'failure',
  'rejected',
  'declined',
  'expired',
  'cancelled',
  'canceled',
  'closed'
]);

export type FuspayVerificationSnapshot = {
  verificationId?: string;
  verificationUrl?: string;
  status?: string;
  overallStatus?: string;
};

function normalizeStatus(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isTerminalStatus(value: unknown): boolean {
  const normalized = normalizeStatus(value);
  return normalized.length > 0 && TERMINAL_FUSPAY_VERIFICATION_STATUSES.has(normalized);
}

/**
 * True when the user already has a Fuspay verification link that is still in progress.
 * Used to avoid charging the merchant again for the same active session.
 */
export function hasActivePendingFuspayVerification(
  verification: FuspayVerificationSnapshot | null | undefined
): boolean {
  if (!verification) {
    return false;
  }

  const verificationId = typeof verification.verificationId === 'string' ? verification.verificationId.trim() : '';
  const verificationUrl =
    typeof verification.verificationUrl === 'string' ? verification.verificationUrl.trim() : '';

  if (!verificationId || !verificationUrl) {
    return false;
  }

  if (isTerminalStatus(verification.status) || isTerminalStatus(verification.overallStatus)) {
    return false;
  }

  return true;
}
