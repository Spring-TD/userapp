export type ProductDiscriminator = 'LOAN' | 'MORTGAGE' | 'SAVINGS' | 'INVESTMENT' | 'COMMODITY';

/**
 * Structure tab — fields vary by product type; only populate paths your UI uses.
 */
export interface ProductStructure {
  interestRate?: number | string;
  /**
   * LOAN/MORTGAGE: `GET /options/interest-method` — `fixed_amount` | `reducing_balance`.
   * SAVINGS: same values via `GET /options/savings-interest-method` → `structure.interestMethod`.
   */
  interestMethod?: string;
  /** LOAN/MORTGAGE: use `GET /options/amortization` values (`equal_instalment` | `equal_principal` | `reducing_balance`). */
  amortizationSchedule?: string;
  /**
   * LOAN/MORTGAGE: if false/omitted, treat moratorium as off for this product (UI “Allow moratorium” toggle).
   * Loan/repayment services should check this before applying `moratorium`.
   */
  allowMoratorium?: boolean;
  /** LOAN/MORTGAGE: `GET /options/moratorium-type` — `grace_on_principal` | `grace_on_interest` | `grace_on_both` */
  moratoriumType?: string;
  /** LOAN/MORTGAGE: moratorium length (often months from `GET /options/moratorium`). INVESTMENT: days as number when enabled. */
  moratorium?: Record<string, unknown> | number;
  /**
   * LOAN/MORTGAGE allocation order for repayments. Use `GET /options/repayment-workflow` values:
   * `principal_interest_charges` | `charges_principal_interest` | `interest_charges_principal`.
   * (Product service stores the choice; loan repayment engines should read this when splitting payments.)
   */
  repaymentWorkflow?: string;
  loanAmount?: { min?: number; max?: number };
  /**
   * LOAN/MORTGAGE: use `GET /options/repayment-schedule` values (`equal_monthly_instalments` |
   * `bullet_repayment` | `interest_only` | `principal_only_fixed_principal` | `balloon_payment`).
   */
  repaymentSchedule?: string;
  /** LOAN/MORTGAGE: often `GET /options/repayment-cycle` values (`Monthly` | `Quarterly` | …). */
  repaymentFrequency?: string;
  /** LOAN/MORTGAGE: use `GET /options/acceptable-npa` values (`30` | `60` | `90` | `120` | `180` as strings). */
  acceptableNPA?: string;
  /** LOAN/MORTGAGE: use `GET /options/equity-requirement` values (`zero_down` | `fixed_amount` | `percentage_based`). */
  equityRequirement?: string;
  /** SAVINGS — Structure tab: `GET /options/savings-type` — `fixed_savings` | `flexible_savings`. */
  savingsType?: string;
  /** SAVINGS / INVESTMENT / COMMODITY: `GET /options/withdrawal-flexibility` — `anytime` | `weekly` | … */
  withdrawalFlexibility?: string;
  savingsAmount?: { min?: number; max?: number };
  savingsTermsAndCondition?: string;
  contractId?: string;
  airSignSecretKey?: string;
  airSignUid?: string;
  /** INVESTMENT — Structure tab */
  returnsOnInvestment?: number | string;
  /** Structure dropdown (distinct from `about.investmentTypes[]` line items) */
  investmentType?: 'lump_sum' | 'unit_based';
  investmentAmount?: { min?: number; max?: number };
  investmentTermsAndCondition?: string;
  enableUnitInvestmentPurchase?: boolean;
  /**
   * INVESTMENT: `{ amount, minQuantity }`. COMMODITY Structure tab: single per-unit value (number or string).
   */
  unitAmount?: number | string | { amount?: number | string; minQuantity?: number };
  /** COMMODITY — Structure tab */
  yieldMethod?: string;
  offerYieldEnabled?: boolean;
  offerYield?: number | string;
  minQuantityPurchase?: number;
  maxAmount?: number;
  commodityTermsAndCondition?: string;
}

