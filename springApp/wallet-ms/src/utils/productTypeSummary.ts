import { PRODUCT_TYPES, normalizeProductTypeKey, type ProductTypeKey } from '../constants/productTypes';
import type { UserWallet } from '../models/Wallet';
import type {
  ProductTypeAccountSummary,
  ProductTypeBucketSummary,
  ProductTypeSummaryMap,
  UserProductTypeSummary
} from '../types/productTypeSummary';

function emptyBucket(currency: string): ProductTypeBucketSummary {
  return {
    totalAmount: 0,
    currency,
    accountCount: 0,
    accounts: []
  };
}

function walletAmount(wallet: UserWallet): number {
  return wallet.balance ?? wallet.mainBalance ?? 0;
}

function resolveDefaultCurrency(wallets: UserWallet[]): string {
  const primary = wallets.find(
    (w) => w.walletPurpose === 'PRIMARY' || w.walletPurpose === undefined
  );
  if (primary?.currency) return primary.currency;
  const productWallet = wallets.find((w) => w.walletPurpose === 'PRODUCT' && w.currency);
  if (productWallet?.currency) return productWallet.currency;
  return 'NGN';
}

function toAccountSummary(wallet: UserWallet, productType: ProductTypeKey): ProductTypeAccountSummary {
  return {
    walletId: wallet.id,
    name: wallet.name,
    amount: walletAmount(wallet),
    currency: wallet.currency,
    status: wallet.status,
    productType,
    ...(wallet.productId ? { productId: wallet.productId } : {}),
    ...(wallet.productApplicationId ? { productApplicationId: wallet.productApplicationId } : {}),
    ...(wallet.appId ? { appId: wallet.appId } : {})
  };
}

/**
 * Aggregate PRODUCT-purpose wallets by product type.
 * PRIMARY wallet funds are excluded; missing types default to 0.
 */
export function buildUserProductTypeSummary(
  userId: string,
  wallets: UserWallet[],
  defaultCurrency?: string
): UserProductTypeSummary {
  const currency = defaultCurrency?.trim() || resolveDefaultCurrency(wallets);

  const summary = PRODUCT_TYPES.reduce((acc, type) => {
    acc[type] = emptyBucket(currency);
    return acc;
  }, {} as ProductTypeSummaryMap);

  for (const wallet of wallets) {
    if (wallet.walletPurpose !== 'PRODUCT') continue;

    const productType = normalizeProductTypeKey(wallet.productType);
    if (!productType) continue;

    const amount = walletAmount(wallet);
    const bucket = summary[productType];
    bucket.totalAmount += amount;
    bucket.accountCount += 1;
    bucket.accounts.push(toAccountSummary(wallet, productType));
  }

  for (const type of PRODUCT_TYPES) {
    summary[type].accounts.sort((a, b) => b.amount - a.amount);
  }

  return { userId, currency, summary };
}
