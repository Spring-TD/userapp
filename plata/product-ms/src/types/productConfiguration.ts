// Product configuration interfaces for different product types

// Moratorium values (1-12 representing months)
export type MoratoriumMonths = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

// Available moratorium options for frontend
export const MORATORIUM_OPTIONS: Array<{ value: MoratoriumMonths; label: string }> = [
  { value: 1, label: '1 month' },
  { value: 2, label: '2 months' },
  { value: 3, label: '3 months' },
  { value: 4, label: '4 months' },
  { value: 5, label: '5 months' },
  { value: 6, label: '6 months' },
  { value: 7, label: '7 months' },
  { value: 8, label: '8 months' },
  { value: 9, label: '9 months' },
  { value: 10, label: '10 months' },
  { value: 11, label: '11 months' },
  { value: 12, label: '12 months' }
];

/**
 * LOAN / MORTGAGE — “Select Duration” (longer product term style range).
 * Use **`GET /options/moratorium-duration`**. For the shorter “Duration of Moratorium” field, use **`GET /options/moratorium`** (1–12 months).
 */
export const MORATORIUM_DURATION_OPTIONS: Array<{ value: number; label: string }> = Array.from(
  { length: 60 },
  (_, i) => {
    const n = i + 1;
    return { value: n, label: n === 1 ? '1 month' : `${n} months` };
  }
);

/**
 * LOAN / MORTGAGE — “Type of moratorium” dropdown (grace applies to principal vs interest).
 * Distinct from **`/options/moratorium`**, which is moratorium **length in months**.
 */
export type LoanMoratoriumType = 'grace_on_principal' | 'grace_on_interest' | 'grace_on_both';

export const LOAN_MORATORIUM_TYPE_OPTIONS: Array<{ value: LoanMoratoriumType; label: string }> = [
  { value: 'grace_on_principal', label: 'Grace on principal' },
  { value: 'grace_on_interest', label: 'Grace on interest' },
  { value: 'grace_on_both', label: 'Grace on both interest and Principal' }
];

// Loan tenure unit (used in loanTenure and mortgage configs)
export type LoanTenureUnit = 'year' | 'month' | 'week' | 'day';

export type LoanTenureOption = {
  value: number | 'custom';
  unit: LoanTenureUnit;
  label: string;
  allowManualEntry?: boolean;
};

// Available loan tenure options for frontend (value + unit for dropdowns; months-only product admin list)
export const LOAN_TENURE_OPTIONS: LoanTenureOption[] = [
  { value: 3, unit: 'month', label: '3 months' },
  { value: 6, unit: 'month', label: '6 months' },
  { value: 12, unit: 'month', label: '12 months' },
  { value: 24, unit: 'month', label: '24 months' },
  { value: 36, unit: 'month', label: '36 months' },
  { value: 48, unit: 'month', label: '48 months' },
  { value: 60, unit: 'month', label: '60 months' },
  { value: 72, unit: 'month', label: '72 months' },
  { value: 'custom', unit: 'month', label: 'Custom', allowManualEntry: true }
];

// Repayment cycle options
export type RepaymentCycle = 'Daily' | 'Monthly' | 'Quarterly' | 'Bi-annually' | 'Annually';

// Available repayment cycle options for frontend
export const REPAYMENT_CYCLE_OPTIONS: Array<{ value: RepaymentCycle; label: string }> = [
  { value: 'Daily', label: 'Daily' },
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Quarterly', label: 'Quarterly' },
  { value: 'Bi-annually', label: 'Bi-annually' },
  { value: 'Annually', label: 'Annually' }
];

// Amortization schedule (Loan / Mortgage — `structure.amortizationSchedule`)
export type AmortizationMethod = 'equal_instalment' | 'equal_principal' | 'reducing_balance';

