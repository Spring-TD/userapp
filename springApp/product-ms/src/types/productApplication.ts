import type { LoanRequirements } from './product';

export type ProductApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'BLACKLISTED';

export interface ProductRequirementSubmission {
  requirementId?: string;
  requirementType?: string;
  label?: string;
  type?: 'document' | 'text' | 'number' | 'boolean' | 'json';
  value?: unknown;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  metadata?: Record<string, unknown>;
}

export interface ProductApplication {
  id: string;
  userId: string;
  productId: string;
  productName: string;
  productType: string;
  amount: number;
  currency: string;
  email?: string;
  status: ProductApplicationStatus;
  rejectionReason?: string;
  blacklistReason?: string;
  appId: string;
  merchantId?: string;
  requirementsSnapshot?: LoanRequirements;
  /** Optional upstream/read-model snapshot used by product overview money aggregates. */
  contractSnapshot?: Record<string, unknown>;
  /** Optional upstream workflow state; local `status` is still the primary SpringApp state. */
  loanWorkflowStatus?: string;
  requirementSubmissions: ProductRequirementSubmission[];
  productWallet?: ProductApplicationWallet;
  upstreamApplicationId?: string;
  upstreamSyncError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductApplicationWallet {
  walletId: string;
  walletPurpose?: string;
  reusedUpstreamAccount?: boolean;
  upstreamAccount?: {
    accountNumber?: string;
    bankName?: string;
    bankCode?: string;
    providerReference?: string;
    provisionStatus?: string;
    provisionError?: string;
  };
}

export interface CreateProductApplicationRequest {
  userId: string;
  productId: string;
  amount: number;
  currency: string;
  email?: string;
  merchantId?: string;
  appId?: string;
  applicantName?: string;
  phone?: string;
  bvn?: string;
  country?: string;
  offeringMerchantName?: string;
  integratorMerchantId?: string;
  integratorMerchantName?: string;
  productCreatorMerchantName?: string;
  subMerchant?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    bvn?: string;
  };
  /** Tenant (sub-merchant) contact for Plata `subMerchant` when not sending full `subMerchant`. */
  subMerchantContactEmail?: string;
  subMerchantContactPhone?: string;
  requirementSubmissions?: ProductRequirementSubmission[];
}

export interface SubmitProductApplicationRequirementsRequest {
  userId?: string;
  requirementSubmissions: ProductRequirementSubmission[];
}

export interface CreateApplicationGuarantorRequest {
  userId?: string;
  fullName: string;
  email: string;
  phone: string;
  occupation?: string;
  relationship?: string;
  country?: string;
  callback?: string;
  redirect?: string;
}

export interface SubmitProductApplicationRequest {
  userId?: string;
  acceptedTerms: boolean;
  mortgageSelection?: {
    propertyName?: string;
    propertyType?: string;
    location?: string;
    unitPrice?: number;
    quantity?: number;
    startDate?: string;
    investmentPeriod?: string;
    total?: number;
    metadata?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
}

export interface UpdateProductApplicationStatusRequest {
  status: Exclude<ProductApplicationStatus, 'PENDING'>;
  reason?: string;
}

/** Query filters for listing or summarizing product applications. */
export interface ApplicationListQuery {
  merchantId?: string;
  userId?: string;
  appId?: string;
  status?: ProductApplicationStatus;
  productType?: string;
}

/** Status counts for merchant customer application dashboards. */
export interface ApplicationSummary {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  blacklisted: number;
}
