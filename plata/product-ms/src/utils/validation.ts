import Joi from 'joi';
import { normalizeProductType, PRODUCT_DISCRIMINATORS, PRODUCT_TYPE_LABELS } from './productType';

export { PRODUCT_TYPE_LABELS };

// Validation helper function
export const validateInput = <T>(schema: Joi.ObjectSchema, data: any): { error?: string; value?: T } => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map((detail) => detail.message).join(', ');
    return { error: errorMessage };
  }

  return { value };
};

const productTypeField = Joi.string()
  .required()
  .custom((value, helpers) => {
    try {
      return normalizeProductType(value);
    } catch {
      return helpers.error('any.invalid');
    }
  }, 'product discriminator')
  .messages({
    'any.invalid': `Product type must be one of: ${PRODUCT_DISCRIMINATORS.join(', ')} (or legacy Loan, Mortgage, Savings, Commodity, Investment)`
  });

const productTypeFieldOptional = Joi.string()
  .optional()
  .custom((value, helpers) => {
    if (value === undefined || value === null || value === '') {
      return value;
    }
    try {
      return normalizeProductType(value);
    } catch {
      return helpers.error('any.invalid');
    }
  }, 'product discriminator')
  .messages({
    'any.invalid': `Product type must be one of: ${PRODUCT_DISCRIMINATORS.join(', ')} (or legacy Loan, Mortgage, Savings, Commodity, Investment)`
  });

/** Canonical discriminator values (for storage and GET /types `value`). */
export const PREDEFINED_PRODUCT_TYPES = PRODUCT_DISCRIMINATORS;

// Subtype options per discriminator
export const PRODUCT_SUBTYPE_OPTIONS: Record<string, string[]> = {
  LOAN: ['Personal Loan', 'Business Loan', 'Mortgage', 'Auto Loan'],
  MORTGAGE: ['Fixed Rate Mortgage', 'Adjustable Rate Mortgage', 'FHA Loan', 'VA Loan'],
  SAVINGS: ['Fixed Deposit', 'Regular Savings', 'Target Savings', 'Group Savings'],
  COMMODITY: ['Agricultural Commodity', 'Energy Commodity', 'Metal Commodity', 'Precious Metal'],
  INVESTMENT: ['Agricultural Commodity', 'Energy Commodity', 'Metal Commodity', 'Precious Metal']
};

/** LOAN / MORTGAGE / SAVINGS / INVESTMENT Structure tab (use fields that match the product type). */
const structureSchema = Joi.object({
  interestRate: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
  interestMethod: Joi.string().allow('').optional(),
  amortizationSchedule: Joi.string().allow('').optional(),
  allowMoratorium: Joi.boolean().optional(),
  moratoriumType: Joi.string()
    .valid('', 'grace_on_principal', 'grace_on_interest', 'grace_on_both')
    .optional(),
  moratorium: Joi.alternatives().try(Joi.object().unknown(true), Joi.number()).optional(),
  repaymentWorkflow: Joi.string()
    .valid(
      '',
      'principal_interest_charges',
      'charges_principal_interest',
      'interest_charges_principal'
    )
    .optional(),
  loanAmount: Joi.object({
    min: Joi.number().optional(),
    max: Joi.number().optional()
  }).optional(),
  repaymentSchedule: Joi.string().allow('').optional(),
  repaymentFrequency: Joi.string().allow('').optional(),
  acceptableNPA: Joi.string().allow('').optional(),
  equityRequirement: Joi.string().allow('').optional(),
  savingsType: Joi.string().allow('').optional(),
  withdrawalFlexibility: Joi.string().allow('').optional(),
  savingsAmount: Joi.object({
    min: Joi.number().optional(),
    max: Joi.number().optional()
  }).optional(),
  savingsTermsAndCondition: Joi.string().allow('').optional(),
  contractId: Joi.string().allow('').optional(),
  airSignSecretKey: Joi.string().allow('').optional(),
  airSignUid: Joi.string().allow('').optional(),
  returnsOnInvestment: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
  investmentType: Joi.string().allow('').optional(),
  investmentAmount: Joi.object({
    min: Joi.number().optional(),
    max: Joi.number().optional()
  }).optional(),
  investmentTermsAndCondition: Joi.string().allow('').optional(),
  enableUnitInvestmentPurchase: Joi.boolean().optional(),
  unitAmount: Joi.alternatives()
    .try(
      Joi.number(),
      Joi.string().allow(''),
      Joi.object({
        amount: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
        minQuantity: Joi.number().optional()
      })
    )
    .optional(),
  yieldMethod: Joi.string().allow('').optional(),
  offerYieldEnabled: Joi.boolean().optional(),
  offerYield: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
  minQuantityPurchase: Joi.number().optional(),
  maxAmount: Joi.number().optional(),
  commodityTermsAndCondition: Joi.string().allow('').optional()
}).optional();

const aboutListItemSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().allow('').optional()
});

