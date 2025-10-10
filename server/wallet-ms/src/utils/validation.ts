import Joi from 'joi';

// Validation schemas
const walletIdSchema = Joi.string().min(1).max(100).required().messages({
  'string.min': 'Wallet ID must not be empty',
  'string.max': 'Wallet ID must not exceed 100 characters',
  'any.required': 'Wallet ID is required'
});

const merchantIdSchema = Joi.string().min(1).max(100).required().messages({
  'string.min': 'Merchant ID must not be empty',
  'string.max': 'Merchant ID must not exceed 100 characters',
  'any.required': 'Merchant ID is required'
});

const userIdSchema = Joi.string().min(1).max(100).required().messages({
  'string.min': 'User ID must not be empty',
  'string.max': 'User ID must not exceed 100 characters',
  'any.required': 'User ID is required'
});

const amountSchema = Joi.number().min(0).max(1000000).required().messages({
  'number.min': 'Amount must be positive',
  'number.max': 'Amount exceeds maximum limit',
  'any.required': 'Amount is required'
});

const currencySchema = Joi.string().min(3).max(3).required().messages({
  'string.min': 'Currency must be 3 characters',
  'string.max': 'Currency must be 3 characters',
  'any.required': 'Currency is required'
});

const nameSchema = Joi.string().min(1).max(100).required().messages({
  'string.min': 'Name must not be empty',
  'string.max': 'Name must not exceed 100 characters',
  'any.required': 'Name is required'
});

const descriptionSchema = Joi.string().min(1).max(500).required().messages({
  'string.min': 'Description must not be empty',
  'string.max': 'Description must not exceed 500 characters',
  'any.required': 'Description is required'
});

const merchantWalletTypeSchema = Joi.string().valid('TREASURY', 'OPERATION', 'KYC').required().messages({
  'any.only': 'Merchant wallet type must be one of TREASURY, OPERATION, or KYC',
  'any.required': 'Merchant wallet type is required'
});

const dateSchema = Joi.date().iso().optional().messages({
  'date.iso': 'Date must be in ISO format'
});

const transactionTypeSchema = Joi.string().valid('CREDIT', 'DEBIT').optional().messages({
  'any.only': 'Transaction type must be either CREDIT or DEBIT'
});

const urlSchema = Joi.string().uri().required().messages({
  'string.uri': 'API endpoint must be a valid URL',
  'any.required': 'API endpoint is required'
});

const apiKeySchema = Joi.string().optional().messages({
  'string.base': 'API key must be a string'
});

const headersSchema = Joi.object().optional().messages({
  'object.base': 'Headers must be an object'
});

const requestBodySchema = Joi.object().optional().messages({
  'object.base': 'Request body must be an object'
});

// Wallet validation schemas
export const createMerchantWalletSchema = Joi.object({
  name: nameSchema,
  currency: currencySchema,
  merchantWalletType: merchantWalletTypeSchema
});

export const createUserWalletSchema = Joi.object({
  name: nameSchema,
  currency: currencySchema
});

export const updateWalletBalanceSchema = Joi.object({
  amount: amountSchema,
  description: descriptionSchema
});

// Transaction validation schemas
export const createTransactionSchema = Joi.object({
  walletId: walletIdSchema,
  amount: amountSchema,
  description: descriptionSchema
});

export const getTransactionHistorySchema = Joi.object({
  walletId: walletIdSchema
});

// Treasury Wallet validation schemas
export const filterTransactionSchema = Joi.object({
  startDate: dateSchema,
  endDate: dateSchema,
  type: transactionTypeSchema
});

export const transferOutSchema = Joi.object({
  fromWalletId: walletIdSchema,
  toWalletId: walletIdSchema,
  amount: amountSchema,
  description: descriptionSchema
});

export const debitWalletSchema = Joi.object({
  userId: userIdSchema,
  amount: amountSchema,
  description: descriptionSchema
});

export const debitTreasurySchema = Joi.object({
  merchantId: merchantIdSchema,
  amount: amountSchema,
  description: descriptionSchema
});

// Operation-KYC Wallet validation schemas
export const operationToKycTransferSchema = Joi.object({
  amount: amountSchema,
  description: descriptionSchema
});

export const kycToOperationTransferSchema = Joi.object({
  amount: amountSchema,
  description: descriptionSchema
});

// User Wallet 3rd Party API Call validation schema
export const userApiCallSchema = Joi.object({
  endpoint: urlSchema,
  method: Joi.string().valid('GET', 'POST', 'PUT', 'DELETE').default('POST').messages({
    'any.only': 'Method must be one of GET, POST, PUT, DELETE'
  }),
  headers: headersSchema,
  body: requestBodySchema,
  amount: amountSchema,
  description: descriptionSchema,
  apiKey: apiKeySchema
});

// Utility function for validation
export const validateInput = <T>(schema: Joi.ObjectSchema, data: any): { error?: string; value?: T } => {
  const { error, value } = schema.validate(data, { 
    abortEarly: false,
    stripUnknown: true 
  });
  
  if (error) {
    const errorMessage = error.details.map((detail: any) => detail.message).join(', ');
    return { error: errorMessage };
  }
  
  return { value };
};