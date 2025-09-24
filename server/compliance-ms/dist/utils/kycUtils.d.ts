export declare const kycSubmissionSchema: (Joi: any) => any;
export declare const validateKYCSubmission: (data: any, Joi: any) => {
    error: any;
    value?: undefined;
} | {
    value: any;
    error?: undefined;
};
export declare const auditLogger: (action: string, user: string, details: Record<string, any>) => void;
//# sourceMappingURL=kycUtils.d.ts.map