// Available amortization schedule options for frontend (`GET /options/amortization`)
export const AMORTIZATION_OPTIONS: Array<{ value: AmortizationMethod; label: string }> = [
  { value: 'equal_instalment', label: 'Equal Instalment' },
  { value: 'equal_principal', label: 'Equal Principal Repayment' },
  { value: 'reducing_balance', label: 'Reducing Balance' }
];

/** LOAN / MORTGAGE — Structure tab “Interest method” (distinct from amortization schedule). */
export type LoanInterestMethod = 'fixed_amount' | 'reducing_balance';

export const LOAN_INTEREST_METHOD_OPTIONS: Array<{ value: LoanInterestMethod; label: string }> = [
  { value: 'fixed_amount', label: 'Fixed amount' },
  { value: 'reducing_balance', label: 'Reducing balance' }
];

/** SAVINGS — Structure `interestMethod` (`GET /options/savings-interest-method`); same values as LOAN interest method. */
export const SAVINGS_INTEREST_METHOD_OPTIONS: Array<{ value: LoanInterestMethod; label: string }> = [
  ...LOAN_INTEREST_METHOD_OPTIONS
];

/** SAVINGS / INVESTMENT / COMMODITY — `structure.withdrawalFlexibility`. */
export type WithdrawalFlexibilityOption = 'anytime' | 'weekly' | 'monthly' | 'yearly' | 'by_schedule';

export const WITHDRAWAL_FLEXIBILITY_OPTIONS: Array<{
  value: WithdrawalFlexibilityOption;
  label: string;
}> = [
  { value: 'anytime', label: 'Anytime' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'by_schedule', label: 'By schedule' }
];

/**
 * LOAN / MORTGAGE — Structure tab “Repayment workflow” (allocation order for incoming repayments).
 * Persist exactly one `value` on `structure.repaymentWorkflow`. Downstream loan/repayment services
 * should read this field when applying payment waterfalls (product-ms only stores configuration).
 */
export type LoanRepaymentWorkflow =
  | 'principal_interest_charges'
  | 'charges_principal_interest'
  | 'interest_charges_principal';

export const LOAN_REPAYMENT_WORKFLOW_OPTIONS: Array<{ value: LoanRepaymentWorkflow; label: string }> = [
  { value: 'principal_interest_charges', label: 'Principal → Interest → Charges' },
  { value: 'charges_principal_interest', label: 'Charges → Principal → Interest' },
  { value: 'interest_charges_principal', label: 'Interest → Charges → Principal' }
];

/** LOAN / MORTGAGE — Structure tab “Equity requirement” (`structure.equityRequirement`). */
export type LoanEquityRequirement = 'zero_down' | 'fixed_amount' | 'percentage_based';

export const LOAN_EQUITY_REQUIREMENT_OPTIONS: Array<{ value: LoanEquityRequirement; label: string }> = [
  { value: 'zero_down', label: 'Zero Down' },
  { value: 'fixed_amount', label: 'Fixed Amount' },
  { value: 'percentage_based', label: 'Percentage-based' }
];

/**
 * LOAN / MORTGAGE — Structure tab “Repayment schedule” (`structure.repaymentSchedule`): how principal
 * and interest are repaid over the life of the loan. Distinct from **`/options/repayment-cycle`**
 * (payment cadence: Monthly, Quarterly, … → often `structure.repaymentFrequency`).
 */
export type LoanRepaymentSchedule =
  | 'equal_monthly_instalments'
  | 'bullet_repayment'
  | 'interest_only'
  | 'principal_only_fixed_principal'
  | 'balloon_payment';

export const LOAN_REPAYMENT_SCHEDULE_OPTIONS: Array<{ value: LoanRepaymentSchedule; label: string }> = [
  { value: 'equal_monthly_instalments', label: 'Equal Monthly Installments (EMI)' },
  { value: 'bullet_repayment', label: 'Bullet Repayment' },
  { value: 'interest_only', label: 'Interest Only' },
  { value: 'principal_only_fixed_principal', label: 'Principal Only (Fixed Principal)' },
  { value: 'balloon_payment', label: 'Balloon Payment' }
];

