import type { LoanRequirements } from './product';
import type {
  PlatformApplicationFieldInput,
  ValidatedPlatformApplicationFields
} from './platformApplicationFields';

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

export interface ProductApplicationProgress {
  currentStep?: string;
  currentTab?: string;
  requirementDrafts?: ProductRequirementSubmission[];
  uploadedDrafts?: ProductRequirementSubmission[];
  guarantorDrafts?: Record<string, unknown>[];
  metadata?: Record<string, unknown>;
  lastSavedAt?: string;
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
  /** Display name captured during application init/submit for dashboard lists. */
  customerName?: string;
  /** Alias retained for clients that already use applicant naming. */
  applicantName?: string;
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
  /** Resumable storefront draft state saved before final requirement submission. */
  applicationProgress?: ProductApplicationProgress;
  requirementSubmissions: ProductRequirementSubmission[];
  productWallet?: ProductApplicationWallet;
  upstreamApplicationId?: string;
  upstreamSyncError?: string;
  loanWorkflowLastEventId?: string;
  loanWorkflowLastEventAt?: string;
  /** Mirrored from Backend-platter post-approval mortgage workflow. */
  postApprovalFulfillment?: PostApprovalFulfillment;
  /** True when mortgage approval deferred treasury disburse until fulfillment completes. */
  disbursementDeferred?: boolean;
  /** Latest guarantor report that the applicant is unknown to the guarantor. */
  applicantGuarantorReport?: {
    guarantorId: string;
    guarantorName: string;
    reportedAt: string;
  };
  /** Platform-mandated applicant fields forwarded to Plata on final submit. */
  platformFields?: ValidatedPlatformApplicationFields;
  createdAt: string;
  updatedAt: string;
}

export type PlataLoanWorkflowStatus = 'under_review' | 'approved' | 'declined' | 'blacklisted';

export type PostApprovalMortgageStatus =
  | 'offer_pending'
  | 'offer_declined'
  | 'offer_accepted'
  | 'appointment_scheduled'
  | 'inspection_in_progress'
  | 'inspection_declined'
  | 'down_payment_pending'
  | 'down_payment_paid'
  | 'down_payment_confirmed'
  | 'contract_issued'
  | 'contract_signed'
  | 'disbursed';

export interface PostApprovalMortgageOffer {
  sentAt: string;
  acceptedAt?: string;
  declinedAt?: string;
  acceptedTerms?: boolean;
}

export interface PostApprovalMortgageAppointment {
  scheduledAt: string;
  scheduledFor: string;
  notes?: string;
  location?: string;
}

export interface PostApprovalMortgageInspection {
  startedAt?: string;
  completedAt?: string;
  outcome?: 'completed' | 'declined_offer';
}

export interface PostApprovalMortgageDownPayment {
  requiredAmount: number;
  currency: string;
  paidAt?: string;
  channel?: string;
  providerReference?: string;
}

export interface PostApprovalMortgageContract {
  issuedAt?: string;
  documentUrl?: string;
  documentSource?: 'system_generated' | 'merchant_upload';
  documentFileName?: string;
  uploadedAt?: string;
  uploadedByMerchantId?: string;
  signedDocumentUrl?: string;
  signedDocumentFileName?: string;
  signedDocumentUploadedAt?: string;
  signedAt?: string;
  acceptedTerms?: boolean;
}

export interface PostApprovalFulfillment {
  status: PostApprovalMortgageStatus;
  offer?: PostApprovalMortgageOffer;
  appointment?: PostApprovalMortgageAppointment;
  inspection?: PostApprovalMortgageInspection;
  downPayment?: PostApprovalMortgageDownPayment;
  downPaymentConfirmedAt?: string;
  contract?: PostApprovalMortgageContract;
  completedAt?: string;
  disbursementDeferred?: boolean;
}

export interface PendingApprovedMortgageBankDetails {
  accountNumber?: string;
  bankName?: string;
  bankCode?: string;
  merchantReference?: string;
}

export interface PendingApprovedMortgageDetail {
  application: ProductApplication;
  postApprovalFulfillment?: PostApprovalFulfillment;
  requiredAmount?: number;
  currency?: string;
  centralWalletAvailable: boolean;
  bankDetails?: PendingApprovedMortgageBankDetails;
  offerLetter?: {
    html: string;
    text: string;
    reference: string;
    offerValidUntil: string;
    pdfUrl?: string;
    pdfFileName?: string;
    signedPdfUrl?: string;
    signedPdfFileName?: string;
  };
}

export interface PendingApprovedLoanDetail {
  application: ProductApplication;
  postApprovalFulfillment?: PostApprovalFulfillment;
  approvedAmount?: number;
  equityRequiredAmount?: number;
  currency?: string;
  centralWalletAvailable: boolean;
  offerLetter?: {
    html: string;
    text: string;
    reference: string;
    offerValidUntil: string;
    pdfUrl?: string;
    pdfFileName?: string;
    signedPdfUrl?: string;
    signedPdfFileName?: string;
  };
}

export interface PlataLoanWorkflowWebhookResult {
  application?: ProductApplication;
  duplicate: boolean;
  ignored?: boolean;
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

export interface ProductApplicationInitStatus {
  userId: string;
  productId: string;
  appId?: string;
  merchantId?: string;
  hasInitializedApplication: boolean;
  hasUpstreamAccount: boolean;
  application?: ProductApplication;
  upstreamAccount?: ProductApplicationWallet['upstreamAccount'];
  loanWorkflowStatus?: string;
  upstreamSyncError?: string;
}

export interface CreateProductApplicationRequest extends PlatformApplicationFieldInput {
  userId: string;
  productId: string;
  amount: number;
  /** COMMODITY: number of units to purchase. Total paid = unit price × quantity (server-computed). */
  quantity?: number;
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

export interface SaveProductApplicationProgressRequest extends PlatformApplicationFieldInput {
  userId?: string;
  currentStep?: string;
  currentTab?: string;
  requirementDrafts?: ProductRequirementSubmission[];
  uploadedDrafts?: ProductRequirementSubmission[];
  guarantorDrafts?: Record<string, unknown>[];
  metadata?: Record<string, unknown>;
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

/** Early spouse co-repayment KYC (LOAN/MORTGAGE), mirrors guarantor body shape. */
export interface CreateApplicationSpouseKycRequest {
  userId?: string;
  fullName: string;
  email: string;
  phone: string;
  occupation?: string;
  relationship?: string;
  country?: string;
}

export interface SubmitProductApplicationRequest extends PlatformApplicationFieldInput {
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
  status: 'BLACKLISTED';
  reason?: string;
}

/** Query filters for listing or summarizing product applications. */
export interface ApplicationListQuery {
  merchantId?: string;
  userId?: string;
  productId?: string;
  appId?: string;
  status?: ProductApplicationStatus;
  productType?: string;
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ProductApplicationListResult {
  applications: ProductApplication[];
  pagination: PaginationMeta;
}

/** Status counts for merchant customer application dashboards. */
export interface ApplicationSummary {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  blacklisted: number;
}
