export type ProductDiscriminator = 'LOAN' | 'MORTGAGE' | 'SAVINGS' | 'INVESTMENT' | 'COMMODITY';

export interface ProductStructure {
  interestRate?: number | string;
  interestMethod?: string;
  amortizationSchedule?: string;
  allowMoratorium?: boolean;
  /** LOAN only — ignored on MORTGAGE when present. */
  autoApproveLoans?: boolean;
  moratoriumType?: string;
  moratorium?: Record<string, unknown> | number;
  repaymentWorkflow?: string;
  loanAmount?: { min?: number; max?: number };
  repaymentSchedule?: string;
  /** MORTGAGE uses repaymentStructure instead of repaymentSchedule. */
  repaymentStructure?: string;
  repaymentFrequency?: string;
  acceptableNPA?: string;
  equityRequirement?: string;
  savingsType?: string;
  withdrawalFlexibility?: string;
  savingsAmount?: { min?: number; max?: number };
  savingsTermsAndCondition?: string;
  contractId?: string;
  airSignSecretKey?: string;
  airSignUid?: string;
  returnsOnInvestment?: number | string;
  investmentType?: string;
  investmentAmount?: { min?: number; max?: number };
  investmentTermsAndCondition?: string;
  enableUnitInvestmentPurchase?: boolean;
  unitAmount?: number | string | { amount?: number | string; minQuantity?: number };
  yieldMethod?: string;
  offerYieldEnabled?: boolean;
  offerYield?: number | string;
  minQuantityPurchase?: number;
  maxAmount?: number;
  commodityTermsAndCondition?: string;
}

export interface LoanAbout {
  tenure?: Record<string, unknown> | string | number;
  duration?: Record<string, unknown> | string | number;
  loanTypes?: Array<{ name?: string; description?: string }>;
  mortgageTypes?: Array<{ name?: string; description?: string }>;
  savingsTypes?: Array<{ name?: string; description?: string }>;
  investmentTypes?: Array<{ name?: string; description?: string }>;
  commodityTypes?: Array<{ name?: string; description?: string }>;
  previewAssetUrl?: string;
}

export interface LoanRequirements {
  security?: {
    acceptCheque?: boolean;
    realEstateProperties?: boolean;
    otherProperties?: boolean;
    guarantor?: boolean;
    bankGuarantee?: boolean;
    savingsAccount?: boolean;
    noSecurity?: boolean;
  };
  documentsToDownload?: Array<{ name: string; fileUrl?: string }>;
  otherRequirements?: Array<{
    requirementType?: string;
    contentType?: string;
    description?: string;
    templateFileUrl?: string;
    uploadRequired?: boolean;
  }>;
  contractId?: string;
  airSignSecretKey?: string;
  airSignUid?: string;
}

export interface MortgageProperty {
  name?: string;
  propertyType?: string;
  value?: number | string;
  location?: string;
  propertyDescription?: string;
  facilities?: string[];
  customFacilities?: string[];
  imageUrls?: string[];
  videoUrl?: string;
  /** Legacy / Spring-only preview field (kept for backward compatibility). */
  previewAssetUrl?: string;
  [key: string]: unknown;
}

export interface MortgageInspectionDateSlot {
  scheduledFor: string;
  label?: string;
  location?: string;
  notes?: string;
}

export interface CommodityPriceEntry {
  price?: number | string;
  date?: string;
  source?: string;
}

export interface LoanFeesAndCharges {
  fees?: Array<{ name: string; feeType?: string; value?: string }>;
  deductAllChargesOnLoan?: boolean;
  customerPaysChargesBeforeDisbursement?: boolean;
  lateRepayment?: {
    enabled?: boolean;
    penalties?: Array<{
      name?: string;
      penaltyType?: string;
      value?: string;
      triggerDurationDays?: number;
    }>;
  };
  chargeForForcefulWithdrawal?: boolean;
  forcefulWithdrawalPenalties?: Array<{
    name?: string;
    penaltyType?: string;
    value?: string;
    triggerDurationDays?: number;
  }>;
  contractId?: string;
  airSignSecretKey?: string;
  airSignUid?: string;
}

export interface ProductTypeConfig {
  compoundingFrequency?: string;
  lockInPeriodDays?: number;
  minBalance?: number;
  [key: string]: unknown;
}