/**
 * LOAN / MORTGAGE — acceptable **non-performing asset (NPA)** threshold in days (`structure.acceptableNPA`).
 * Values are day counts as strings (matches stored `String` on the product schema).
 */
export type AcceptableNpaDays = '30' | '60' | '90' | '120' | '180';

export const LOAN_ACCEPTABLE_NPA_OPTIONS: Array<{ value: AcceptableNpaDays; label: string }> = [
  { value: '30', label: '30 Days' },
  { value: '60', label: '60 Days' },
  { value: '90', label: '90 Days' },
  { value: '120', label: '120 Days' },
  { value: '180', label: '180 Days' }
];

/** LOAN / MORTGAGE — `requirements.otherRequirements[].contentType` (Requirements → Other requirements). */
export type LoanOtherRequirementContentType = 'document_upload' | 'document_template';

/** LOAN / MORTGAGE — `requirements.otherRequirements[].requirementType` suggested dropdown values. */
export type LoanOtherRequirementType =
  | 'account_statement'
  | 'bank_statement'
  | 'employment_letter'
  | 'identity_document'
  | 'proof_of_address'
  | 'guarantor_form'
  | 'business_registration'
  | 'tax_document'
  | 'other';

export const LOAN_OTHER_REQUIREMENT_TYPE_OPTIONS: Array<{
  value: LoanOtherRequirementType;
  label: string;
}> = [
  { value: 'account_statement', label: 'Account Statement' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'employment_letter', label: 'Employment Letter' },
  { value: 'identity_document', label: 'Identity Document' },
  { value: 'proof_of_address', label: 'Proof of Address' },
  { value: 'guarantor_form', label: 'Guarantor Form' },
  { value: 'business_registration', label: 'Business Registration' },
  { value: 'tax_document', label: 'Tax Document' },
  { value: 'other', label: 'Other' }
];

/** Applicant UI: `document_upload` and `document_template` behaviors are defined by the consuming app flow. */
export const LOAN_OTHER_REQUIREMENT_CONTENT_TYPE_OPTIONS: Array<{
  value: LoanOtherRequirementContentType;
  label: string;
}> = [
  { value: 'document_upload', label: 'Document upload' },
  { value: 'document_template', label: 'Document template' }
];

/**
 * Fees & Charges — `fees[].feeType` and penalty rows **`penaltyType`** (late repayment, forceful withdrawal).
 * **`Percent`** replaces legacy **`Percentage`** for new writes; readers may still see `"Percentage"` in old documents.
 */
export type ProductFeeOrPenaltyType = 'Flat' | 'Percent';

export const FEE_AND_PENALTY_TYPE_OPTIONS: Array<{ value: ProductFeeOrPenaltyType; label: string }> = [
  { value: 'Flat', label: 'Flat' },
  { value: 'Percent', label: 'Percent' }
];

/** Penalty trigger duration options for `triggerDurationDays` in penalty rows. */
export const TRIGGER_DURATION_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 1, label: '1 day' },
  { value: 3, label: '3 days' },
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
  { value: 60, label: '60 days' },
  { value: 90, label: '90 days' }
];

// Currency options for Loan / Mortgage / Savings / Investment configuration
export const CURRENCY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'NGN', label: 'NGN - Nigerian Naira' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'GHS', label: 'GHS - Ghanaian Cedi' },
  { value: 'KES', label: 'KES - Kenyan Shilling' },
  { value: 'ZAR', label: 'ZAR - South African Rand' },
  { value: 'XAF', label: 'XAF - Central African CFA Franc' },
  { value: 'XOF', label: 'XOF - West African CFA Franc' }
];

// Collateral type options for Loan product configuration (Add More Collateral)
export const COLLATERAL_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'property', label: 'Property' },
  { value: 'car', label: 'Car / Vehicle' },
  { value: 'land', label: 'Land' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'securities', label: 'Securities' },
  { value: 'other', label: 'Other' }
];

