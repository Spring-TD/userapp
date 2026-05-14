import type { ProductDiscriminator } from './product';

/**
 * Split of a revenue line between the product-creating merchant (`merchantId` on the application)
 * and the offering merchant (`offeringMerchantId`). Shares are basis points (0–10000 = 100%).
 */
export interface RevenueLineSplit {
  creatorShareBps?: number;
  offeringMerchantShareBps?: number;
}

/**
 * Frozen settlement attribution at application time. Unused buckets may be omitted.
 */
export interface UserProductApplicationPayoutSplit {
  currency?: string;
  interest?: RevenueLineSplit;
  fees?: RevenueLineSplit;
  penalties?: RevenueLineSplit;
  /** Savings / investment style yield or spread, if used instead of interest */
  yield?: RevenueLineSplit;
}

export type UserProductApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'signed'
  | 'cancelled'
  | 'withdrawn';

/** Originating merchant (product creator) loan underwriting workflow — LOAN / MORTGAGE applications only. */
export type LoanWorkflowStatus =
  | 'requested'
  | 'under_review'
  | 'approved'
  | 'declined'
  | 'blacklisted';

/**
 * Immutable snapshot written when a merchant-platform user applies for a product.
 * `merchantId` / `merchantName` = creator of the global product; `offeringMerchant*` = distributor.
 */
export interface UserProductApplication {
  id: string;
  appId: string;
  /** Product-creating merchant */
  merchantId: string;
  merchantName?: string;
  /** Merchant that enabled the product for this user */
  offeringMerchantId: string;
  offeringMerchantName?: string;
  userId: string;
  productType: ProductDiscriminator;
  globalProductId: string;
  globalProductReferenceNumber?: string;
  merchantProductId?: string;
  status: UserProductApplicationStatus;
  /** Set for LOAN and MORTGAGE; managed only by the originating product merchant (`merchantId`). */
  loanWorkflowStatus?: LoanWorkflowStatus;
  submittedAt: string;
  signedAt?: string;
  /**
   * Full frozen effective terms: global base + merchant overlay (and/or pre-merged `effective` payload).
   * Shape varies by `productType`.
   */
  contractSnapshot: Record<string, unknown>;
  payoutSplit: UserProductApplicationPayoutSplit;
  snapshotVersion: number;
  /** Optional integrity check over canonical JSON of snapshot + payoutSplit */
  snapshotHash?: string;
  createdAt: string;
}

/** POST /api/v1/products/applications body (after Joi strip/normalize). */
export interface CreateUserProductApplicationRequest {
  appId: string;
  merchantId: string;
  merchantName?: string;
  offeringMerchantId: string;
  offeringMerchantName?: string;
  userId: string;
  productType: ProductDiscriminator;
  globalProductId: string;
  globalProductReferenceNumber?: string;
  merchantProductId?: string;
  status?: UserProductApplicationStatus;
  submittedAt?: string;
  signedAt?: string;
  contractSnapshot: Record<string, unknown>;
  payoutSplit?: UserProductApplicationPayoutSplit;
  snapshotVersion?: number;
  snapshotHash?: string;
}

export interface ListUserProductApplicationsQuery {
  appId?: string;
  userId?: string;
  offeringMerchantId?: string;
  merchantId?: string;
  globalProductId?: string;
  productType?: ProductDiscriminator;
  status?: UserProductApplicationStatus;
  limit: number;
  skip: number;
}

export interface ListLoanWorkflowQuery {
  loanWorkflowStatus?: LoanWorkflowStatus;
  limit: number;
  skip: number;
}
