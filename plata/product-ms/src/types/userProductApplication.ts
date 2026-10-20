import type { ProductDiscriminator } from './product';
import type { ApplicationSubmittedRequirement } from './applicationSubmittedRequirement';
import type { LoanReason } from './loanReason';
import type { MaritalStatus } from './maritalStatus';
import type { RepaymentSource } from './repaymentSource';

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

export interface UserProductApplicationLoanDisbursement {
  amount?: number;
  grossAmount?: number;
  currency?: string;
  disbursedAt?: string;
  walletId?: string;
  accountNumber?: string;
  bankName?: string;
  bankCode?: string;
  plataManagementFee?: number;
  springManagementFee?: number;
  managementFees?: { plata?: number; spring?: number };
}

export interface UserProductApplicationEquityPayment {
  requiredAmount?: number;
  paidAmount?: number;
  status?: string;
  paidAt?: string;
  providerReference?: string;
}

export interface UserProductApplicationPostApprovalFulfillment {
  status?: string;
  disbursementDeferred?: boolean;
  offer?: {
    sentAt?: string;
    acceptedAt?: string;
    declinedAt?: string;
  };
  downPayment?: {
    requiredAmount?: number;
    currency?: string;
  };
  contract?: Record<string, unknown>;
  appointment?: Record<string, unknown>;
}

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
  /** API-key merchant that submitted via external-applications */
  externalPlatformMerchantId?: string;
  externalPlatformMerchantName?: string;
  userId: string;
  customerName?: string;
  productType: ProductDiscriminator;
  globalProductId: string;
  productName?: string;
  globalProductReferenceNumber?: string;
  localApplicationId?: string;
  merchantProductId?: string;
  status: UserProductApplicationStatus;
  /** Set for LOAN and MORTGAGE; managed only by the originating product merchant (`merchantId`). */
  loanWorkflowStatus?: LoanWorkflowStatus;
  loanWorkflowReason?: string;
  loanWorkflowCallbackUrl?: string;
  guarantorKycCallbackUrl?: string;
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
  submittedRequirements?: ApplicationSubmittedRequirement[];
  applicantSignatureUrl?: string;
  applicantSignatureKey?: string;
  applicantSignatureFileName?: string;
  isPoliticallyExposedPerson?: boolean;
  monthlyIncome?: number;
  repaymentSource?: RepaymentSource;
  repaymentSourceOther?: string;
  maritalStatus?: MaritalStatus;
  maritalStatusOther?: string;
  loanReason?: LoanReason;
  loanReasonOther?: string;
  repayingWithSpouse?: boolean;
  spouseFullName?: string;
  spouseEmail?: string;
  spousePhone?: string;
  spouseOccupation?: string;
  spouseCountry?: string;
  occupation?: string;
  placeOfWork?: string;
  hrName?: string;
  hrEmail?: string;
  applicantProfileSnapshot?: Record<string, unknown>;
  approvedLoanAmount?: number;
  loanDisbursement?: UserProductApplicationLoanDisbursement;
  equityPayment?: UserProductApplicationEquityPayment;
  postApprovalFulfillment?: UserProductApplicationPostApprovalFulfillment;
  createdAt: string;
}

/** POST /api/v1/products/applications body (after Joi strip/normalize). */
export interface CreateUserProductApplicationRequest {
  appId: string;
  merchantId: string;
  merchantName?: string;
  offeringMerchantId: string;
  offeringMerchantName?: string;
  externalPlatformMerchantId?: string;
  externalPlatformMerchantName?: string;
  userId: string;
  customerName?: string;
  productType: ProductDiscriminator;
  globalProductId: string;
  productName?: string;
  globalProductReferenceNumber?: string;
  localApplicationId?: string;
  merchantProductId?: string;
  status?: UserProductApplicationStatus;
  submittedAt?: string;
  signedAt?: string;
  contractSnapshot: Record<string, unknown>;
  payoutSplit?: UserProductApplicationPayoutSplit;
  snapshotVersion?: number;
  snapshotHash?: string;
  submittedRequirements?: ApplicationSubmittedRequirement[];
  allowMissingSubmittedRequirements?: boolean;
  applicantSignatureUrl?: string;
  applicantSignatureKey?: string;
  applicantSignatureFileName?: string;
  isPoliticallyExposedPerson?: boolean;
  monthlyIncome?: number;
  repaymentSource?: RepaymentSource;
  repaymentSourceOther?: string;
  maritalStatus?: MaritalStatus;
  maritalStatusOther?: string;
  loanReason?: LoanReason;
  loanReasonOther?: string;
  repayingWithSpouse?: boolean;
  spouseFullName?: string;
  spouseEmail?: string;
  spousePhone?: string;
  spouseOccupation?: string;
  spouseCountry?: string;
  occupation?: string;
  placeOfWork?: string;
  hrName?: string;
  hrEmail?: string;
  applicantProfileSnapshot?: Record<string, unknown>;
  loanWorkflowCallbackUrl?: string;
  guarantorKycCallbackUrl?: string;
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
