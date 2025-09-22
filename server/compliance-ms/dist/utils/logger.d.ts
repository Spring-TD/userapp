import winston from 'winston';
import { KYCStatus } from '../types/kycTypes';
export declare const logger: winston.Logger;
export declare const logKYCStatus: (userId: string, status: KYCStatus) => void;
export declare const logDocumentUpload: (userId: string, fileName: string, fileSize: number) => void;
export declare const logDocumentDeletion: (userId: string, fileName: string) => void;
export declare const logKYCSubmission: (userId: string, documentCount: number) => void;
export declare const logKYCReview: (userId: string, reviewedBy: string, status: KYCStatus) => void;
export declare const logKYCSearch: (requesterId: string, filters: any) => void;
//# sourceMappingURL=logger.d.ts.map