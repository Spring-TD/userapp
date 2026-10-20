import Joi from 'joi';

// Validation helper function
export const validateInput = <T>(schema: Joi.ObjectSchema, data: any): { error?: string; value?: T } => {
  const { error, value } = schema.validate(data, { 
    abortEarly: false,
    stripUnknown: true 
  });
  
  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return { error: errorMessage };
  }
  
  return { value };
};

// Predefined product types
const PREDEFINED_PRODUCT_TYPES = ['Loan', 'Mortgage', 'Savings', 'Commodity'];

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
  type: Joi.string().min(1).max(100).required().valid(...PREDEFINED_PRODUCT_TYPES).messages({
    'string.empty': 'Product type is required',
    'string.min': 'Product type must be at least 1 character',
    'string.max': 'Product type cannot exceed 100 characters',
    'any.only': 'Product type must be one of Loan, Mortgage, Savings, or Commodity'
  }),
  appId: Joi.string().min(1).max(100).required().messages({
    'string.empty': 'App ID is required',
    'string.min': 'App ID must be at least 1 character',
    'string.max': 'App ID cannot exceed 100 characters'
  })
});

// Product update validation schema
export const updateProductSchema = Joi.object({
  name: Joi.string().min(1).max(200).optional().messages({
    'string.min': 'Product name must be at least 1 character',
    'string.max': 'Product name cannot exceed 200 characters'
  }),
  description: Joi.string().min(1).max(1000).optional().messages({
    'string.min': 'Product description must be at least 1 character',
    'string.max': 'Product description cannot exceed 1000 characters'
  }),
  type: Joi.string().min(1).max(100).optional().valid(...PREDEFINED_PRODUCT_TYPES).messages({
    'string.min': 'Product type must be at least 1 character',
    'string.max': 'Product type cannot exceed 100 characters',
    'any.only': 'Product type must be one of Loan, Mortgage, Savings, or Commodity'
  }),
  status: Joi.string().valid('complete', 'incomplete').optional(),
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
  unitOfMeasure: Joi.string().optional().messages({
    'string.base': 'Unit of measure must be a string'
  })
});