export interface Product {
  id: string;
  upstreamProductId?: string;
  upstreamAppId?: string;
  referenceNumber: string;
  name: string;
  description: string;
  type: ProductDiscriminator;
  subType?: string;
  appId: string;
  status: 'complete' | 'incomplete';
  isActive: boolean;
  /** Merchant storefront: highlight turned-on products; only meaningful when `isActive` is true. */
  isFeatured?: boolean;
  /** Copied from Plata; applicants must upload a signature when true. */
  requireApplicantSignature?: boolean;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
  structure?: ProductStructure;
  about?: LoanAbout;
  requirements?: LoanRequirements;
  feesAndCharges?: LoanFeesAndCharges;
  /** Fee snapshot copied from Plata/creator when the product is first turned on for this app. */
  baseFeesAndCharges?: LoanFeesAndCharges;
  /**
   * Spring merchant mark-ups only. May include **Management Fee** additions;
   * other fees / late-repayment / forceful-withdrawal charges are rejected.
   */
  merchantFeeAdditions?: LoanFeesAndCharges;
  baseStructure?: ProductStructure;
  merchantStructureAdditions?: Partial<ProductStructure>;
  baseEquityContribution?: number;
  merchantEquityAddition?: number;
  properties?: MortgageProperty[];
  mortgageWorkflowStepOrder?: string[];
  inspectionDates?: MortgageInspectionDateSlot[];
  config?: ProductTypeConfig;
  equityContribution?: number;
  propertyValue?: number;
  price?: number;
  minimumQuantity?: number;
  unitOfMeasure?: string;
  commodityPrices?: CommodityPriceEntry[];
  /** Product creator metadata returned by the upstream Plata catalog. */
  merchant?: {
    id?: string;
    name?: string | null;
    companyName?: string | null;
    companyLogoUrl?: string | null;
    website?: string | null;
  };
}

export interface CreateProductRequest {
  upstreamProductId?: string;
  upstreamAppId?: string;
  name: string;
  description: string;
  type: string;
  subType?: string;
  appId: string;
  isActive?: boolean;
  isFeatured?: boolean;
  metadata?: Record<string, unknown>;
  structure?: ProductStructure;
  about?: LoanAbout;
  requirements?: LoanRequirements;
  feesAndCharges?: LoanFeesAndCharges;
  /** Fee snapshot copied from Plata/creator when the product is first turned on for this app. */
  baseFeesAndCharges?: LoanFeesAndCharges;
  /**
   * Spring merchant mark-ups only. May include **Management Fee** additions;
   * other fees / late-repayment / forceful-withdrawal charges are rejected.
   */
  merchantFeeAdditions?: LoanFeesAndCharges;
  baseStructure?: ProductStructure;
  merchantStructureAdditions?: Partial<ProductStructure>;
  baseEquityContribution?: number;
  merchantEquityAddition?: number;
  properties?: MortgageProperty[];
  mortgageWorkflowStepOrder?: string[];
  inspectionDates?: MortgageInspectionDateSlot[];
  config?: ProductTypeConfig;
  commodityPrices?: CommodityPriceEntry[];
}

export interface UpdateProductRequest {
  upstreamProductId?: string;
  upstreamAppId?: string;
  name?: string;
  description?: string;
  type?: string;
  subType?: string;
  status?: 'complete' | 'incomplete';
  isActive?: boolean;
  isFeatured?: boolean;
  metadata?: Record<string, unknown>;
  structure?: ProductStructure;
  about?: LoanAbout;
  requirements?: LoanRequirements;
  feesAndCharges?: LoanFeesAndCharges;
  /** Fee snapshot copied from Plata/creator when the product is first turned on for this app. */
  baseFeesAndCharges?: LoanFeesAndCharges;
  /**
   * Spring merchant mark-ups only. May include **Management Fee** additions;
   * other fees / late-repayment / forceful-withdrawal charges are rejected.
   */
  merchantFeeAdditions?: LoanFeesAndCharges;
  baseStructure?: ProductStructure;
  merchantStructureAdditions?: Partial<ProductStructure>;
  baseEquityContribution?: number;
  merchantEquityAddition?: number;
  properties?: MortgageProperty[];
  mortgageWorkflowStepOrder?: string[];
  inspectionDates?: MortgageInspectionDateSlot[];
  config?: ProductTypeConfig;
  equityContribution?: number;
  propertyValue?: number;
  price?: number;
  minimumQuantity?: number;
  unitOfMeasure?: string;
  commodityPrices?: CommodityPriceEntry[];
}

export interface ProductResponse {
  success: boolean;
  message?: string;
  data?: Product;
  error?: string;
}

// New interface for selecting product type after receiving create-app ID
export interface SelectProductTypeRequest {
  appId: string;
  type: string;
}

// New interface for creating product after type selection
export interface CreateProductAfterTypeRequest {
  productId: string;
  name: string;
  description: string;
}