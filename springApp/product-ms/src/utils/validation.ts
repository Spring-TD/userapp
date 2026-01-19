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