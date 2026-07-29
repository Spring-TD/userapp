import type { Product } from './product';
import type { ProductRequirementSubmission } from './productApplication';

export interface UpstreamExternalPerson {
  id: string;
  name: string;
  email: string;
  phone: string;
  bvn?: string;
}

export interface SubmitUpstreamExternalApplicationInput {
  localApplicationId: string;
  /** Spring create-app app id (local storefront scope). */
  localAppId: string;
  /** Integrator merchant id on the Spring platform (parent / API-key owner external ref). */
  integratorMerchantId: string;
  integratorMerchantName?: string;
  /** Merchant that presented the product to the applicant (storefront / sub-merchant). */
  offeringMerchantId: string;
  offeringMerchantName?: string;
  product: Product;
  userId: string;
  applicantName?: string;
  email?: string;
  phone?: string;
  bvn?: string;
  country?: string;
  amount: number;
  currency: string;
  requirementSubmissions: ProductRequirementSubmission[];
  subMerchant?: UpstreamExternalPerson;
  productCreatorMerchantName?: string;
  /** Sub-merchant (tenant) contact — used to auto-build `subMerchant` when omitted. */
  subMerchantContactEmail?: string;
  subMerchantContactPhone?: string;
}

export interface SubmitUpstreamExternalApplicationResult {
  upstreamApplicationId?: string;
  applicationCreated?: boolean;
  upstreamAccount?: {
    accountNumber?: string;
    bankName?: string;
    bankCode?: string;
    providerReference?: string;
    provisionStatus?: string;
    provisionError?: string;
  };
  skipped?: boolean;
  skipReason?: string;
}

import type { ValidatedPlatformApplicationFields } from './platformApplicationFields';

export interface SubmitUpstreamFinalApplicationInput {
  localApplicationId: string;
  product: Product;
  userId: string;
  applicantName: string;
  email: string;
  phone: string;
  bvn: string;
  country?: string;
  offeringMerchantId: string;
  offeringMerchantName?: string;
  contractSnapshot: Record<string, unknown>;
  requirementSubmissions: ProductRequirementSubmission[];
  submittedAt: string;
  platformFields?: ValidatedPlatformApplicationFields;
  /** Frozen Spring auth+kyc+application profile for Plata merchant review. */
  applicantProfileSnapshot?: Record<string, unknown>;
}

export interface SubmitUpstreamFinalApplicationResult {
  upstreamApplicationId?: string;
  applicationCreated?: boolean;
  guarantorKyc?: UpstreamGuarantorKycResult[];
  skipped?: boolean;
  skipReason?: string;
}

export interface ResolveUpstreamApplicationForGuarantorInput {
  localApplicationId: string;
  product: Product;
  userId: string;
  applicantName: string;
  email: string;
  phone: string;
  bvn: string;
  offeringMerchantId: string;
  offeringMerchantName?: string;
  country?: string;
  amount: number;
  currency: string;
}

export interface ResolveUpstreamApplicationForGuarantorResult {
  upstreamApplicationId: string;
  applicationCreated: boolean;
}

export interface UpstreamGuarantorKycInput {
  guarantorId?: string;
  fullName: string;
  email: string;
  phone: string;
  occupation?: string;
  relationship?: string;
  country?: string;
}

export interface UpstreamGuarantorKycResult extends UpstreamGuarantorKycInput {
  id: string;
  provider?: string;
  providerReference?: string;
  verificationUrl?: string;
  status?: string;
  raw?: unknown;
}

export type UpstreamSpouseKycInput = Omit<UpstreamGuarantorKycInput, 'guarantorId'>;

export interface UpstreamSpouseKycResult extends UpstreamSpouseKycInput {
  id: string;
  provider?: string;
  providerReference?: string;
  verificationUrl?: string;
  status?: string;
  raw?: unknown;
}

/** Instant SAVINGS enrollment on Plata (product creator app + global product id). */
export interface SubmitSavingsEnrollmentInput {
  localApplicationId: string;
  product: Product;
  userId: string;
  applicantName: string;
  email: string;
  phone: string;
  bvn: string;
  country?: string;
  currency: string;
  offeringMerchantId: string;
  offeringMerchantName?: string;
  contractSnapshot: Record<string, unknown>;
  /** Platform-mandated applicant fields required by Plata on submitted applications. */
  isPoliticallyExposedPerson?: boolean;
  monthlyIncome?: number;
  repaymentSource?: string;
  repaymentSourceOther?: string;
  maritalStatus?: string;
  maritalStatusOther?: string;
}
