/** Map PayOnUs / wallet payout status strings to mirror status for create-app-ms. */
export type PayoutMirrorStatus = 'completed' | 'pending' | 'failed';

function normalizeLifecycle(status?: string): string {
  const normalized = (status || '').trim().toUpperCase();
  if (!normalized) return 'UNKNOWN';
  if (['SUCCESSFUL', 'SUCCESS', 'COMPLETED', 'PAID', 'SETTLED', 'APPROVED'].includes(normalized)) {
    return 'SUCCESSFUL';
  }
  if (['FAILED', 'FAILURE', 'REJECTED', 'DECLINED', 'ERROR'].includes(normalized)) {
    return 'FAILED';
  }
  if (['REVERSED', 'REVERSAL', 'REFUNDED', 'RETURNED', 'CANCELLED', 'CANCELED'].includes(normalized)) {
    return 'REVERSED';
  }
  if (['PROCESSING', 'IN_PROGRESS', 'PENDING_APPROVAL'].includes(normalized)) {
    return 'PROCESSING';
  }
  if (['PENDING', 'INITIATED', 'QUEUED', 'NEW'].includes(normalized)) {
    return 'PENDING';
  }
  return 'UNKNOWN';
}

/**
 * Resolve merchant-dashboard transaction status for a user wallet payout.
 * A COMPLETED wallet debit means funds left the wallet — show Completed even when
 * PayOnUs provider status is still PENDING (in-flight bank settlement).
 */
export function resolvePayoutMirrorStatus(input: {
  providerStatus?: string;
  payoutStatus?: string;
  walletTransactionStatus?: string;
  reversed?: boolean;
}): PayoutMirrorStatus {
  if (input.reversed) return 'failed';

  const lifecycle = normalizeLifecycle(input.payoutStatus || input.providerStatus);
  if (lifecycle === 'FAILED' || lifecycle === 'REVERSED') return 'failed';
  if (lifecycle === 'SUCCESSFUL') return 'completed';

  const walletStatus = (input.walletTransactionStatus || '').trim().toUpperCase();
  if (walletStatus === 'COMPLETED') return 'completed';
  if (walletStatus === 'FAILED' || walletStatus === 'CANCELLED') return 'failed';

  if (lifecycle === 'PENDING' || lifecycle === 'PROCESSING') return 'pending';
  return 'completed';
}

export function payoutMirrorDescriptionStatus(
  providerStatus: string | undefined,
  mirrorStatus: PayoutMirrorStatus
): string {
  if (mirrorStatus === 'completed') return 'SUCCESSFUL';
  if (mirrorStatus === 'failed') return (providerStatus || 'FAILED').toUpperCase();
  return (providerStatus || 'PENDING').toUpperCase();
}
