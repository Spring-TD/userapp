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

const creatorSettlement = {
  id: 'wallet_creator_settlement',
  merchantId: 'creator_merchant',
  appId: 'app_plata',
  walletType: 'MERCHANT' as const,
  merchantWalletType: MerchantWalletType.REPAYMENT,
  name: 'Creator Settlement',
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
  balance: 500,
  mainBalance: 500,
  ledgerBalance: 500,
  status: WalletStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date()
};

describe('WalletService.collectCommodityPurchase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debits user PRIMARY and credits offering commission + creator SETTLEMENT principal', async () => {
    mockedDb.findTransactionByExternalReferenceAndSource.mockResolvedValue(null);
    mockedDb.getUserWalletForMerchant.mockResolvedValue(userWallet);
    mockedDb.getMerchantWalletByType.mockImplementation(async (_merchantId, _type, appId) => {
      if (appId === 'app_spring') return offeringSettlement;
      return creatorSettlement;
    });
    mockedDb.updateWalletBalance.mockResolvedValue(null);
    mockedDb.createTransaction.mockImplementation(async (input) => ({
      id: `tx_${input.referenceId}`,
      walletId: input.walletId,
      amount: input.amount,
      type: input.type,
      status: TransactionStatus.COMPLETED,
      description: input.description,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    mockedDb.getWalletById.mockImplementation(async (id) => {
      if (id === userWallet.id) return { ...userWallet, mainBalance: 399, ledgerBalance: 399 };
      if (id === offeringSettlement.id) return { ...offeringSettlement, mainBalance: 1, ledgerBalance: 1 };
      return { ...creatorSettlement, mainBalance: 100, ledgerBalance: 100 };
    });

    const result = await WalletService.collectCommodityPurchase({
      userId: 'user_1',
      offeringMerchantId: 'offering_merchant',
      offeringAppId: 'app_spring',
      creatorMerchantId: 'creator_merchant',
      creatorAppId: 'app_plata',
      baseAmount: 100,
      commissionAmount: 1,
      referenceId: 'commodity-purchase:acc_1',
      productId: 'prod_1',
      currency: 'NGN'
    });

    expect(result.success).toBe(true);
    expect(result.totalAmount).toBe(101);
    expect(result.principalSettledOnCreator).toBe(true);
    expect(result.principalPendingExternalSettlement).toBe(false);
    expect(mockedDb.updateWalletBalance).toHaveBeenCalledWith(userWallet.id, {
      mainBalance: 399,
      ledgerBalance: 399
    });
    expect(mockedDb.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        walletId: offeringSettlement.id,
        amount: 1,
        category: 'COMMODITY_CHARGE'
      })
    );
    expect(mockedDb.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        walletId: creatorSettlement.id,
        amount: 100,
        category: 'COMMODITY_DEPOSIT'
      })
    );
  });

  it('returns insufficient funds when user balance is too low', async () => {
    mockedDb.findTransactionByExternalReferenceAndSource.mockResolvedValue(null);
    mockedDb.getUserWalletForMerchant.mockResolvedValue({ ...userWallet, mainBalance: 50, ledgerBalance: 50 });
    mockedDb.getMerchantWalletByType.mockResolvedValue(offeringSettlement);

    const result = await WalletService.collectCommodityPurchase({
      userId: 'user_1',
      offeringMerchantId: 'offering_merchant',
      offeringAppId: 'app_spring',
      creatorMerchantId: 'creator_merchant',
      creatorAppId: 'app_plata',
      baseAmount: 100,
      commissionAmount: 1,
      referenceId: 'commodity-purchase:acc_2',
      productId: 'prod_1'
    });

    expect(result.success).toBe(false);
    expect(result.insufficientFunds).toBe(true);
  });
});

