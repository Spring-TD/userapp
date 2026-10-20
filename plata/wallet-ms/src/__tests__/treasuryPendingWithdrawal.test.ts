import { isTreasuryPendingWithdrawalInput } from '../utils/treasuryPendingWithdrawal';
import { TransactionStatus, TransactionType } from '../models/Wallet';

describe('isTreasuryPendingWithdrawalInput', () => {
  it('matches savings withdrawal category with appId', () => {
    expect(
      isTreasuryPendingWithdrawalInput({
        type: TransactionType.DEBIT,
        status: TransactionStatus.PENDING,
        amount: 10000,
        category: 'SAVINGS_EARLY_WITHDRAWAL',
        metadata: { appId: 'app_1', merchantId: 'merchant_1' }
      })
    ).toBe(true);
  });

  it('matches metadata withdrawalRequest flag', () => {
    expect(
      isTreasuryPendingWithdrawalInput({
        type: TransactionType.DEBIT,
        status: TransactionStatus.PENDING,
        amount: 5000,
        metadata: { appId: 'app_1', productType: 'SAVINGS', withdrawalRequest: true }
      })
    ).toBe(true);
  });

  it('rejects completed debits', () => {
    expect(
      isTreasuryPendingWithdrawalInput({
        type: TransactionType.DEBIT,
        status: TransactionStatus.COMPLETED,
        amount: 5000,
        category: 'SAVINGS_WITHDRAWAL',
        metadata: { appId: 'app_1' }
      })
    ).toBe(false);
  });

  it('rejects without appId', () => {
    expect(
      isTreasuryPendingWithdrawalInput({
        type: TransactionType.DEBIT,
        status: TransactionStatus.PENDING,
        amount: 5000,
        category: 'SAVINGS_WITHDRAWAL'
      })
    ).toBe(false);
  });
});