/** MORTGAGE — Properties tab `properties[].propertyType` dropdown options. */
export const PROPERTY_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '3 bedroom flat bungalow', label: '3 bedroom flat bungalow' },
  { value: '2 bedroom flat', label: '2 bedroom flat' },
  { value: '3 bedroom flat Duplex', label: '3 bedroom flat Duplex' },
  { value: '4 bedroom flat Duplex', label: '4 bedroom flat Duplex' },
  { value: 'Warehouse', label: 'Warehouse' },
  { value: 'Office Complex', label: 'Office Complex' },
  { value: 'Others', label: 'Others' }
];

/** MORTGAGE — Properties tab per-property facilities (`properties[].facilities[]`). */
export const MORTGAGE_FACILITY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'solar_energy_system', label: 'Solar energy system' },
  { value: 'reliable_water_supply', label: 'Reliable water supply' },
  { value: 'gated_estate', label: 'Gated estate' },
  { value: 'security_24_7', label: '24/7 security' },
  { value: 'cctv_surveillance', label: 'CCTV surveillance' },
  { value: 'estate_park_playground', label: 'Estate park/ playground' },
  { value: 'estate_gym', label: 'Estate gym' },
  { value: 'outdoor_pool', label: 'Outdoor pool' },
  { value: 'car_garage', label: 'Car garage' },
  { value: 'estate_waste_management', label: 'Estate Waste management' },
  { value: 'boys_quarter', label: 'Boys quarter' },
  { value: 'gateman_quarter', label: 'Gateman quarter' },
  { value: 'indoor_cinema', label: 'Indoor Cinema' },
  { value: 'custom', label: 'Custom' }
];

export const MORTGAGE_FACILITY_VALUES = MORTGAGE_FACILITY_OPTIONS.map((o) => o.value);

// Security requirement options per product type (for frontend dropdowns/radio)
export type LoanSecurityRequirement = 'Guarantor' | 'Collateral' | 'None';
export const LOAN_SECURITY_REQUIREMENT_OPTIONS: Array<{ value: LoanSecurityRequirement; label: string }> = [
  { value: 'Guarantor', label: 'Guarantor' },
  { value: 'Collateral', label: 'Collateral' },
  { value: 'None', label: 'None' }
];

/** Savings tenure dropdown options (matches UI: 3–36 months, No fixed tenure) */
export interface SavingsTenureOption {
  value: number | 'no_fixed_tenure';
  unit: 'month' | 'none';
  label: string;
}

export const SAVINGS_TENURE_OPTIONS: SavingsTenureOption[] = [
  { value: 3, unit: 'month', label: '3 months' },
  { value: 6, unit: 'month', label: '6 months' },
  { value: 12, unit: 'month', label: '12 months' },
  { value: 24, unit: 'month', label: '24 months' },
  { value: 36, unit: 'month', label: '36 months' },
  { value: 'no_fixed_tenure', unit: 'none', label: 'No fixed tenure' }
];

