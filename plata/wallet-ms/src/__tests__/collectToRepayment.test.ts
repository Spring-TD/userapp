import { WalletService } from '../services/walletService';
import { MerchantWalletType, TransactionStatus, TransactionType, WalletStatus } from '../models/Wallet';
import { db } from '../db/database';

jest.mock('../db/database', () => ({
  db: {
    getMerchantWalletByType: jest.fn(),
    getUserWalletForMerchant: jest.fn(),
    findTransactionByExternalReferenceAndSource: jest.fn(),
    updateWalletBalance: jest.fn(),
    createTransaction: jest.fn(),
    getWalletById: jest.fn()
  }
}));

jest.mock('../services/payonusNubanProvisioning', () => ({
  provisionPayonusNubanForWallet: jest.fn(async (wallet: unknown) => wallet)
}));

const mockedDb = db as jest.Mocked<typeof db>;

const repaymentWallet = {
  id: 'wallet_repayment_1',
  merchantId: 'merchant_1',
  appId: 'app_alpha',
  walletType: 'MERCHANT' as const,
  merchantWalletType: MerchantWalletType.REPAYMENT,
  name: 'Repayment Wallet',
  currency: 'NGN',
  balance: 0,
  mainBalance: 0,
  ledgerBalance: 0,
  status: WalletStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date()
};

const userWallet = {
  id: 'wallet_user_1',
  userId: 'user_1',
  merchantId: 'merchant_1',
  walletType: 'USER' as const,
  walletPurpose: 'PRIMARY' as const,
  name: 'Primary Wallet',
  currency: 'NGN',
  balance: 500,
  mainBalance: 500,
  ledgerBalance: 500,
  status: WalletStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date()
};

