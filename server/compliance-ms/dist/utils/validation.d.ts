import Joi from 'joi';
export declare const individualKYCSubmissionSchema: Joi.ObjectSchema<any>;
export declare const businessDocumentSchema: Joi.ObjectSchema<any>;
export declare const businessKYCSubmissionSchema: Joi.ObjectSchema<any>;
export declare const kycSubmissionSchema: Joi.ObjectSchema<any>;
export declare const kycStatusUpdateSchema: Joi.ObjectSchema<any>;
export declare const documentUploadSchema: Joi.ObjectSchema<any>;
export declare const validateIndividualKYCSubmission: (data: any) => {
    error: Joi.ValidationError;
    value?: undefined;
} | {
    error: {
        message: string;
    };
    value?: undefined;
} | {
    value: any;
    error?: undefined;
};
export declare const validateBusinessKYCSubmission: (data: any) => {
    error: Joi.ValidationError;
    value?: undefined;
} | {
    error: {
        message: string;
    };
    value?: undefined;
} | {
    value: any;
    error?: undefined;
};
export declare const validateKYCSubmission: (data: any) => {
    error: {
        message: string;
    };
    value?: undefined;
} | {
    value: any;
    error?: undefined;
};
export declare const validateKYCStatusUpdate: (data: any) => Joi.ValidationResult<any>;
export declare const validateDocumentUpload: (data: any) => Joi.ValidationResult<any>;
//# sourceMappingURL=validation.d.ts.map