/** LOAN / MORTGAGE / SAVINGS / INVESTMENT — About Product tab */
export interface LoanAbout {
  /** LOAN / MORTGAGE — term dropdown key or { value, unit, label } */
  tenure?: Record<string, unknown> | string | number;
  /** SAVINGS / INVESTMENT — duration dropdown key or structured value */
  duration?: Record<string, unknown> | string | number;
  /** LOAN — repeatable line items (e.g. product lines). */
  loanTypes?: Array<{ name: string; description: string }>;
  /** MORTGAGE — repeatable mortgage types (name + description per row). */
  mortgageTypes?: Array<{ name: string; description: string }>;
  savingsTypes?: Array<{ name: string; description: string }>;
  investmentTypes?: Array<{ name: string; description: string }>;
  commodityTypes?: Array<{ name: string; description: string }>;
  /** URL or storage key from upload (e.g. PDF preview) */
  previewAssetUrl?: string;
}

/** LOAN / MORTGAGE — Requirements tab */
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
  /**
   * Extra rules shown during loan apply. **`contentType`** controls applicant UI and now supports
   * `document_upload` and `document_template`. Answers/files are stored by the application service, not here.
   */
  otherRequirements?: Array<{
    /** Short label for the row (e.g. “Account Statement”). */
    requirementType?: string;
    /** `GET /options/loan-other-requirement-content-type` — `document_upload` | `document_template`. */
    contentType?: string;
    /** Instructions/description shown to the applicant (required when `contentType` is `document_upload`). */
    description?: string;
    /**
     * For `document_template`: uploaded template file URL/storage key that applicants can download, fill, and submit.
     */
    templateFileUrl?: string;
    /** For `document_upload`: if true, applicant must attach a file. */
    uploadRequired?: boolean;
  }>;
  contractId?: string;
  airSignSecretKey?: string;
  airSignUid?: string;
}

/** COMMODITY — Commodity Price tab (list replaces on full PUT send). */
export interface CommodityPriceEntry {
  price?: number | string;
  /** ISO string or display string from the date picker */
  date?: string;
  source?: string;
}

/** LOAN / MORTGAGE / SAVINGS / INVESTMENT / COMMODITY — Fees & Charges tab */
export interface LoanFeesAndCharges {
  /**
   * Merchant-defined rows: **`name`**, **`feeType`** from `GET /options/fee-type` (`Flat` | `Percent`),
   * **`value`** = flat money amount (e.g. `"10000"`) or percentage (e.g. `"5"` or `"5%"` — formatting is up to your UI).
   */
  fees?: Array<{ name: string; feeType?: string; value?: string }>;
  deductAllChargesOnLoan?: boolean;
  customerPaysChargesBeforeDisbursement?: boolean;
  lateRepayment?: {
    enabled?: boolean;
    penalties?: Array<{
      name?: string;
      /** `GET /options/penalty-type` — `Flat` | `Percent`. */
      penaltyType?: string;
      value?: string;
      triggerDurationDays?: number;
    }>;
  };
  /**
   * SAVINGS / INVESTMENT — master toggle for the forceful-withdrawal penalty block in the admin UI.
   * When **off**, hide/disable the penalty row(s); when **on**, show **Name of penalty**, **Type** (`penaltyType`), **Value**.
   */
  chargeForForcefulWithdrawal?: boolean;
  /**
   * Rows for forceful-withdrawal penalties (only meaningful when **`chargeForForcefulWithdrawal`** is true).
   * **Type** column → **`penaltyType`**: `GET /options/penalty-type` — **`Flat`** (numeric / currency **`value`**) or **`Percent`** (percentage **`value`**, e.g. `"5"`).
   */
  forcefulWithdrawalPenalties?: Array<{
    name?: string;
    /** `GET /options/penalty-type` — `Flat` | `Percent`. */
    penaltyType?: string;
    value?: string;
    triggerDurationDays?: number;
  }>;
  /** INVESTMENT — AirSign on Fees tab (optional elsewhere) */
  contractId?: string;
  airSignSecretKey?: string;
  airSignUid?: string;
}

/** MORTGAGE — Properties tab (collateral / sample assets linked to the product). */
export interface MortgageProperty {
  name?: string;
  propertyType?: string;
  value?: number | string;
  location?: string;
  propertyDescription?: string;
  /**
   * Property facilities selected by the frontend. Suggested values are available from
   * `GET /api/v1/products/options/mortgage-facilities`, but custom values are allowed.
   */
  facilities?: string[];
  /** Free-text facilities entered via "Add custom facility". */
  customFacilities?: string[];
  /** One or more uploaded property image URLs/storage keys. */
  imageUrls?: string[];
  videoUrl?: string;
}

