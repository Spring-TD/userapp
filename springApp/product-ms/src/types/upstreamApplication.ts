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
  skipped?: boolean;
  skipReason?: string;
}
