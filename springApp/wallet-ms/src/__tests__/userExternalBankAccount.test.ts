import { UserExternalBankAccountService } from '../services/userExternalBankAccountService';
import { db } from '../db/database';
import { railsNameEnquiry } from '../services/nubanRails';
import { fetchRetailUserKycIdentity } from '../services/complianceApplicantClient';
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

jest.mock('../services/nubanRails', () => ({
  railsNameEnquiry: jest.fn(),
  railsInitiateBankPayout: jest.fn(),
  railsFetchBanks: jest.fn()
}));

jest.mock('../services/bankListResolver', () => ({
  resolveBankPickerSelection: jest.fn()
}));

jest.mock('../services/complianceApplicantClient', () => ({
  fetchRetailUserKycIdentity: jest.fn()
}));

const mockedDb = db as jest.Mocked<typeof db>;
const mockedNameEnquiry = railsNameEnquiry as jest.MockedFunction<typeof railsNameEnquiry>;
const mockedFetchKycIdentity = fetchRetailUserKycIdentity as jest.MockedFunction<typeof fetchRetailUserKycIdentity>;

import { resolveBankPickerSelection } from '../services/bankListResolver';
const mockedResolveBank = resolveBankPickerSelection as jest.MockedFunction<typeof resolveBankPickerSelection>;

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
    mockedResolveBank.mockResolvedValue({
      success: true,
      bankCode: '058',
      bankName: 'GTBank'
    });
    mockedFetchKycIdentity.mockResolvedValue({
      success: true,
      identity: {
        legalName: 'Jane Smith',
        firstName: 'Jane',
        lastName: 'Smith',
        kycCompleted: true,
        kycStatus: 'approved'
      }
    });
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
      bankName: 'GTBank',
      accountName: 'Jane Smith'
    });

    expect(result.success).toBe(true);
    expect(result.account?.isDefault).toBe(true);
    expect(mockedDb.clearDefaultUserExternalBankAccounts).toHaveBeenCalledWith('user-1');
    expect(mockedDb.createUserExternalBankAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        bankCode: '058',
        bankName: 'GTBank',
        accountName: 'Jane Smith',
        isDefault: true
      })
    );
  });

  it('rejects save when submitted account name does not match PayOnUs records', async () => {
    mockedDb.countActiveUserExternalBankAccounts.mockResolvedValue(0);
    mockedNameEnquiry.mockResolvedValue({
      ok: true,
      accountName: 'Jane Smith',
      accountNumber: '0123456789',
      bankCode: '058',
      bankName: 'GTBank'
    });

    const result = await UserExternalBankAccountService.add({
      userId: 'user-1',
      accountNumber: '0123456789',
      bankName: 'GTBank',
      accountName: 'John Doe'
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/does not match the bank records/i);
    expect(mockedDb.createUserExternalBankAccount).not.toHaveBeenCalled();
  });

  it('rejects save when bank account name does not match KYC identity', async () => {
    mockedDb.countActiveUserExternalBankAccounts.mockResolvedValue(0);
    mockedNameEnquiry.mockResolvedValue({
      ok: true,
      accountName: 'John Doe',
      accountNumber: '0123456789',
      bankCode: '058',
      bankName: 'GTBank'
    });

    const result = await UserExternalBankAccountService.add({
      userId: 'user-1',
      accountNumber: '0123456789',
      bankName: 'GTBank',
      accountName: 'John Doe'
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/does not match your verified KYC identity/i);
    expect(mockedDb.createUserExternalBankAccount).not.toHaveBeenCalled();
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
