import Joi from 'joi';

// Validation schemas
const walletIdSchema = Joi.string().min(1).max(100).optional().messages({
  'string.min': 'Wallet ID must not be empty',
  'string.max': 'Wallet ID must not exceed 100 characters'
});

const merchantIdSchema = Joi.string().min(1).max(100).optional().messages({
  'string.min': 'Merchant ID must not be empty',
  'string.max': 'Merchant ID must not exceed 100 characters'
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

const descriptionSchema = Joi.string().min(1).max(500).optional().messages({
  'string.min': 'Description must not be empty',
  'string.max': 'Description must not exceed 500 characters'
});

const merchantWalletTypeSchema = Joi.string().valid('TREASURY', 'OPERATION', 'KYC').optional().messages({
  'any.only': 'Merchant wallet type must be one of TREASURY, OPERATION, or KYC'
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

const transactionIdSchema = Joi.string().min(1).max(100).required().messages({
  'string.min': 'Transaction ID must not be empty',
  'string.max': 'Transaction ID must not exceed 100 characters',
  'any.required': 'Transaction ID is required'
});

const statusSchema = Joi.string().valid('SUCCESS', 'COMPLETED', 'PENDING', 'FAILED', 'CANCELLED').required().messages({
  'any.only': 'Status must be one of SUCCESS, COMPLETED, PENDING, FAILED, or CANCELLED',
  'any.required': 'Status is required'
});

const paymentMethodSchema = Joi.string().valid('CARD', 'BANK_TRANSFER', 'WALLET', 'OTHER').required().messages({
  'any.only': 'Payment method must be one of CARD, BANK_TRANSFER, WALLET, or OTHER',
  'any.required': 'Payment method is required'
});

// Wallet validation schemas
export const createMerchantWalletSchema = Joi.object({
  name: nameSchema,
  currency: currencySchema,
  merchantWalletType: merchantWalletTypeSchema.required()
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
  fromWalletId: walletIdSchema.required(),
  toWalletId: walletIdSchema.required(),
  amount: amountSchema,
  description: descriptionSchema
});

export const debitWalletSchema = Joi.object({
  userId: userIdSchema,
  amount: amountSchema,
  description: descriptionSchema
});

export const debitTreasurySchema = Joi.object({
  merchantId: merchantIdSchema.required(),
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

// Funding callback validation schema
export const fundingCallbackSchema = Joi.object({
  walletId: walletIdSchema,
  amount: amountSchema,
  currency: currencySchema,
  transactionId: transactionIdSchema,
  paymentMethod: paymentMethodSchema,
  status: statusSchema,
  description: descriptionSchema,
  providerReference: Joi.string().optional(),
  signature: Joi.string().optional(),
  merchantId: merchantIdSchema,
  merchantWalletType: merchantWalletTypeSchema
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