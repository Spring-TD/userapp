import Joi from 'joi';
export declare const createMerchantWalletSchema: Joi.ObjectSchema<any>;
export declare const createUserWalletSchema: Joi.ObjectSchema<any>;
export declare const updateWalletBalanceSchema: Joi.ObjectSchema<any>;
export declare const createTransactionSchema: Joi.ObjectSchema<any>;
export declare const getTransactionHistorySchema: Joi.ObjectSchema<any>;
export declare const filterTransactionSchema: Joi.ObjectSchema<any>;
export declare const transferOutSchema: Joi.ObjectSchema<any>;
export declare const debitWalletSchema: Joi.ObjectSchema<any>;
export declare const debitTreasurySchema: Joi.ObjectSchema<any>;
export declare const billingToRepaymentTransferSchema: Joi.ObjectSchema<any>;
export declare const repaymentToBillingTransferSchema: Joi.ObjectSchema<any>;
/** @deprecated Use billingToRepaymentTransferSchema */
export declare const billingToSettlementTransferSchema: Joi.ObjectSchema<any>;
/** @deprecated Use repaymentToBillingTransferSchema */
export declare const settlementToBillingTransferSchema: Joi.ObjectSchema<any>;
/** @deprecated Use billingToRepaymentTransferSchema */
export declare const operationToKycTransferSchema: Joi.ObjectSchema<any>;
/** @deprecated Use repaymentToBillingTransferSchema */
export declare const kycToOperationTransferSchema: Joi.ObjectSchema<any>;
export declare const repaymentBankPayoutSchema: Joi.ObjectSchema<any>;
/** @deprecated Use repaymentBankPayoutSchema */
export declare const settlementBankPayoutSchema: Joi.ObjectSchema<any>;
export declare const userApiCallSchema: Joi.ObjectSchema<any>;
export declare const fundingCallbackSchema: Joi.ObjectSchema<any>;
export declare const createMonoDirectDebitMandateSchema: Joi.ObjectSchema<any>;
export declare const monoBalanceInquirySchema: Joi.ObjectSchema<any>;
export declare const initiateMonoDirectDebitSchema: Joi.ObjectSchema<any>;
export declare const validateInput: <T>(schema: Joi.ObjectSchema, data: any) => {
    error?: string;
    value?: T;
};
//# sourceMappingURL=validation.d.ts.map