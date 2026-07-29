import type { ProductRequirementSubmission } from './productApplication';
import type { PlatformApplicationFieldInput } from './platformApplicationFields';

export interface ApplyCommodityAccountRequest extends PlatformApplicationFieldInput {
  userId: string;
  productId: string;
  currency: string;
  quantity?: number;
  email?: string;
  appId?: string;
  merchantId?: string;
  applicantName?: string;
  phone?: string;
  bvn?: string;
  country?: string;
  requirementSubmissions?: ProductRequirementSubmission[];
  /** Nested storefront alias; merged with top-level platform fields. */
  platformFields?: PlatformApplicationFieldInput;
  metadata?: {
    platformFields?: PlatformApplicationFieldInput;
    [key: string]: unknown;
  };
}

export interface CommodityAccountResponse {
  id: string;
  userId: string;
  accountType: 'commodity';
  principal: number;
  interestRatePercent: number;
  expectedInterest: number;
  totalAtMaturity: number;
  currency: string;
  status: 'locked' | 'matured' | 'withdrawn';
  holdingStatus: 'LOCKED' | 'MATURED' | 'WITHDRAWN';
  productId: string;
  productName: string;
  applicationId: string;
  appId: string;
  merchantId?: string;
  upstreamApplicationId?: string;
  fundedAt?: string;
  maturityAt?: string;
  withdrawnAt?: string;
  commoditySelection?: Record<string, unknown>;
  productWallet?: {
    walletId: string;
    accountNumber?: string;
    bankName?: string;
    bankCode?: string;
    provisionStatus?: string;
  };
  purchase?: {
    referenceId: string;
    basePrice: number;
    commissionAmount: number;
    totalAmount: number;
    commissionRatePercent: number;
  };
}

export interface CommodityWithdrawRequest {
  userId: string;
}

export interface CommodityWithdrawResponse {
  applicationId: string;
  referenceId: string;
  principal: number;
  interest: number;
  totalPayout: number;
  currency: string;
  withdrawnAt: string;
}
