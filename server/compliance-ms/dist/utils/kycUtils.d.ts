export declare const connectDB: () => Promise<void>;
export declare const seedData: () => Promise<void>;
import winston from 'winston';
export declare const logger: winston.Logger;
import Joi from 'joi';
import { KYCSubmissionRequest } from '../types/kycTypes';
export declare const kycSubmissionSchema: Joi.ObjectSchema<any>;
export declare const validateKYCSubmission: (data: KYCSubmissionRequest) => {
    error: Joi.ValidationError;
    value?: undefined;
} | {
    value: any;
    error?: undefined;
};
export declare const auditLogger: (action: string, user: string, details: Record<string, any>) => void;
//# sourceMappingURL=kycUtils.d.ts.map