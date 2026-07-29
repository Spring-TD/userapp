import type { ProductTypeKey } from '../constants/productTypes';

export interface ProductTypeAccountSummary {
  walletId: string;
  name: string;
  amount: number;
  currency: string;
  status: string;
  productType: ProductTypeKey;
  productId?: string;
  productApplicationId?: string;
  appId?: string;
}

export interface ProductTypeBucketSummary {
  totalAmount: number;
  currency: string;
  accountCount: number;
  accounts: ProductTypeAccountSummary[];
}

export type ProductTypeSummaryMap = Record<ProductTypeKey, ProductTypeBucketSummary>;

export interface UserProductTypeSummary {
  userId: string;
  currency: string;
  summary: ProductTypeSummaryMap;
}
