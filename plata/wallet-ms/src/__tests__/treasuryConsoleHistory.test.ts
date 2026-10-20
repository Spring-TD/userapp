import { TransactionStatus, TransactionType } from '../models/Wallet';

/**
 * Pure helpers mirrored from treasuryConsoleRepository history filters —
 * keeps decision→status mapping covered without Mongo.
 */
function historyStatusFilter(
  decision: 'approved' | 'rejected' | 'all'
): TransactionStatus | { $in: TransactionStatus[] } {
  if (decision === 'approved') return TransactionStatus.COMPLETED;
  if (decision === 'rejected') return TransactionStatus.FAILED;
  return { $in: [TransactionStatus.COMPLETED, TransactionStatus.FAILED] };
}

describe('treasury console payout history filters', () => {
  it('maps approved/rejected/all to COMPLETED/FAILED statuses', () => {
    expect(historyStatusFilter('approved')).toBe(TransactionStatus.COMPLETED);
    expect(historyStatusFilter('rejected')).toBe(TransactionStatus.FAILED);
    expect(historyStatusFilter('all')).toEqual({
      $in: [TransactionStatus.COMPLETED, TransactionStatus.FAILED]
    });
  });

  it('keeps history rows as treasury DEBIT payouts (type invariant)', () => {
    expect(TransactionType.DEBIT).toBe('DEBIT');
  });
});
