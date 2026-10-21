import * as walletRepo from '../repositories/walletRepository';
import { applyWalletDelta } from '../utils/walletBalanceAdjust';

jest.mock('../repositories/walletRepository', () => ({
  adjustWalletBalance: jest.fn()
}));

const mockedRepo = walletRepo as jest.Mocked<typeof walletRepo>;

describe('applyWalletDelta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns wallet snapshot from atomic adjust', async () => {
    mockedRepo.adjustWalletBalance.mockResolvedValue({
      wallet: {
        id: 'w1',
        mainBalance: 250_000,
        ledgerBalance: 250_000,
        currency: 'NGN',
        status: 'ACTIVE',
        walletType: 'MERCHANT',
        merchantId: 'm1',
        merchantWalletType: 'REPAYMENT',
        name: 'Repayment',
        createdAt: new Date(),
        updatedAt: new Date()
      } as never,
      balanceBefore: 0,
      balanceAfter: 250_000
    });

    const result = await applyWalletDelta('w1', 250_000);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.balanceBefore).toBe(0);
      expect(result.balanceAfter).toBe(250_000);
    }
    expect(mockedRepo.adjustWalletBalance).toHaveBeenCalledWith('w1', {
      mainDelta: 250_000,
      ledgerDelta: 250_000
    });
  });

  it('maps insufficient funds from repo layer', async () => {
    mockedRepo.adjustWalletBalance.mockResolvedValue({ insufficientFunds: true });

    const result = await applyWalletDelta('w1', -100);

    expect(result).toEqual({ ok: false, insufficientFunds: true });
  });
});
