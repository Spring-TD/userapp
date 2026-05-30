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

export const createProductApplicationSchema = Joi.object({
  userId: Joi.string().trim().required(),
  productId: Joi.string().trim().required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().trim().uppercase().min(3).max(10).required(),
  email: Joi.string().email().optional(),
  merchantId: Joi.string().trim().optional(),
  appId: Joi.string().trim().optional(),
  applicantName: Joi.string().trim().min(1).max(200).optional(),
  phone: Joi.string().trim().min(3).max(40).optional(),
  bvn: Joi.string().trim().pattern(/^\d{11}$/).optional().messages({
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
});

export const initProductApplicationSchema = createProductApplicationSchema.keys({
  merchantId: Joi.string().trim().required(),
  email: Joi.string().email().required(),
  applicantName: Joi.string().trim().min(1).max(200).required(),
  phone: Joi.string().trim().min(3).max(40).required(),
  bvn: Joi.string().trim().pattern(/^\d{11}$/).required().messages({
    'string.pattern.base': 'bvn must be exactly 11 digits'
  }),
  requirementSubmissions: Joi.forbidden()
});

export const submitProductApplicationRequirementsSchema = Joi.object({
  userId: Joi.string().trim().optional(),
  requirementSubmissions: Joi.array().items(requirementSubmissionSchema).required()
});

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
  metadata: Joi.object().unknown(true).optional()
});

export const updateProductApplicationStatusSchema = Joi.object({
  status: Joi.string().valid('APPROVED', 'REJECTED', 'BLACKLISTED').required(),
  reason: Joi.string().trim().optional()
});