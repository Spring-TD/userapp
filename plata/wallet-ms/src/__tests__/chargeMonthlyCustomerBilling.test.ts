import { WalletService } from '../services/walletService';
import { MerchantWalletType, TransactionStatus, TransactionType, WalletStatus } from '../models/Wallet';
import { db } from '../db/database';

jest.mock('../db/database', () => ({
  db: {
    getMerchantWalletByType: jest.fn(),
    findCompletedTransactionByReference: jest.fn(),
    updateWalletBalance: jest.fn(),
    createTransaction: jest.fn(),
    getWalletById: jest.fn()
  }
}));

jest.mock('../services/payonusNubanProvisioning', () => ({
  provisionPayonusNubanForWallet: jest.fn(async (wallet: unknown) => wallet)
}));

const mockedDb = db as jest.Mocked<typeof db>;

const billingWallet = {
  id: 'wallet_billing_1',
  merchantId: 'merchant_1',
  appId: 'app_alpha',
  walletType: 'MERCHANT' as const,
  merchantWalletType: MerchantWalletType.BILLING,
  name: 'Billing Wallet',
  currency: 'NGN',
  balance: 5000,
  mainBalance: 5000,
  ledgerBalance: 5000,
  status: WalletStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date()
};

describe('WalletService.chargeMonthlyCustomerBilling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debits the app-scoped Billing wallet for customer count × price', async () => {
    mockedDb.getMerchantWalletByType.mockResolvedValue(billingWallet);
    mockedDb.findCompletedTransactionByReference.mockResolvedValue(null);
    mockedDb.updateWalletBalance.mockResolvedValue(undefined);
    mockedDb.createTransaction.mockResolvedValue({
      id: 'txn_1',
      walletId: billingWallet.id,
      amount: -1200,
      type: TransactionType.DEBIT,
      status: TransactionStatus.COMPLETED,
      description: 'Monthly platform billing',
      referenceId: 'BILLING_MONTHLY:2026-06:app_alpha',
      balanceBefore: 5000,
      balanceAfter: 3800,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    mockedDb.getWalletById.mockResolvedValue({
      ...billingWallet,
      mainBalance: 3800,
      ledgerBalance: 3800,
      balance: 3800
    });

    const result = await WalletService.chargeMonthlyCustomerBilling({
      merchantId: 'merchant_1',
      appId: 'app_alpha',
      amount: 1200,
      description: 'Monthly platform billing — 12 customer(s) @ 100 (2026-06)',
      referenceId: 'BILLING_MONTHLY:2026-06:app_alpha',
      billingPeriod: '2026-06',
      customerCount: 12,
      pricePerCustomer: 100,
      appName: 'Alpha Shop'
    });

    expect(result.success).toBe(true);
    expect(result.duplicate).toBe(false);
    expect(result.transaction?.amount).toBe(-1200);
    expect(mockedDb.getMerchantWalletByType).toHaveBeenCalledWith(
      'merchant_1',
      MerchantWalletType.BILLING,
      'app_alpha'
    );
    expect(mockedDb.updateWalletBalance).toHaveBeenCalledWith('wallet_billing_1', {
      mainBalance: 3800,
      ledgerBalance: 3800
    });
    expect(mockedDb.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        walletId: 'wallet_billing_1',
        amount: -1200,
        referenceId: 'BILLING_MONTHLY:2026-06:app_alpha',
        category: 'MONTHLY_CUSTOMER_BILLING',
        metadata: expect.objectContaining({
          customerCount: 12,
          pricePerCustomer: 100,
          billingPeriod: '2026-06'
        })
      })
    );
  });

  it('returns duplicate when the same billing period was already charged', async () => {
    const existingTxn = {
      id: 'txn_existing',
      walletId: billingWallet.id,
      amount: -1200,
      type: TransactionType.DEBIT,
      status: TransactionStatus.COMPLETED,
      description: 'Already charged',
      referenceId: 'BILLING_MONTHLY:2026-06:app_alpha',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockedDb.getMerchantWalletByType.mockResolvedValue(billingWallet);
    mockedDb.findCompletedTransactionByReference.mockResolvedValue(existingTxn);

    const result = await WalletService.chargeMonthlyCustomerBilling({
      merchantId: 'merchant_1',
      appId: 'app_alpha',
      amount: 1200,
      description: 'Monthly billing',
      referenceId: 'BILLING_MONTHLY:2026-06:app_alpha',
      billingPeriod: '2026-06',
      customerCount: 12,
      pricePerCustomer: 100
    });

    expect(result.success).toBe(true);
    expect(result.duplicate).toBe(true);
    expect(result.transaction?.id).toBe('txn_existing');
    expect(mockedDb.updateWalletBalance).not.toHaveBeenCalled();
    expect(mockedDb.createTransaction).not.toHaveBeenCalled();
  });

  it('returns insufficient funds with funding instructions when balance is too low', async () => {
    mockedDb.getMerchantWalletByType.mockResolvedValue({
      ...billingWallet,
      mainBalance: 50,
      ledgerBalance: 50,
      balance: 50,
      virtualNuban: {
        accountType: 'dynamic',
        provisionStatus: 'active',
        accountNumber: '1234567890',
        bankName: 'Test Bank'
      }
    });
    mockedDb.findCompletedTransactionByReference.mockResolvedValue(null);

    const result = await WalletService.chargeMonthlyCustomerBilling({
      merchantId: 'merchant_1',
      appId: 'app_alpha',
      amount: 1200,
      description: 'Monthly billing',
      referenceId: 'BILLING_MONTHLY:2026-06:app_alpha',
      billingPeriod: '2026-06',
      customerCount: 12,
      pricePerCustomer: 100
    });

    expect(result.success).toBe(false);
    expect(result.insufficientFunds).toBe(true);
    expect(result.fundingInstructions).toMatchObject({
      balance: 50,
      requiredAmount: 1200,
      shortfall: 1150,
      virtualNuban: expect.objectContaining({ accountNumber: '1234567890' })
    });
    expect(mockedDb.updateWalletBalance).not.toHaveBeenCalled();
  });

  it('skips charge when amount is zero', async () => {
    const result = await WalletService.chargeMonthlyCustomerBilling({
      merchantId: 'merchant_1',
      appId: 'app_alpha',
      amount: 0,
      description: 'No customers',
      referenceId: 'BILLING_MONTHLY:2026-06:app_alpha',
      billingPeriod: '2026-06',
      customerCount: 0,
      pricePerCustomer: 100
    });

    expect(result.success).toBe(true);
    expect(result.skippedZeroAmount).toBe(true);
    expect(mockedDb.getMerchantWalletByType).not.toHaveBeenCalled();
  });
});
