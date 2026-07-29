import { WalletStatus, type UserWallet } from '../models/Wallet';
import { buildUserProductTypeSummary } from './productTypeSummary';

function makeProductWallet(overrides: Partial<UserWallet> & Pick<UserWallet, 'id' | 'productType'>): UserWallet {
  return {
    id: overrides.id,
    userId: 'user-1',
    merchantId: 'merchant-1',
    walletType: 'USER',
    walletPurpose: 'PRODUCT',
    productType: overrides.productType,
    name: overrides.name ?? 'Product Wallet',
    balance: overrides.balance ?? 0,
    mainBalance: overrides.mainBalance ?? overrides.balance ?? 0,
    ledgerBalance: overrides.ledgerBalance ?? overrides.balance ?? 0,
    currency: overrides.currency ?? 'NGN',
    status: overrides.status ?? WalletStatus.ACTIVE,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...(overrides.productId ? { productId: overrides.productId } : {}),
    ...(overrides.productApplicationId ? { productApplicationId: overrides.productApplicationId } : {}),
    ...(overrides.appId ? { appId: overrides.appId } : {})
  };
}

describe('buildUserProductTypeSummary', () => {
  it('returns zero totals for all product types when user has only PRIMARY wallet', () => {
    const wallets: UserWallet[] = [
      {
        id: 'primary-1',
        userId: 'user-1',
        merchantId: 'merchant-1',
        walletType: 'USER',
        walletPurpose: 'PRIMARY',
        name: 'Personal Wallet',
        balance: 1410,
        mainBalance: 1410,
        ledgerBalance: 1410,
        currency: 'NGN',
        status: WalletStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const result = buildUserProductTypeSummary('user-1', wallets);

    expect(result.userId).toBe('user-1');
    expect(result.currency).toBe('NGN');
    expect(result.summary.MORTGAGE.totalAmount).toBe(0);
    expect(result.summary.LOAN.totalAmount).toBe(0);
    expect(result.summary.SAVINGS.totalAmount).toBe(0);
    expect(result.summary.INVESTMENT.totalAmount).toBe(0);
    expect(result.summary.COMMODITY.totalAmount).toBe(0);
    expect(result.summary.MORTGAGE.accountCount).toBe(0);
  });

  it('aggregates PRODUCT wallets by product type', () => {
    const wallets: UserWallet[] = [
      makeProductWallet({ id: 'm1', productType: 'MORTGAGE', balance: 50000, name: 'Mortgage Wallet' }),
      makeProductWallet({ id: 'm2', productType: 'MORTGAGE', balance: 25000 }),
      makeProductWallet({ id: 'l1', productType: 'LOAN', balance: 10000 })
    ];

    const result = buildUserProductTypeSummary('user-1', wallets);

    expect(result.summary.MORTGAGE.totalAmount).toBe(75000);
    expect(result.summary.MORTGAGE.accountCount).toBe(2);
    expect(result.summary.LOAN.totalAmount).toBe(10000);
    expect(result.summary.SAVINGS.totalAmount).toBe(0);
  });
});