/** COMMODITY optional legacy/extra blob — prefer typed `about` / `structure` / `feesAndCharges` / `commodityPrices`. */
export interface ProductTypeConfig {
  compoundingFrequency?: string;
  lockInPeriodDays?: number;
  minBalance?: number;
  [key: string]: unknown;
}

export interface ProductAmountProjection {
  principal: number;
  projectedInterestOrYield: number;
  projectedTotalValue: number;
  projectedPeriodicPayment?: number;
}

export interface ProductConfigCalculations {
  basis: {
    type: ProductDiscriminator;
    tenureMonths?: number;
    annualRatePercent?: number;
    repaymentFrequency?: string;
  };
  projections?: {
    minimum?: ProductAmountProjection;
    maximum?: ProductAmountProjection;
  };
  fees?: {
    minimum?: number;
    maximum?: number;
  };
  mortgage?: {
    equityContributionPercent?: number;
    propertyValue?: number;
    estimatedDownPayment?: number;
    estimatedFinancedAmount?: number;
  };
  savings?: {
    savingsType?: string;
    withdrawalFlexibility?: string;
  };
  investment?: {
    unitPrice?: number;
    minimumUnits?: number;
    minimumTicketSize?: number;
  };
  commodity?: {
    unitPrice?: number;
    minimumQuantity?: number;
    estimatedMinimumNotional?: number;
    offerYieldPercent?: number;
    projectedUnitPriceWithYield?: number;
    recentPrice?: number;
    averageHistoricalPrice?: number;
    lowestHistoricalPrice?: number;
    highestHistoricalPrice?: number;
    projectedGrossMarginPerUnit?: number;
    projectedGrossMarginPercent?: number;
  };
}

export interface Product {
  id: string;
  referenceNumber: string;
  name: string;
  description: string;
  /** Mongoose discriminator key — canonical values: LOAN, MORTGAGE, SAVINGS, INVESTMENT, COMMODITY */
  type: ProductDiscriminator;
  subType?: string;
  appId: string;
  status: 'complete' | 'incomplete';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** Arbitrary cross-cutting metadata */
  metadata?: Record<string, unknown>;
  structure?: ProductStructure;
  about?: LoanAbout;
  requirements?: LoanRequirements;
  feesAndCharges?: LoanFeesAndCharges;
  /** MORTGAGE — Properties tab */
  properties?: MortgageProperty[];
  config?: ProductTypeConfig;
  equityContribution?: number;
  propertyValue?: number;
  price?: number;
  minimumQuantity?: number;
  unitOfMeasure?: string;
  /** COMMODITY — Commodity Price tab */
  commodityPrices?: CommodityPriceEntry[];
  /** Derived configuration math engine output (computed at read time). */
  calculatedConfig?: ProductConfigCalculations;
  /** Product-creator merchant projection (for catalog / settlement). */
  merchant?: {
    id: string;
    name?: string | null;
    companyName?: string | null;
    companyLogoUrl?: string | null;
    website?: string | null;
  };
  /** Convenience alias used by external application flows (`merchant.companyName`). */
  companyName?: string | null;
  /** When true, external submit requires applicant signature upload (non-draft). */
  requireApplicantSignature?: boolean;
}

/** Optional: when set, product-ms sends email + in-app (notifications-ms send-dual) after create/update. */
export interface ProductNotifyRecipient {
  userId: string;
  email: string;
  merchantName?: string;
}

export interface CreateProductRequest {
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
  properties?: MortgageProperty[];
  config?: ProductTypeConfig;
  commodityPrices?: CommodityPriceEntry[];
  notifyRecipient?: ProductNotifyRecipient;
}

export interface UpdateProductRequest {
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
  properties?: MortgageProperty[];
  config?: ProductTypeConfig;
  equityContribution?: number;
  propertyValue?: number;
  price?: number;
  minimumQuantity?: number;
  unitOfMeasure?: string;
  commodityPrices?: CommodityPriceEntry[];
  notifyRecipient?: ProductNotifyRecipient;
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