describe('WalletService.collectToRepayment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('credits repayment wallet for external collection', async () => {
    mockedDb.getMerchantWalletByType.mockResolvedValue(repaymentWallet);
    mockedDb.findTransactionByExternalReferenceAndSource.mockResolvedValue(null);
    mockedDb.updateWalletBalance.mockResolvedValue(null);
    mockedDb.createTransaction.mockResolvedValue({
      id: 'tx_1',
      walletId: repaymentWallet.id,
      amount: 250,
      type: TransactionType.CREDIT,
      status: TransactionStatus.COMPLETED,
      description: 'Loan repayment',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    mockedDb.getWalletById.mockResolvedValue({
      ...repaymentWallet,
      mainBalance: 250,
      ledgerBalance: 250,
      balance: 250
    });

    const result = await WalletService.collectToRepayment({
      merchantId: 'merchant_1',
      appId: 'app_alpha',
      amount: 250,
      referenceId: 'collect-ref-001',
      source: 'loan-repayment',
      category: 'LOAN_REPAYMENT',
      debitUserWallet: false
    });

    expect(result.success).toBe(true);
    expect(result.duplicate).toBe(false);
    expect(result.repaymentWallet?.mainBalance).toBe(250);
    // Backward-compat field still populated
    expect(result.settlementWallet?.mainBalance).toBe(250);
    expect(mockedDb.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        walletId: repaymentWallet.id,
        amount: 250,
        category: 'LOAN_REPAYMENT',
        externalReference: 'collect-ref-001'
      })
    );
  });

  it('debits user wallet and credits repayment for in-app collection', async () => {
    mockedDb.getMerchantWalletByType.mockResolvedValue(repaymentWallet);
    mockedDb.findTransactionByExternalReferenceAndSource.mockResolvedValue(null);
    mockedDb.getUserWalletForMerchant.mockResolvedValue(userWallet);
    mockedDb.updateWalletBalance.mockResolvedValue(null);
    mockedDb.createTransaction
      .mockResolvedValueOnce({
        id: 'tx_user',
        walletId: userWallet.id,
        amount: -150,
        type: TransactionType.DEBIT,
        status: TransactionStatus.COMPLETED,
        description: 'debit',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .mockResolvedValueOnce({
        id: 'tx_repayment',
        walletId: repaymentWallet.id,
        amount: 150,
        type: TransactionType.CREDIT,
        status: TransactionStatus.COMPLETED,
        description: 'credit',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    mockedDb.getWalletById
      .mockResolvedValueOnce({ ...repaymentWallet, mainBalance: 150, ledgerBalance: 150, balance: 150 })
      .mockResolvedValueOnce({ ...userWallet, mainBalance: 350, ledgerBalance: 350, balance: 350 });

    const result = await WalletService.collectToRepayment({
      merchantId: 'merchant_1',
      appId: 'app_alpha',
      userId: 'user_1',
      amount: 150,
      referenceId: 'collect-ref-002',
      category: 'SAVINGS_DEPOSIT',
      debitUserWallet: true
    });

    expect(result.success).toBe(true);
    expect(result.userWallet?.mainBalance).toBe(350);
    expect(result.repaymentWallet?.mainBalance).toBe(150);
    expect(result.settlementWallet?.mainBalance).toBe(150);
    expect(mockedDb.updateWalletBalance).toHaveBeenCalledTimes(2);
  });

  it('returns duplicate when reference already exists', async () => {
    mockedDb.getMerchantWalletByType.mockResolvedValue(repaymentWallet);
    mockedDb.findTransactionByExternalReferenceAndSource.mockResolvedValue({
      id: 'tx_dup',
      walletId: repaymentWallet.id,
      amount: 75,
      type: TransactionType.CREDIT,
      status: TransactionStatus.COMPLETED,
      description: 'existing',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    mockedDb.getWalletById.mockResolvedValue(repaymentWallet);

    const result = await WalletService.collectToRepayment({
      merchantId: 'merchant_1',
      appId: 'app_alpha',
      amount: 75,
      referenceId: 'collect-ref-dup',
      category: 'COMMODITY_CHARGE',
      debitUserWallet: false
    });

    expect(result.success).toBe(true);
    expect(result.duplicate).toBe(true);
    expect(mockedDb.updateWalletBalance).not.toHaveBeenCalled();
  });

  it('returns insufficient funds when user wallet balance is too low', async () => {
    mockedDb.getMerchantWalletByType.mockResolvedValue(repaymentWallet);
    mockedDb.findTransactionByExternalReferenceAndSource.mockResolvedValue(null);
    mockedDb.getUserWalletForMerchant.mockResolvedValue({
      ...userWallet,
      mainBalance: 50,
      ledgerBalance: 50,
      balance: 50
    });

    const result = await WalletService.collectToRepayment({
      merchantId: 'merchant_1',
      userId: 'user_1',
      amount: 200,
      referenceId: 'collect-ref-low',
      category: 'LOAN_CHARGE',
      debitUserWallet: true
    });

    expect(result.success).toBe(false);
    expect(result.insufficientFunds).toBe(true);
    expect(result.error).toContain('Insufficient');
  });
});

describe('WalletService.collectToSettlement (deprecated alias)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates to collectToRepayment and returns both settlementWallet and repaymentWallet', async () => {
    mockedDb.getMerchantWalletByType.mockResolvedValue(repaymentWallet);
    mockedDb.findTransactionByExternalReferenceAndSource.mockResolvedValue(null);
    mockedDb.updateWalletBalance.mockResolvedValue(null);
    mockedDb.createTransaction.mockResolvedValue({
      id: 'tx_alias',
      walletId: repaymentWallet.id,
      amount: 99,
      type: TransactionType.CREDIT,
      status: TransactionStatus.COMPLETED,
      description: 'alias collection',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    mockedDb.getWalletById.mockResolvedValue({
      ...repaymentWallet,
      mainBalance: 99,
      ledgerBalance: 99,
      balance: 99
    });

    const result = await WalletService.collectToSettlement({
      merchantId: 'merchant_1',
      appId: 'app_alpha',
      amount: 99,
      referenceId: 'collect-ref-alias',
      category: 'OTHER_SERVICE_CHARGE',
      debitUserWallet: false
    });

    expect(result.success).toBe(true);
    expect(result.settlementWallet?.mainBalance).toBe(99);
    expect(result.repaymentWallet?.mainBalance).toBe(99);
  });
});
