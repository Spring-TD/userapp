import type { UserProductApplication } from './userProductApplication';
import type { UserProductApplicationPayoutSplit } from './userProductApplication';
import type { ApplicationSubmittedRequirement } from './applicationSubmittedRequirement';
import type { RepaymentSource } from './repaymentSource';
import type { MaritalStatus } from './maritalStatus';
import type { LoanReason } from './loanReason';

export interface ExternalProductApplicationPerson {
  id: string;
  name: string;
  email: string;
  phone: string;
  bvn?: string;
  firstName?: string;
  lastName?: string;
  otherNames?: string;
  gender?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  address?: string;
  accountTier?: string;
}

export interface ExternalProductApplicationPayload {
  contractSnapshot: Record<string, unknown>;
  payoutSplit?: UserProductApplicationPayoutSplit;
  localApplicationId?: string;
  merchantProductId?: string;
  status?: 'draft' | 'submitted' | 'signed' | 'cancelled' | 'withdrawn';
  submittedAt?: string;
  signedAt?: string;
  snapshotVersion?: number;
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
}

export interface SubmitExternalProductApplicationInput {
  plataMerchantId: string;
  plataMerchantName?: string;
  apiKeyId?: string;
  gatewayEnvironment?: string;
  appId: string;
  productId: string;
  productName?: string;
  merchantId?: string;
  merchantName?: string;
  offeringMerchantId: string;
  offeringMerchantName?: string;
  subMerchant?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  user: ExternalProductApplicationPerson;
  application: ExternalProductApplicationPayload;
  loanWorkflowCallbackUrl?: string;
  guarantorKycCallbackUrl?: string;
  currency?: string;
  country?: string;
  productCreatorMerchantName?: string;
}

export interface CreateExternalProductAccountInput {
  plataMerchantId: string;
  apiKeyId?: string;
  gatewayEnvironment?: string;
  appId: string;
  productId: string;
  user: ExternalProductApplicationPerson;
  currency?: string;
  country?: string;
}

export interface CreateExternalProductAccountResult {
  externalPlatformMerchantId: string;
  productCreatorMerchantId: string;
  productCreatorCompanyName: string | null;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    user_ref?: string;
    created: boolean;
  };
  wallet: {
    id: string;
    userId: string;
    merchantId: string;
    currency: string;
    virtualNuban?: {
      accountType: string;
      provisionStatus: string;
      provider?: string;
      accountNumber?: string;
      bankName?: string;
      bankCode?: string;
      providerReference?: string;
      provisionError?: string;
      provisionedAt?: Date | string;
    };
    payonusNubanProvisionStatus?: string;
    payonusNubanAccountNumber?: string;
    payonusNubanBankName?: string;
    payonusNubanBankCode?: string;
    payonusNubanProviderReference?: string;
    created: boolean;
  };
}

export interface SubmitExternalProductApplicationResult {
  externalPlatformMerchantId: string;
  productCreatorMerchantId: string;
  user: CreateExternalProductAccountResult['user'];
  wallet: CreateExternalProductAccountResult['wallet'];
  application: UserProductApplication;
  applicationCreated: boolean;
  usageEventRecorded: boolean;
}