// Product type selection validation schema
export const selectProductTypeSchema = Joi.object({
  appId: Joi.string().min(1).max(100).required().messages({
    'string.empty': 'App ID is required',
    'string.min': 'App ID must be at least 1 character',
    'string.max': 'App ID cannot exceed 100 characters'
  }),
  type: Joi.string().min(1).max(100).required().valid(...PREDEFINED_PRODUCT_TYPES).messages({
    'string.empty': 'Product type is required',
    'string.min': 'Product type must be at least 1 character',
    'string.max': 'Product type cannot exceed 100 characters',
    'any.only': 'Product type must be one of Loan, Mortgage, Savings, or Commodity'
  })
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

export const platformApplicationFieldsSchema = Joi.object({
  isPoliticallyExposedPerson: Joi.boolean().strict().optional(),
  monthlyIncome: Joi.number().min(0).optional(),
  repaymentSource: Joi.string().trim().optional(),
  repaymentSourceOther: Joi.string().trim().max(500).optional(),
  maritalStatus: Joi.string().trim().optional(),
  maritalStatusOther: Joi.string().trim().max(500).optional(),
  loanReason: Joi.string().trim().optional(),
  loanReasonOther: Joi.string().trim().max(500).optional(),
  repayingWithSpouse: Joi.boolean().strict().optional(),
  spouseFullName: Joi.string().trim().max(200).optional(),
  spouseEmail: Joi.string().email().optional(),
  spousePhone: Joi.string().trim().min(3).max(40).optional(),
  spouseOccupation: Joi.string().trim().max(120).optional(),
  spouseCountry: Joi.string().trim().uppercase().length(2).optional(),
  occupation: Joi.string().trim().max(120).optional().allow(''),
  placeOfWork: Joi.string().trim().max(200).optional().allow(''),
  hrName: Joi.string().trim().max(200).optional().allow(''),
  hrEmail: Joi.string().trim().email().max(320).optional().allow('')
});

const requirementSubmissionSchema = Joi.object({
  requirementId: Joi.string().trim().optional(),
  requirementType: Joi.string().trim().optional(),
  label: Joi.string().trim().optional(),
  type: Joi.string().valid('document', 'text', 'number', 'boolean', 'json').optional(),
  value: Joi.any().optional(),
  fileUrl: Joi.string().uri().optional(),
  fileName: Joi.string().trim().optional(),
  fileType: Joi.string().trim().optional(),
  fileSize: Joi.number().positive().optional(),
  metadata: Joi.object().unknown(true).optional()
});

export const createSavingsAccountSchema = Joi.object({
  userId: Joi.string().trim().required(),
  productId: Joi.string().trim().required(),
  currency: Joi.string().trim().uppercase().min(3).max(10).required(),
  email: Joi.string().email().optional(),
  appId: Joi.string().trim().optional(),
  merchantId: Joi.string().trim().optional(),
  applicantName: Joi.string().trim().min(1).max(200).optional(),
  phone: Joi.string().trim().min(3).max(40).allow('', null).optional(),
  bvn: Joi.string().trim().pattern(/^\d{11}$/).allow('', null).optional().messages({
    'string.pattern.base': 'bvn must be exactly 11 digits'
  }),
  country: Joi.string().trim().uppercase().length(2).optional()
});

export const createInvestmentAccountSchema = Joi.object({
  userId: Joi.string().trim().required(),
  productId: Joi.string().trim().required(),
  currency: Joi.string().trim().uppercase().min(3).max(10).required(),
  email: Joi.string().email().optional(),
  appId: Joi.string().trim().optional(),
  merchantId: Joi.string().trim().optional(),
  applicantName: Joi.string().trim().min(1).max(200).optional(),
  phone: Joi.string().trim().min(3).max(40).allow('', null).optional(),
  bvn: Joi.string().trim().pattern(/^\d{11}$/).allow('', null).optional().messages({
    'string.pattern.base': 'bvn must be exactly 11 digits'
  }),
  country: Joi.string().trim().uppercase().length(2).optional()
}).concat(platformApplicationFieldsSchema);

export const savingsDepositSchema = Joi.object({
  userId: Joi.string().trim().required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().trim().uppercase().min(3).max(10).optional(),
  referenceId: Joi.string().trim().min(1).max(200).optional()
});

export const investmentDepositSchema = Joi.object({
  userId: Joi.string().trim().required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().trim().uppercase().min(3).max(10).optional(),
  referenceId: Joi.string().trim().min(1).max(200).optional()
});

export const savingsDepositWebhookSchema = Joi.object({
  upstreamApplicationId: Joi.string().trim().required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().trim().uppercase().min(3).max(10).optional(),
  providerReference: Joi.string().trim().required(),
  merchantId: Joi.string().trim().optional(),
  appId: Joi.string().trim().optional()
});

export const applyCommodityAccountSchema = Joi.object({
  userId: Joi.string().trim().required(),
  productId: Joi.string().trim().required(),
  currency: Joi.string().trim().uppercase().min(3).max(10).required(),
  quantity: Joi.number().integer().min(1).optional(),
  email: Joi.string().email().optional(),
  appId: Joi.string().trim().optional(),
  merchantId: Joi.string().trim().optional(),
  applicantName: Joi.string().trim().min(1).max(200).optional(),
  phone: Joi.string().trim().min(3).max(40).allow('', null).optional(),
  bvn: Joi.string().trim().pattern(/^\d{11}$/).allow('', null).optional().messages({
    'string.pattern.base': 'bvn must be exactly 11 digits'
  }),
  country: Joi.string().trim().uppercase().length(2).optional(),
  requirementSubmissions: Joi.array().items(requirementSubmissionSchema).optional(),
  // Nested aliases accepted by storefront clients (top-level fields also via concat below).
  platformFields: platformApplicationFieldsSchema.optional(),
  metadata: Joi.object({
    platformFields: platformApplicationFieldsSchema.optional()
  })
    .unknown(true)
    .optional()
}).concat(platformApplicationFieldsSchema);

export const commodityWithdrawSchema = Joi.object({
  userId: Joi.string().trim().required()
});

/** SAVINGS / INVESTMENT maturity or anytime principal (+ interest) withdrawal. */
export const depositMaturityWithdrawSchema = Joi.object({
  userId: Joi.string().trim().required(),
  amount: Joi.number().positive().optional()
});

export const createProductApplicationSchema = Joi.object({
  userId: Joi.string().trim().required(),
  productId: Joi.string().trim().required(),
  amount: Joi.number().positive().required(),
  // COMMODITY only: units to buy. Total is computed server-side as unitPrice × quantity.
  quantity: Joi.number().integer().min(1).optional(),
  currency: Joi.string().trim().uppercase().min(3).max(10).required(),
  email: Joi.string().email().optional(),
  merchantId: Joi.string().trim().optional(),
  appId: Joi.string().trim().optional(),
  applicantName: Joi.string().trim().min(1).max(200).optional(),
  phone: Joi.string().trim().min(3).max(40).allow('', null).optional(),
  bvn: Joi.string().trim().pattern(/^\d{11}$/).allow('', null).optional().messages({
    'string.pattern.base': 'bvn must be exactly 11 digits'
  }),
  offeringMerchantName: Joi.string().trim().min(1).max(200).optional(),
  country: Joi.string().trim().uppercase().length(2).optional(),
  integratorMerchantId: Joi.string().trim().min(1).max(200).optional(),
  integratorMerchantName: Joi.string().trim().min(1).max(200).optional(),
  productCreatorMerchantName: Joi.string().trim().min(1).max(200).optional(),
  subMerchant: Joi.object({
    id: Joi.string().trim().required(),
    name: Joi.string().trim().required(),
    email: Joi.string().email().required(),
    phone: Joi.string().trim().min(3).max(40).required(),
    bvn: Joi.string().trim().pattern(/^\d{11}$/).optional()
  }).optional(),
  subMerchantContactEmail: Joi.string().email().optional(),
  subMerchantContactPhone: Joi.string().trim().min(3).max(40).optional(),
  requirementSubmissions: Joi.array().items(requirementSubmissionSchema).default([])
}).concat(platformApplicationFieldsSchema);

export const initProductApplicationSchema = createProductApplicationSchema.keys({
  merchantId: Joi.string().trim().required(),
  email: Joi.string().email().required(),
  applicantName: Joi.string().trim().min(1).max(200).required(),
  phone: Joi.string().trim().min(3).max(40).allow('', null).optional(),
  bvn: Joi.string().trim().pattern(/^\d{11}$/).allow('', null).optional().messages({
    'string.pattern.base': 'bvn must be exactly 11 digits'
  }),
  requirementSubmissions: Joi.forbidden()
});

export const submitProductApplicationRequirementsSchema = Joi.object({
  userId: Joi.string().trim().optional(),
  requirementSubmissions: Joi.array().items(requirementSubmissionSchema).required()
});

export const saveProductApplicationProgressSchema = Joi.object({
  userId: Joi.string().trim().optional(),
  currentStep: Joi.string().trim().min(1).max(80).optional(),
  currentTab: Joi.string().trim().min(1).max(80).optional(),
  requirementDrafts: Joi.array().items(requirementSubmissionSchema).optional(),
  uploadedDrafts: Joi.array().items(requirementSubmissionSchema).optional(),
  guarantorDrafts: Joi.array().items(Joi.object().unknown(true)).optional(),
  metadata: Joi.object({
    platformFields: platformApplicationFieldsSchema.optional()
  }).unknown(true).optional()
})
  .concat(platformApplicationFieldsSchema)
  .or(
    'currentStep',
    'currentTab',
    'requirementDrafts',
    'uploadedDrafts',
    'guarantorDrafts',
    'metadata',
    'isPoliticallyExposedPerson',
    'monthlyIncome',
    'repaymentSource',
    'repaymentSourceOther',
    'maritalStatus',
    'maritalStatusOther',
    'loanReason',
    'loanReasonOther',
    'repayingWithSpouse',
    'spouseFullName',
    'spouseEmail',
    'spousePhone',
    'spouseOccupation',
    'spouseCountry',
    'occupation',
    'placeOfWork',
    'hrName',
    'hrEmail'
  );

export const createApplicationGuarantorSchema = Joi.object({
  userId: Joi.string().trim().optional(),
  fullName: Joi.string().trim().min(1).max(200).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().trim().min(3).max(40).required(),
  occupation: Joi.string().trim().min(1).max(120).optional(),
  relationship: Joi.string().trim().min(1).max(120).optional(),
  country: Joi.string().trim().uppercase().length(2).optional(),
  callback: Joi.string().uri().optional(),
  redirect: Joi.string().uri().optional()
});

export const createApplicationSpouseKycSchema = Joi.object({
  userId: Joi.string().trim().optional(),
  fullName: Joi.string().trim().min(1).max(200).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().trim().min(3).max(40).required(),
  occupation: Joi.string().trim().min(1).max(120).optional(),
  relationship: Joi.string().trim().min(1).max(120).optional(),
  country: Joi.string().trim().uppercase().length(2).optional()
});

export const submitInitializedProductApplicationSchema = Joi.object({
  userId: Joi.string().trim().optional(),
  acceptedTerms: Joi.boolean().valid(true).required().messages({
    'any.only': 'acceptedTerms must be true to submit application'
  }),
  mortgageSelection: Joi.object({
    propertyName: Joi.string().trim().min(1).max(200).optional(),
    propertyType: Joi.string().trim().min(1).max(100).optional(),
    location: Joi.string().trim().min(1).max(300).optional(),
    unitPrice: Joi.number().positive().optional(),
    quantity: Joi.number().integer().min(1).optional(),
    startDate: Joi.string().trim().min(1).max(100).optional(),
    investmentPeriod: Joi.string().trim().min(1).max(100).optional(),
    total: Joi.number().positive().optional(),
    metadata: Joi.object().unknown(true).optional()
  }).optional(),
  metadata: Joi.object({
    platformFields: platformApplicationFieldsSchema.optional()
  }).unknown(true).optional()
}).concat(platformApplicationFieldsSchema);

export const blacklistProductApplicationSchema = Joi.object({
  status: Joi.string().valid('BLACKLISTED').required(),
  reason: Joi.string().trim().optional()
});

export const pendingApprovedMortgageUserParamSchema = Joi.object({
  userId: Joi.string().trim().required()
});

export const respondToPendingMortgageOfferSchema = Joi.object({
  userId: Joi.string().trim().required(),
  action: Joi.string().valid('accept', 'decline').required(),
  acceptedTerms: Joi.boolean().optional()
}).custom((value, helpers) => {
  if (value.action === 'accept' && value.acceptedTerms !== true) {
    return helpers.error('any.custom', {
      message: 'acceptedTerms must be true when accepting the offer'
    });
  }
  return value;
});

export const respondToPendingLoanOfferSchema = respondToPendingMortgageOfferSchema;

export const payPendingLoanDownPaymentSchema = Joi.object({
  userId: Joi.string().trim().required(),
  method: Joi.string().valid('wallet').default('wallet')
});

export const schedulePendingMortgageInspectionSchema = Joi.object({
  userId: Joi.string().trim().required(),
  scheduledFor: Joi.string().isoDate().required(),
  notes: Joi.string().trim().max(500).optional(),
  location: Joi.string().trim().max(300).optional()
});

export const completePendingMortgageInspectionSchema = Joi.object({
  userId: Joi.string().trim().required(),
  outcome: Joi.string().valid('completed', 'declined_offer').required()
});

export const completePendingMortgageVirtualInspectionSchema = Joi.object({
  userId: Joi.string().trim().required(),
  notes: Joi.string().trim().max(500).optional()
});

export const signPendingMortgageContractSchema = Joi.object({
  userId: Joi.string().trim().required(),
  acceptedTerms: Joi.boolean().valid(true).default(true).messages({
    'any.only': 'acceptedTerms must be true to sign the contract'
  })
});

export const payPendingMortgageDownPaymentSchema = Joi.object({
  userId: Joi.string().trim().required(),
  amount: Joi.number().positive().optional()
});