const loanAboutSchema = Joi.object({
  tenure: Joi.alternatives().try(Joi.object().unknown(true), Joi.string(), Joi.number()).optional(),
  duration: Joi.alternatives().try(Joi.object().unknown(true), Joi.string(), Joi.number()).optional(),
  loanTypes: Joi.array().items(aboutListItemSchema).optional(),
  mortgageTypes: Joi.array().items(aboutListItemSchema).optional(),
  savingsTypes: Joi.array().items(aboutListItemSchema).optional(),
  investmentTypes: Joi.array().items(aboutListItemSchema).optional(),
  commodityTypes: Joi.array().items(aboutListItemSchema).optional(),
  previewAssetUrl: Joi.string().allow('').optional()
}).optional();

const loanSecuritySchema = Joi.object({
  acceptCheque: Joi.boolean().optional(),
  realEstateProperties: Joi.boolean().optional(),
  otherProperties: Joi.boolean().optional(),
  guarantor: Joi.boolean().optional(),
  bankGuarantee: Joi.boolean().optional(),
  savingsAccount: Joi.boolean().optional(),
  noSecurity: Joi.boolean().optional()
}).optional();

const loanRequirementsSchema = Joi.object({
  security: loanSecuritySchema,
  documentsToDownload: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        fileUrl: Joi.string().allow('').optional()
      })
    )
    .optional(),
  otherRequirements: Joi.array()
    .items(
      Joi.object({
        requirementType: Joi.string().allow('').optional(),
        contentType: Joi.string().allow('').optional(),
        description: Joi.string().allow('').optional(),
        uploadRequired: Joi.boolean().optional()
      })
    )
    .optional(),
  contractId: Joi.string().allow('').optional(),
  airSignSecretKey: Joi.string().allow('').optional(),
  airSignUid: Joi.string().allow('').optional()
}).optional();

const penaltyItemSchema = Joi.object({
  name: Joi.string().allow('').optional(),
  penaltyType: Joi.string().allow('').optional(),
  value: Joi.string().allow('').optional(),
  triggerDurationDays: Joi.number().integer().optional()
});

const loanFeesAndChargesSchema = Joi.object({
  fees: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        feeType: Joi.string().allow('').optional(),
        value: Joi.string().allow('').optional()
      })
    )
    .optional(),
  deductAllChargesOnLoan: Joi.boolean().optional(),
  customerPaysChargesBeforeDisbursement: Joi.boolean().optional(),
  lateRepayment: Joi.object({
    enabled: Joi.boolean().optional(),
    penalties: Joi.array().items(penaltyItemSchema).optional()
  }).optional(),
  chargeForForcefulWithdrawal: Joi.boolean().optional(),
  forcefulWithdrawalPenalties: Joi.array().items(penaltyItemSchema).optional(),
  contractId: Joi.string().allow('').optional(),
  airSignSecretKey: Joi.string().allow('').optional(),
  airSignUid: Joi.string().allow('').optional()
}).optional();

const mortgagePropertiesSchema = Joi.array()
  .items(
    Joi.object({
      name: Joi.string().allow('').optional(),
      propertyType: Joi.string().allow('').optional(),
      value: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
      location: Joi.string().allow('').optional(),
      previewAssetUrl: Joi.string().allow('').optional()
    })
  )
  .optional();

const commodityPricesSchema = Joi.array()
  .items(
    Joi.object({
      price: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
      date: Joi.string().allow('').optional(),
      source: Joi.string().allow('').optional()
    })
  )
  .optional();

const configSchema = Joi.object().unknown(true).optional();

// Product creation validation schema
export const createProductSchema = Joi.object({
  name: Joi.string().min(1).max(200).required().messages({
    'string.empty': 'Product name is required',
    'string.min': 'Product name must be at least 1 character',
    'string.max': 'Product name cannot exceed 200 characters'
  }),
  description: Joi.string().min(1).max(1000).required().messages({
    'string.empty': 'Product description is required',
    'string.min': 'Product description must be at least 1 character',
    'string.max': 'Product description cannot exceed 1000 characters'
  }),
  type: productTypeField,
  subType: Joi.string().min(1).max(100).optional().messages({
    'string.min': 'Product subtype must be at least 1 character',
    'string.max': 'Product subtype cannot exceed 100 characters'
  }),
  appId: Joi.string().min(1).max(100).required().messages({
    'string.empty': 'App ID is required',
    'string.min': 'App ID must be at least 1 character',
    'string.max': 'App ID cannot exceed 100 characters'
  }),
  isActive: Joi.boolean().optional(),
  metadata: Joi.object().unknown(true).optional(),
  structure: structureSchema,
  about: loanAboutSchema,
  requirements: loanRequirementsSchema,
  feesAndCharges: loanFeesAndChargesSchema,
  properties: mortgagePropertiesSchema,
  commodityPrices: commodityPricesSchema,
  config: configSchema
});

