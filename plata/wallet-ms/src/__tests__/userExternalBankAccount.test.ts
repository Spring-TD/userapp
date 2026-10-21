import { UserExternalBankAccountService } from '../services/userExternalBankAccountService';
import { db } from '../db/database';
import { nameEnquiry } from '../services/payonusNubanClient';
import { WalletService } from '../services/walletService';

jest.mock('../db/database', () => ({
  db: {
    countActiveUserExternalBankAccounts: jest.fn(),
    clearDefaultUserExternalBankAccounts: jest.fn(),
    createUserExternalBankAccount: jest.fn(),
    listActiveUserExternalBankAccounts: jest.fn(),
    getActiveUserExternalBankAccount: jest.fn(),
    softDeleteUserExternalBankAccount: jest.fn(),
    promoteFirstActiveUserExternalBankAccountAsDefault: jest.fn(),
    setDefaultUserExternalBankAccount: jest.fn(),
    getUserWallet: jest.fn()
  }
}));

jest.mock('../services/payonusNubanClient', () => ({
  nameEnquiry: jest.fn(),
  initiateBankPayout: jest.fn()
}));

const mockedDb = db as jest.Mocked<typeof db>;
const mockedNameEnquiry = nameEnquiry as jest.MockedFunction<typeof nameEnquiry>;

const sampleAccount = {
  id: 'acct-1',
  userId: 'user-1',
  accountNumber: '0123456789',
  bankCode: '058',
  bankName: 'GTBank',
  accountName: 'Jane Smith',
  currency: 'NGN',
  isDefault: true,
  status: 'active' as const,
  verifiedAt: new Date('2026-01-01'),
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01')
};

describe('UserExternalBankAccountService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('saves a verified bank account and marks the first one as default', async () => {
    mockedDb.countActiveUserExternalBankAccounts.mockResolvedValue(0);
    mockedNameEnquiry.mockResolvedValue({
      ok: true,
      accountName: 'Jane Smith',
      accountNumber: '0123456789',
      bankCode: '058',
      bankName: 'GTBank'
    });
    mockedDb.createUserExternalBankAccount.mockResolvedValue(sampleAccount);

    const result = await UserExternalBankAccountService.add({
      userId: 'user-1',
      accountNumber: '0123456789',
      bankCode: '058'
    });

    expect(result.success).toBe(true);
    expect(result.account?.isDefault).toBe(true);
    expect(mockedDb.clearDefaultUserExternalBankAccounts).toHaveBeenCalledWith('user-1');
    expect(mockedDb.createUserExternalBankAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        accountName: 'Jane Smith',
        isDefault: true
      })
    );
  });

  it('rejects payout resolution when saved account is missing', async () => {
    mockedDb.getActiveUserExternalBankAccount.mockResolvedValue(null);

    const result = await UserExternalBankAccountService.resolveForPayout('user-1', 'missing-id');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });
});

describe('WalletService.payoutUserWalletToBank saved-account guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects payout when savedBankAccountId does not belong to the user', async () => {
    mockedDb.getActiveUserExternalBankAccount.mockResolvedValue(null);

    const result = await WalletService.payoutUserWalletToBank({
      userId: 'user-1',
      savedBankAccountId: 'acct-missing',
      amount: 1000
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/saved bank account/i);
    expect(mockedDb.getUserWallet).not.toHaveBeenCalled();
  });
});
