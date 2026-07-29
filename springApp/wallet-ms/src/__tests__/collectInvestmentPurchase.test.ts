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

const mockedDb = db as jest.Mocked<typeof db>;

const offeringSettlement = {
  id: 'wallet_offering_settlement',
  merchantId: 'offering_merchant',
  appId: 'app_spring',
  walletType: 'MERCHANT' as const,
  merchantWalletType: MerchantWalletType.REPAYMENT,
  name: 'Offering Settlement',
  currency: 'NGN',
  balance: 0,
  mainBalance: 0,
  ledgerBalance: 0,
  status: WalletStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date()
};

const integratorSettlement = {
  id: 'wallet_integrator_settlement',
  merchantId: 'integrator_merchant',
  appId: 'app_integrator',
  walletType: 'MERCHANT' as const,
  merchantWalletType: MerchantWalletType.REPAYMENT,
  name: 'Integrator Settlement',
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
  merchantId: 'offering_merchant',
  walletType: 'USER' as const,
  walletPurpose: 'PRIMARY' as const,
  name: 'Primary Wallet',
  currency: 'NGN',
  balance: 5000,
  mainBalance: 5000,
  ledgerBalance: 5000,
  status: WalletStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date()
};

describe('WalletService.collectInvestmentPurchase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debits user principal and splits commission + creator principal hold', async () => {
    mockedDb.findTransactionByExternalReferenceAndSource.mockResolvedValue(null);
    mockedDb.getUserWalletForMerchant.mockResolvedValue(userWallet);
    mockedDb.getMerchantWalletByType.mockImplementation(async (_merchantId, _type, appId) => {
      if (appId === 'app_spring') return offeringSettlement;
      return integratorSettlement;
    });
    mockedDb.updateWalletBalance.mockResolvedValue(null);
    mockedDb.createTransaction.mockImplementation(async (input) => ({
      id: `tx_${input.referenceId}`,
      ...input,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    mockedDb.getWalletById.mockImplementation(async (id) => {
      if (id === userWallet.id) return { ...userWallet, mainBalance: 4000 };
      if (id === offeringSettlement.id) return { ...offeringSettlement, mainBalance: 10 };
      return { ...integratorSettlement, mainBalance: 990 };
    });

    const result = await WalletService.collectInvestmentPurchase({
      userId: 'user_1',
      offeringMerchantId: 'offering_merchant',
      offeringAppId: 'app_spring',
      integratorMerchantId: 'integrator_merchant',
      integratorAppId: 'app_integrator',
      principalAmount: 1000,
      commissionAmount: 10,
      creatorPrincipalAmount: 990,
      referenceId: 'investment-ref-1',
      productId: 'product_1',
      applicationId: 'app_doc_1',
      currency: 'NGN'
    });

    expect(result.success).toBe(true);
    expect(result.principalAmount).toBe(1000);
    expect(mockedDb.updateWalletBalance).toHaveBeenCalledWith(userWallet.id, {
      mainBalance: 4000,
      ledgerBalance: 4000
    });
    expect(mockedDb.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        walletId: offeringSettlement.id,
        amount: 10,
        category: 'INVESTMENT_CHARGE'
      })
    );
    expect(mockedDb.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        walletId: integratorSettlement.id,
        amount: 990,
        category: 'INVESTMENT_DEPOSIT'
      })
    );
  });
});
