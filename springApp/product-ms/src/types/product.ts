export type ProductDiscriminator = 'LOAN' | 'MORTGAGE' | 'SAVINGS' | 'INVESTMENT' | 'COMMODITY';

export interface ProductStructure {
  interestRate?: number | string;
  interestMethod?: string;
  amortizationSchedule?: string;
  allowMoratorium?: boolean;
  moratoriumType?: string;
  moratorium?: Record<string, unknown> | number;
  repaymentWorkflow?: string;
  loanAmount?: { min?: number; max?: number };
  repaymentSchedule?: string;
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
  loanTypes?: Array<{ name: string; description: string }>;
  mortgageTypes?: Array<{ name: string; description: string }>;
  savingsTypes?: Array<{ name: string; description: string }>;
  investmentTypes?: Array<{ name: string; description: string }>;
  commodityTypes?: Array<{ name: string; description: string }>;
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
    uploadRequired?: boolean;
  }>;
  contractId?: string;
  airSignSecretKey?: string;
  airSignUid?: string;
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

export interface MortgageProperty {
  name?: string;
  propertyType?: string;
  value?: number | string;
  location?: string;
  previewAssetUrl?: string;
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
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
  structure?: ProductStructure;
  about?: LoanAbout;
  requirements?: LoanRequirements;
  feesAndCharges?: LoanFeesAndCharges;
  baseFeesAndCharges?: LoanFeesAndCharges;
  merchantFeeAdditions?: LoanFeesAndCharges;
  properties?: MortgageProperty[];
  config?: ProductTypeConfig;
  equityContribution?: number;
  propertyValue?: number;
  price?: number;
  minimumQuantity?: number;
  unitOfMeasure?: string;
  commodityPrices?: CommodityPriceEntry[];
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
  metadata?: Record<string, unknown>;
  structure?: ProductStructure;
  about?: LoanAbout;
  requirements?: LoanRequirements;
  feesAndCharges?: LoanFeesAndCharges;
  baseFeesAndCharges?: LoanFeesAndCharges;
  merchantFeeAdditions?: LoanFeesAndCharges;
  properties?: MortgageProperty[];
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
  metadata?: Record<string, unknown>;
  structure?: ProductStructure;
  about?: LoanAbout;
  requirements?: LoanRequirements;
  feesAndCharges?: LoanFeesAndCharges;
  baseFeesAndCharges?: LoanFeesAndCharges;
  merchantFeeAdditions?: LoanFeesAndCharges;
  properties?: MortgageProperty[];
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