/** Savings deposit / repayment cycle (UI: Deposit Cycle — Daily … Annually) */
export type SavingsRepaymentCycle = 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Annually';
export const SAVINGS_REPAYMENT_CYCLE_OPTIONS: Array<{ value: SavingsRepaymentCycle; label: string }> = [
  { value: 'Daily', label: 'Daily' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Quarterly', label: 'Quarterly' },
  { value: 'Annually', label: 'Annually' }
];

/** SAVINGS — Structure tab `structure.savingsType` (Fixed vs Flexible). */
export type SavingsStructureType = 'fixed_savings' | 'flexible_savings';

export const SAVINGS_TYPE_OPTIONS: Array<{ value: SavingsStructureType; label: string }> = [
  { value: 'fixed_savings', label: 'Fixed Savings' },
  { value: 'flexible_savings', label: 'Flexible Savings' }
];

export type CommoditySecurityRequirement =
  | 'Market Insurance'
  | 'Storage Insurance'
  | 'Quality Assurance'
  | 'Delivery Guarantee'
  | 'None'
  | 'Mixed Security';
export const COMMODITY_SECURITY_REQUIREMENT_OPTIONS: Array<{ value: CommoditySecurityRequirement; label: string }> = [
  { value: 'Market Insurance', label: 'Market Insurance' },
  { value: 'Storage Insurance', label: 'Storage Insurance' },
  { value: 'Quality Assurance', label: 'Quality Assurance' },
  { value: 'Delivery Guarantee', label: 'Delivery Guarantee' },
  { value: 'None', label: 'None' },
  { value: 'Mixed Security', label: 'Mixed Security' }
];

export type MortgageSecurityRequirement = 'Guarantor' | 'Mixed Security' | 'Insurance' | 'Property collateral';
export const MORTGAGE_SECURITY_REQUIREMENT_OPTIONS: Array<{ value: MortgageSecurityRequirement; label: string }> = [
  { value: 'Guarantor', label: 'Guarantor' },
  { value: 'Mixed Security', label: 'Mixed Security' },
  { value: 'Insurance', label: 'Insurance' },
  { value: 'Property collateral', label: 'Property collateral' }
];

export interface BaseProductConfiguration {
  id: string;
  productId: string;
  createdAt: string;
  updatedAt: string;
}

// Configuration for Loan products
export interface LoanProductConfiguration extends BaseProductConfiguration {
  // Basic information
  purpose: string; // Purpose/Description
  minimumFacilityAmount: number; // Minimum Facility Amount
  maximumFacilityAmount: number; // Maximum Facility Amount

  // Repayment information
  repaymentCycle: RepaymentCycle; // Repayment Cycle (Monthly, Quarterly, Bi-annually, Annually)
  loanTenure: {
    value: number;
    unit: 'year' | 'month' | 'week' | 'day'; // Loan Tenure
  };
  amortizationMethod?: string; // Amortization schedule (e.g. equal_instalment, equal_principal, reducing_balance)

  // Fees and rates
  managementFee: number; // Management fee
  // Interest Rate (amount or %) - Updated to support both amount and percentage
  interestRate: {
    type: 'percentage' | 'amount';
    value: number;
  };
  penalty: {
    type: 'percentage' | 'amount';
    value: number; // Penalty (amount or %)
  };
  penaltyTriggerDays?: number; // Charge penalty if payment is late by x days

  // Moratorium period (1-12 representing months: 1 = 1 month, 2 = 2 months, etc.)
  moratorium: MoratoriumMonths; // Moratorium in months (1-12)
  
  // Minimum repayment
  minimumRepaymentAmount: number; // Minimum Repayment Amount
  
  // Security requirements (Guarantor | Collateral | None)
  securityRequirements: LoanSecurityRequirement[];
  additionalSecurityRequirements?: string; // Additional security requirements

  // Eligibility
  eligibility: string; // Eligibility (Text)

  // Product image
  productImage?: string; // Add product image (image URL or base64)

  // Currency
  currency: string; // Currency (options)

  // Withdrawal penalty
  withdrawalPenalty: {
    type: 'percentage' | 'amount';
    value: number; // Withdrawal penalty (set % or amount)
  };
  // Additional charges (name, type, percentage or flat value)
  additionalCharges?: Array<{
    name: string;
    type: string; // e.g. fee, insurance, other
    amount: number;
    isPercentage?: boolean;
    currency?: string;
  }>;
  // Collateral items (name + type per item, supports "Add More Collateral")
  collateral?: Array<{
    name: string;
    type: string; // e.g. property, car, land, other
  }>;
  // Contract URL (e.g. from AirSign)
  contractUrl?: string;
}

// Configuration for Mortgage products
export interface MortgageProductConfiguration extends BaseProductConfiguration {
  // Basic information
  purpose: string; // Purpose/Description
  minimumFacilityAmount: number; // Minimum Facility Amount
  maximumFacilityAmount: number; // Maximum Facility Amount
  
  // Repayment information
  repaymentCycle: RepaymentCycle; // Repayment Cycle (Monthly, Quarterly, Bi-annually, Annually)
  loanTenure: {
    value: number;
    unit: 'year' | 'month' | 'week' | 'day'; // Loan Tenure
  };
  
  // Fees and rates
  managementFee: number; // Management fee
  // Interest Rate (amount or %) - Updated to support both amount and percentage
  interestRate: {
    type: 'percentage' | 'amount';
    value: number;
  };
  penalty: {
    type: 'percentage' | 'amount';
    value: number; // Penalty (amount or %)
  };
  
  // Moratorium period (1-12 representing months: 1 = 1 month, 2 = 2 months, etc.)
  moratorium: MoratoriumMonths; // Moratorium in months (1-12)
  
  // Minimum repayment
  minimumRepaymentAmount: number; // Minimum Repayment Amount

  // Security requirements (Guarantor | Mixed Security | Insurance | Property collateral)
  securityRequirements: MortgageSecurityRequirement[];
  additionalSecurityRequirements?: string; // Additional security requirements

  // Eligibility
  eligibility: string; // Eligibility (Text)

  // Product image
  productImage?: string; // Add product image (image URL or base64)

  // Currency
  currency: string; // Currency (options)

  // Withdrawal penalty
  withdrawalPenalty: {
    type: 'percentage' | 'amount';
    value: number; // Withdrawal penalty (set % or amount)
  };

  // Mortgage-specific fields
  termYears: number;
  downPaymentPercentage: number;
  propertyTypeRestrictions?: string[];
  requiresInsurance: boolean;
  insuranceTypes?: string[];
  equityContribution?: number; // Equity contribution percentage
  propertyValue?: number; // Property value amount
}

// Configuration for Savings products
export interface SavingsProductConfiguration extends BaseProductConfiguration {
  // Loan amount settings
  loanAmount: {
    minimum?: number;
    maximum?: number;
  };
  
  // Charges (fees, Insurance etc)
  charges: Array<{
    name: string;
    type: 'fee' | 'insurance' | 'other';
    amount: number;
    isPercentage?: boolean;
  }>;
  
  // Saving amount settings (flexible or fixed)
  savingAmountSettings: 'flexible' | 'fixed';
  
  // Set duration
  duration?: {
    value: number;
    unit: 'day' | 'week' | 'month' | 'year';
  };

  /** Selected savings tenure from SAVINGS_TENURE_OPTIONS (Savings Tenure dropdown) */
  savingsTenure?: {
    value: number | 'no_fixed_tenure';
    unit: 'month' | 'none';
    label?: string;
  };

  /** Deposit cycle (same options as savings-repayment-cycle endpoint; UI may label “Deposit Cycle”) */
  depositCycle?: SavingsRepaymentCycle;
  
  // Interest rate
  interestRate: number;
  
  // Withdrawal penalty
  withdrawalPenalty: {
    type: 'percentage' | 'amount';
    value: number;
  };
  
  /** `GET /options/withdrawal-flexibility` */
  withdrawalFlexibility: WithdrawalFlexibilityOption;
  
  // Moratorium (min time before withdrawal)
  moratorium?: {
    value: number;
    unit: 'day' | 'week' | 'month' | 'year';
  };
  
  // Name products
  productName: string;

  // Add product image
  productImage?: string;

  // Single user or group
  userMode: 'single' | 'group';
}

// Trading cycle options for Commodity products
export type CommodityTradingCycle = 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Seasonally';
export const COMMODITY_TRADING_CYCLE_OPTIONS: Array<{ value: CommodityTradingCycle; label: string }> = [
  { value: 'Daily', label: 'Daily' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Quarterly', label: 'Quarterly' },
  { value: 'Seasonally', label: 'Seasonally' }
];

// Commodity tenure options
export type CommodityTenureLabel = '3 months' | '6 months' | '12 months' | '24 months' | 'Open-ended';
export interface CommodityTenureOption {
  value: number | 'open_ended';
  unit: 'month' | 'open';
  label: CommodityTenureLabel;
}

export const COMMODITY_TENURE_OPTIONS: CommodityTenureOption[] = [
  { value: 3, unit: 'month', label: '3 months' },
  { value: 6, unit: 'month', label: '6 months' },
  { value: 12, unit: 'month', label: '12 months' },
  { value: 24, unit: 'month', label: '24 months' },
  { value: 'open_ended', unit: 'open', label: 'Open-ended' }
];

// Investment: same trading cycle / tenure option sets as Commodity (parallel endpoints for frontend)
export const INVESTMENT_TRADING_CYCLE_OPTIONS = COMMODITY_TRADING_CYCLE_OPTIONS;
export const INVESTMENT_TENURE_OPTIONS = COMMODITY_TENURE_OPTIONS;

/** INVESTMENT — Structure tab `investmentType` dropdown options. */
export type InvestmentStructureType = 'lump_sum' | 'unit_based';

export const INVESTMENT_TYPE_OPTIONS: Array<{ value: InvestmentStructureType; label: string }> = [
  { value: 'lump_sum', label: 'Lump sum' },
  { value: 'unit_based', label: 'Unit based' }
];

// Configuration for Commodity products
export interface CommodityProductConfiguration extends BaseProductConfiguration {
  // Purpose/Description
  purpose: string;
  commodityType: string;
  // Security requirements (Market Insurance | Storage Insurance | None | Mixed Security)
  securityRequirements?: CommoditySecurityRequirement[];
  // Trading cycle (Daily, Weekly, Monthly, Quarterly, Seasonally)
  tradingCycle: CommodityTradingCycle;
  // Commodity tenure, matches COMMODITY_TENURE_OPTIONS
  commodityTenure: {
    value: number | 'open_ended';
    unit: 'month' | 'open';
    label?: string;
  };
  unitOfMeasure: string;
  minimumOrderQuantity: number;
  price: number; // Product price
  priceVolatilityThreshold: number;
}

// Configuration for Investment products (aligned with Commodity: purpose, type, security, cycle, tenure, pricing)
export interface InvestmentProductConfiguration extends BaseProductConfiguration {
  purpose: string;
  investmentType: string;
  securityRequirements?: CommoditySecurityRequirement[];
  tradingCycle: CommodityTradingCycle;
  investmentTenure: {
    value: number | 'open_ended';
    unit: 'month' | 'open';
    label?: string;
  };
  unitOfMeasure: string;
  minimumOrderQuantity: number;
  price: number;
  priceVolatilityThreshold: number;
}

// Union type for all product configurations
export type ProductConfiguration = 
  | LoanProductConfiguration
  | MortgageProductConfiguration
  | SavingsProductConfiguration
  | CommodityProductConfiguration
  | InvestmentProductConfiguration;

/**
 * @deprecated Historical split-document shape. Use `PUT /api/v1/products/:id` with discriminator fields
 * (`structure`, `about`, `requirements`, `feesAndCharges`, `config`, …). Kept for typing reference only.
 */
export interface CreateProductConfigurationRequest {
  productId: string;
  productType: string;
  configuration: Omit<ProductConfiguration, 'id' | 'productId' | 'createdAt' | 'updatedAt'>;
}

/**
 * @deprecated Historical split-document shape. Use product update with typed discriminator paths (partial deep-merge).
 */
export interface UpdateProductConfigurationRequest {
  configuration: Partial<Omit<ProductConfiguration, 'id' | 'productId' | 'createdAt' | 'updatedAt'>>;
}