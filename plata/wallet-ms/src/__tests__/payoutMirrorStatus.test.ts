import { payoutMirrorDescriptionStatus, resolvePayoutMirrorStatus } from '../utils/payoutMirrorStatus';

describe('payoutMirrorStatus', () => {
  it('treats completed wallet debit as completed when PayOnUs is still PENDING', () => {
    expect(
      resolvePayoutMirrorStatus({
        providerStatus: 'PENDING',
        walletTransactionStatus: 'COMPLETED'
      })
    ).toBe('completed');
  });

  it('marks explicit PayOnUs success as completed', () => {
    expect(resolvePayoutMirrorStatus({ providerStatus: 'SUCCESSFUL' })).toBe('completed');
  });

  it('marks reversed payouts as failed', () => {
    expect(
      resolvePayoutMirrorStatus({
        providerStatus: 'PENDING',
        walletTransactionStatus: 'COMPLETED',
        reversed: true
      })
    ).toBe('failed');
  });

  it('uses SUCCESSFUL label when mirror status is completed', () => {
    expect(payoutMirrorDescriptionStatus('PENDING', 'completed')).toBe('SUCCESSFUL');
  });
});
