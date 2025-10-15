// Product configuration interfaces for different product types

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
  repaymentCycle: 'year' | 'month' | 'week' | 'day'; // Repayment Cycle
  loanTenure: {
    value: number;
    unit: 'year' | 'month' | 'week' | 'day'; // Loan Tenure
  };
  
  // Fees and rates
  managementFee: number; // Management fee
  interestRate: number; // Interest Rate (%)
  penalty: {
    type: 'percentage' | 'amount';
    value: number; // Penalty (amount or %)
  };
  
  // Moratorium period
  moratorium: {
    value: number;
    unit: 'year' | 'month' | 'week' | 'day'; // Moratorium
  };
  
  // Minimum repayment
  minimumRepaymentAmount: number; // Minimum Repayment Amount
  
  // Security requirements
  securityRequirements: Array<'property' | 'car' | 'land' | 'other'>; // Security Requirement
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
}

// Configuration for Mortgage products
export interface MortgageProductConfiguration extends BaseProductConfiguration {
  interestRate: number;
  termYears: number;
  downPaymentPercentage: number;
  propertyTypeRestrictions?: string[];
  requiresInsurance: boolean;
  insuranceTypes?: string[];
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
  
  // Interest rate
  interestRate: number;
  
  // Withdrawal penalty
  withdrawalPenalty: {
    type: 'percentage' | 'amount';
    value: number;
  };
  
  // Withdrawal flexibility (anytime, weekly, monthly, yearly, by schedule)
  withdrawalFlexibility: 'anytime' | 'weekly' | 'monthly' | 'yearly' | 'by_schedule';
  
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

// Configuration for Commodity products
export interface CommodityProductConfiguration extends BaseProductConfiguration {
  commodityType: string;
  unitOfMeasure: string;
  minimumOrderQuantity: number;
  priceVolatilityThreshold: number;
  requiresStorage: boolean;
  storageOptions?: string[];
}

// Configuration for Custom products
export interface CustomProductConfiguration extends BaseProductConfiguration {
  customFields: Record<string, any>;
  validationRules?: Record<string, any>;
}

// Union type for all product configurations
export type ProductConfiguration = 
  | LoanProductConfiguration
  | MortgageProductConfiguration
  | SavingsProductConfiguration
  | CommodityProductConfiguration
  | CustomProductConfiguration;

// Request interfaces for creating/updating configurations
export interface CreateProductConfigurationRequest {
  productId: string;
  productType: string;
  configuration: Omit<ProductConfiguration, 'id' | 'productId' | 'createdAt' | 'updatedAt'>;
}

export interface UpdateProductConfigurationRequest {
  configuration: Partial<Omit<ProductConfiguration, 'id' | 'productId' | 'createdAt' | 'updatedAt'>>;
}