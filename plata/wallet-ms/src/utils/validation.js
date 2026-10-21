"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateInput = exports.initiateMonoDirectDebitSchema = exports.monoBalanceInquirySchema = exports.createMonoDirectDebitMandateSchema = exports.fundingCallbackSchema = exports.userApiCallSchema = exports.settlementBankPayoutSchema = exports.repaymentBankPayoutSchema = exports.kycToOperationTransferSchema = exports.operationToKycTransferSchema = exports.settlementToBillingTransferSchema = exports.billingToSettlementTransferSchema = exports.repaymentToBillingTransferSchema = exports.billingToRepaymentTransferSchema = exports.debitTreasurySchema = exports.debitWalletSchema = exports.transferOutSchema = exports.filterTransactionSchema = exports.getTransactionHistorySchema = exports.createTransactionSchema = exports.updateWalletBalanceSchema = exports.createUserWalletSchema = exports.createMerchantWalletSchema = void 0;
const joi_1 = __importDefault(require("joi"));
// Validation schemas
const walletIdSchema = joi_1.default.string().min(1).max(100).optional().messages({
    'string.min': 'Wallet ID must not be empty',
    'string.max': 'Wallet ID must not exceed 100 characters'
});
const merchantIdSchema = joi_1.default.string().min(1).max(100).optional().messages({
    'string.min': 'Merchant ID must not be empty',
    'string.max': 'Merchant ID must not exceed 100 characters'
});
const userIdSchema = joi_1.default.string().min(1).max(100).required().messages({
    'string.min': 'User ID must not be empty',
    'string.max': 'User ID must not exceed 100 characters',
    'any.required': 'User ID is required'
});
const amountSchema = joi_1.default.number().min(0).max(1000000).required().messages({
    'number.min': 'Amount must be positive',
    'number.max': 'Amount exceeds maximum limit',
    'any.required': 'Amount is required'
});
/** Optional unit; default Naira for storefront/legacy. When `kobo`, amount must be integer. */
const amountUnitSchema = joi_1.default.string().valid('kobo', 'naira').optional();
const amountWithUnitSchema = joi_1.default.when('amountUnit', {
    is: 'kobo',
    then: joi_1.default.number().integer().min(0).max(100000000000).required().messages({
        'number.integer': 'Amount must be an integer when amountUnit is kobo',
        'number.min': 'Amount must be positive',
        'number.max': 'Amount exceeds maximum limit',
        'any.required': 'Amount is required'
    }),
    otherwise: amountSchema
});
const currencySchema = joi_1.default.string().min(3).max(3).required().messages({
    'string.min': 'Currency must be 3 characters',
    'string.max': 'Currency must be 3 characters',
    'any.required': 'Currency is required'
});
const nameSchema = joi_1.default.string().min(1).max(100).required().messages({
    'string.min': 'Name must not be empty',
    'string.max': 'Name must not exceed 100 characters',
    'any.required': 'Name is required'
});
const descriptionSchema = joi_1.default.string().min(1).max(500).optional().messages({
    'string.min': 'Description must not be empty',
    'string.max': 'Description must not exceed 500 characters'
});
const merchantWalletTypeSchema = joi_1.default.string()
    .valid('BILLING', 'TREASURY', 'REPAYMENT', 'SETTLEMENT', 'OPERATION', 'KYC')
    .optional()
    .messages({
    'any.only': 'Merchant wallet type must be one of BILLING, TREASURY, REPAYMENT (legacy: SETTLEMENT, OPERATION, KYC)'
});
const dateSchema = joi_1.default.date().iso().optional().messages({
    'date.iso': 'Date must be in ISO format'
});
const transactionTypeSchema = joi_1.default.string().valid('CREDIT', 'DEBIT').optional().messages({
    'any.only': 'Transaction type must be either CREDIT or DEBIT'
});
const urlSchema = joi_1.default.string().uri().required().messages({
    'string.uri': 'API endpoint must be a valid URL',
    'any.required': 'API endpoint is required'
});
const apiKeySchema = joi_1.default.string().optional().messages({
    'string.base': 'API key must be a string'
});
const headersSchema = joi_1.default.object().optional().messages({
    'object.base': 'Headers must be an object'
});
const requestBodySchema = joi_1.default.object().optional().messages({
    'object.base': 'Request body must be an object'
});
const transactionIdSchema = joi_1.default.string().min(1).max(100).required().messages({
    'string.min': 'Transaction ID must not be empty',
    'string.max': 'Transaction ID must not exceed 100 characters',
    'any.required': 'Transaction ID is required'
});
const statusSchema = joi_1.default.string().valid('SUCCESS', 'COMPLETED', 'PENDING', 'FAILED', 'CANCELLED').required().messages({
    'any.only': 'Status must be one of SUCCESS, COMPLETED, PENDING, FAILED, or CANCELLED',
    'any.required': 'Status is required'
});
const paymentMethodSchema = joi_1.default.string().valid('CARD', 'BANK_TRANSFER', 'WALLET', 'OTHER').required().messages({
    'any.only': 'Payment method must be one of CARD, BANK_TRANSFER, WALLET, or OTHER',
    'any.required': 'Payment method is required'
});
// Wallet validation schemas
exports.createMerchantWalletSchema = joi_1.default.object({
    name: nameSchema,
    currency: currencySchema,
    merchantWalletType: merchantWalletTypeSchema.required(),
    appId: merchantIdSchema,
    appName: joi_1.default.string().min(1).max(120).optional(),
    payonusSubaccountCode: joi_1.default.string().min(1).max(120).optional()
});
exports.createUserWalletSchema = joi_1.default.object({
    name: nameSchema,
    currency: currencySchema
});
exports.updateWalletBalanceSchema = joi_1.default.object({
    amount: amountWithUnitSchema,
    amountUnit: amountUnitSchema,
    description: descriptionSchema
});
// Transaction validation schemas
exports.createTransactionSchema = joi_1.default.object({
    walletId: walletIdSchema,
    amount: amountWithUnitSchema,
    amountUnit: amountUnitSchema,
    description: descriptionSchema
});
exports.getTransactionHistorySchema = joi_1.default.object({
    walletId: walletIdSchema,
    limit: joi_1.default.number().integer().min(1).max(100).default(20),
    skip: joi_1.default.number().integer().min(0).default(0)
});
// Treasury Wallet validation schemas
exports.filterTransactionSchema = joi_1.default.object({
    startDate: dateSchema,
    endDate: dateSchema,
    type: transactionTypeSchema,
    /** Page size (default 20, max 100). */
    limit: joi_1.default.number().integer().min(1).max(100).default(20),
    /** Number of rows to skip (default 0). */
    skip: joi_1.default.number().integer().min(0).default(0)
});
exports.transferOutSchema = joi_1.default.object({
    fromWalletId: walletIdSchema.required(),
    toWalletId: walletIdSchema.required(),
    amount: amountWithUnitSchema,
    amountUnit: amountUnitSchema,
    description: descriptionSchema
});
exports.debitWalletSchema = joi_1.default.object({
    userId: userIdSchema,
    amount: amountWithUnitSchema,
    amountUnit: amountUnitSchema,
    description: descriptionSchema
});
exports.debitTreasurySchema = joi_1.default.object({
    merchantId: merchantIdSchema.required(),
    amount: amountWithUnitSchema,
    amountUnit: amountUnitSchema,
    description: descriptionSchema
});
// Billing-Repayment Wallet validation schemas
exports.billingToRepaymentTransferSchema = joi_1.default.object({
    amount: amountWithUnitSchema,
    amountUnit: amountUnitSchema,
    description: descriptionSchema
});
exports.repaymentToBillingTransferSchema = joi_1.default.object({
    amount: amountWithUnitSchema,
    amountUnit: amountUnitSchema,
    description: descriptionSchema
});
/** @deprecated Use billingToRepaymentTransferSchema */
exports.billingToSettlementTransferSchema = exports.billingToRepaymentTransferSchema;
/** @deprecated Use repaymentToBillingTransferSchema */
exports.settlementToBillingTransferSchema = exports.repaymentToBillingTransferSchema;
/** @deprecated Use billingToRepaymentTransferSchema */
exports.operationToKycTransferSchema = exports.billingToRepaymentTransferSchema;
/** @deprecated Use repaymentToBillingTransferSchema */
exports.kycToOperationTransferSchema = exports.repaymentToBillingTransferSchema;
const bankAccountNumberSchema = joi_1.default.string().trim().pattern(/^\d{10}$/).required().messages({
    'string.pattern.base': 'accountNumber must be a 10-digit NUBAN'
});
const bankCodeSchema = joi_1.default.string().trim().min(2).max(20).required();
const payoutReferenceSchema = joi_1.default.string().min(1).max(120).optional();
exports.repaymentBankPayoutSchema = joi_1.default.object({
    appId: joi_1.default.string().trim().min(1).max(100).optional(),
    accountNumber: bankAccountNumberSchema,
    bankCode: bankCodeSchema,
    accountName: joi_1.default.string().trim().min(1).max(120).required(),
    bankName: joi_1.default.string().trim().min(1).max(120).optional(),
    amount: amountWithUnitSchema,
    amountUnit: amountUnitSchema,
    currency: currencySchema.optional(),
    narration: descriptionSchema,
    reference: payoutReferenceSchema
});
/** @deprecated Use repaymentBankPayoutSchema */
exports.settlementBankPayoutSchema = exports.repaymentBankPayoutSchema;
// User Wallet 3rd Party API Call validation schema
exports.userApiCallSchema = joi_1.default.object({
    endpoint: urlSchema,
    method: joi_1.default.string().valid('GET', 'POST', 'PUT', 'DELETE').default('POST').messages({
        'any.only': 'Method must be one of GET, POST, PUT, DELETE'
    }),
    headers: headersSchema,
    body: requestBodySchema,
    amount: amountWithUnitSchema,
    amountUnit: amountUnitSchema,
    description: descriptionSchema,
    apiKey: apiKeySchema
});
// Funding callback validation schema
exports.fundingCallbackSchema = joi_1.default.object({
    id: joi_1.default.string().optional(),
    type: joi_1.default.string().optional(),
    walletId: walletIdSchema, // Optional if userId + merchantId provided
    userId: joi_1.default.string().min(1).max(100).optional().messages({
        'string.min': 'User ID must not be empty',
        'string.max': 'User ID must not exceed 100 characters'
    }),
    amount: amountWithUnitSchema,
    amountUnit: amountUnitSchema,
    currency: currencySchema,
    transactionId: transactionIdSchema,
    paymentMethod: paymentMethodSchema,
    status: statusSchema,
    description: descriptionSchema,
    providerReference: joi_1.default.string().optional(),
    signature: joi_1.default.string().optional(),
    hash: joi_1.default.string().optional(),
    merchantId: merchantIdSchema,
    businessId: joi_1.default.string().optional(),
    onusReference: joi_1.default.string().optional(),
    paymentChannel: joi_1.default.string().optional(),
    paymentStatus: joi_1.default.string().optional(),
    transactionAmount: joi_1.default.number().optional(),
    merchantReference: joi_1.default.string().optional(),
    accountNumber: joi_1.default.string().optional(),
    virtual_account_number: joi_1.default.string().optional(),
    appId: merchantIdSchema,
    merchantWalletType: merchantWalletTypeSchema
});
const monoFeeBearerSchema = joi_1.default.string().valid('business', 'customer').optional();
const monoMandateTypeSchema = joi_1.default.string().valid('emandate', 'sweep', 'signed_mandate').optional();
const amountKoboSchema = joi_1.default.number().integer().min(1).max(100000000000).required();
exports.createMonoDirectDebitMandateSchema = joi_1.default.object({
    applicationId: joi_1.default.string().trim().min(1).max(200).required(),
    userId: joi_1.default.string().trim().min(1).max(200).required(),
    merchantId: joi_1.default.string().trim().min(1).max(200).required(),
    debitType: joi_1.default.string().valid('fixed', 'variable').required(),
    mandateType: monoMandateTypeSchema.default('emandate'),
    amountKobo: amountKoboSchema,
    reference: joi_1.default.string().trim().min(1).max(120).optional(),
    accountNumber: joi_1.default.string().trim().pattern(/^\d{10}$/).required().messages({
        'string.pattern.base': 'accountNumber must be a 10-digit NUBAN'
    }),
    bankCode: joi_1.default.string().trim().min(2).max(20).required(),
    accountName: joi_1.default.string().trim().min(1).max(200).optional(),
    bankName: joi_1.default.string().trim().min(1).max(200).optional(),
    customer: joi_1.default.object({
        id: joi_1.default.string().trim().min(1).max(200).optional(),
        name: joi_1.default.string().trim().min(1).max(200).optional(),
        email: joi_1.default.string().trim().email().max(320).optional(),
        phone: joi_1.default.string().trim().min(3).max(40).optional(),
        bvn: joi_1.default.string().trim().pattern(/^\d{11}$/).optional().messages({
            'string.pattern.base': 'customer.bvn must be an 11-digit BVN'
        })
    }).optional(),
    description: joi_1.default.string().trim().min(1).max(500).optional(),
    startDate: joi_1.default.string().isoDate().required(),
    endDate: joi_1.default.string().isoDate().required(),
    feeBearer: monoFeeBearerSchema.default('business'),
    redirectUrl: joi_1.default.string().uri().optional(),
    schedule: joi_1.default.object().unknown(true).optional(),
    meta: joi_1.default.object().unknown(true).optional(),
    useHostedLink: joi_1.default.boolean().optional().default(true),
    verificationMethod: joi_1.default.string().trim().min(1).max(100).optional()
});
exports.monoBalanceInquirySchema = joi_1.default.object({
    amountKobo: joi_1.default.number().integer().min(1).max(100000000000).optional()
});
exports.initiateMonoDirectDebitSchema = joi_1.default.object({
    amountKobo: amountKoboSchema,
    reference: joi_1.default.string().trim().min(1).max(120).optional(),
    narration: joi_1.default.string().trim().min(1).max(200).required(),
    feeBearer: monoFeeBearerSchema.default('business'),
    beneficiary: joi_1.default.object({
        nuban: joi_1.default.string().trim().pattern(/^\d{10}$/).required(),
        nip_code: joi_1.default.string().trim().min(2).max(20).required()
    }).optional(),
    meta: joi_1.default.object().unknown(true).optional(),
    checkBalance: joi_1.default.boolean().optional().default(false)
});
// Utility function for validation
const validateInput = (schema, data) => {
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
exports.validateInput = validateInput;
//# sourceMappingURL=validation.js.map