// Product update validation schema
export const updateProductSchema = Joi.object({
  name: Joi.string().min(1).max(200).optional().messages({
    'string.min': 'Product name must be at least 1 character',
    'string.max': 'Product name cannot exceed 200 characters'
  }),
  subType: Joi.string().min(1).max(100).optional().allow('').messages({
    'string.min': 'Product subtype must be at least 1 character',
    'string.max': 'Product subtype cannot exceed 100 characters'
  }),
  description: Joi.string().min(1).max(1000).optional().messages({
    'string.min': 'Product description must be at least 1 character',
    'string.max': 'Product description cannot exceed 1000 characters'
  }),
  type: productTypeFieldOptional,
  status: Joi.string().valid('complete', 'incomplete').optional(),
  isActive: Joi.boolean().optional(),
  metadata: Joi.object().unknown(true).optional(),
  equityContribution: Joi.number().optional().messages({
    'number.base': 'Equity contribution must be a number'
  }),
  propertyValue: Joi.number().optional().messages({
    'number.base': 'Property value must be a number'
  }),
  price: Joi.number().optional().messages({
    'number.base': 'Price must be a number'
  }),
  minimumQuantity: Joi.number().optional().messages({
    'number.base': 'Minimum quantity must be a number'
  }),
  unitOfMeasure: Joi.string().allow('').optional().messages({
    'string.base': 'Unit of measure must be a string'
  }),
  structure: structureSchema,
  about: loanAboutSchema,
  requirements: loanRequirementsSchema,
  feesAndCharges: loanFeesAndChargesSchema,
  properties: mortgagePropertiesSchema,
  commodityPrices: commodityPricesSchema,
  config: configSchema
});

// Product type selection validation schema
export const selectProductTypeSchema = Joi.object({
  appId: Joi.string().min(1).max(100).required().messages({
    'string.empty': 'App ID is required',
    'string.min': 'App ID must be at least 1 character',
    'string.max': 'App ID cannot exceed 100 characters'
  }),
  type: productTypeField
});

// Product creation after type selection validation schema
export const createProductAfterTypeSchema = Joi.object({
  productId: Joi.string().min(1).max(100).required().messages({
    'string.empty': 'Product ID is required',
    'string.min': 'Product ID must be at least 1 character',
    'string.max': 'Product ID cannot exceed 100 characters'
  }),
  name: Joi.string().min(1).max(200).required().messages({
    'string.empty': 'Product name is required',
    'string.min': 'Product name must be at least 1 character',
    'string.max': 'Product name cannot exceed 200 characters'
  }),
  description: Joi.string().min(1).max(1000).required().messages({
    'string.empty': 'Product description is required',
    'string.min': 'Product description must be at least 1 character',
    'string.max': 'Product description cannot exceed 1000 characters'
  })
});

const userApplicationStatusJoi = Joi.string().valid(
  'draft',
  'submitted',
  'signed',
  'cancelled',
  'withdrawn'
);

const revenueLineSplitLineJoi = Joi.object({
  creatorShareBps: Joi.number().integer().min(0).max(10000).optional(),
  offeringMerchantShareBps: Joi.number().integer().min(0).max(10000).optional()
});

const userProductApplicationPayoutSplitJoi = Joi.object({
  currency: Joi.string().allow('').max(32).optional(),
  interest: revenueLineSplitLineJoi.optional(),
  fees: revenueLineSplitLineJoi.optional(),
  penalties: revenueLineSplitLineJoi.optional(),
  yield: revenueLineSplitLineJoi.optional()
})
  .optional()
  .default({});

/** POST /api/v1/products/applications */
export const createUserProductApplicationSchema = Joi.object({
  appId: Joi.string().min(1).max(100).required(),
  merchantId: Joi.string().min(1).max(100).required(),
  merchantName: Joi.string().allow('').max(200).optional(),
  offeringMerchantId: Joi.string().min(1).max(100).required(),
  offeringMerchantName: Joi.string().allow('').max(200).optional(),
  userId: Joi.string().min(1).max(100).required(),
  productType: productTypeField,
  globalProductId: Joi.string().min(1).max(100).required(),
  globalProductReferenceNumber: Joi.string().allow('').max(100).optional(),
  merchantProductId: Joi.string().allow('').max(100).optional(),
  status: userApplicationStatusJoi.optional(),
  submittedAt: Joi.string().isoDate().optional(),
  signedAt: Joi.string().isoDate().optional(),
  contractSnapshot: Joi.object().required().unknown(true).messages({
    'object.base': 'contractSnapshot must be an object'
  }),
  payoutSplit: userProductApplicationPayoutSplitJoi,
  snapshotVersion: Joi.number().integer().min(1).optional(),
  snapshotHash: Joi.string().allow('').max(128).optional()
});

/** GET /api/v1/products/applications — require at least one scope filter */
export const listUserProductApplicationsQuerySchema = Joi.object({
  appId: Joi.string().min(1).max(100),
  userId: Joi.string().min(1).max(100),
  offeringMerchantId: Joi.string().min(1).max(100),
  merchantId: Joi.string().min(1).max(100),
  globalProductId: Joi.string().min(1).max(100),
  productType: productTypeFieldOptional,
  status: userApplicationStatusJoi.optional(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  skip: Joi.number().integer().min(0).default(0)
})
  .or('appId', 'userId', 'offeringMerchantId', 'merchantId', 'globalProductId')
  .messages({
    'object.missing':
      'Provide at least one of appId, userId, offeringMerchantId, merchantId, or globalProductId'
  });
