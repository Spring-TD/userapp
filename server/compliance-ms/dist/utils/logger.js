"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logKYCSearch = exports.logKYCReview = exports.logKYCSubmission = exports.logDocumentDeletion = exports.logDocumentUpload = exports.logKYCStatus = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
exports.logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.json(),
    transports: [
        new winston_1.default.transports.Console(),
    ],
    silent: process.env.NODE_ENV === 'test'
});
const logKYCStatus = (userId, status) => {
    exports.logger.info(`KYC status updated for user ${userId} to ${status}`);
};
exports.logKYCStatus = logKYCStatus;
const logDocumentUpload = (userId, fileName, fileSize) => {
    exports.logger.info(`Document uploaded for user ${userId}: ${fileName} (${fileSize} bytes)`);
};
exports.logDocumentUpload = logDocumentUpload;
const logDocumentDeletion = (userId, fileName) => {
    exports.logger.info(`Document deleted for user ${userId}: ${fileName}`);
};
exports.logDocumentDeletion = logDocumentDeletion;
const logKYCSubmission = (userId, documentCount) => {
    exports.logger.info(`KYC submitted for user ${userId} with ${documentCount} documents`);
};
exports.logKYCSubmission = logKYCSubmission;
const logKYCReview = (userId, reviewedBy, status) => {
    exports.logger.info(`KYC reviewed for user ${userId} by ${reviewedBy} with status ${status}`);
};
exports.logKYCReview = logKYCReview;
const logKYCSearch = (requesterId, filters) => {
    exports.logger.info(`KYC search executed by ${requesterId} with filters: ${JSON.stringify(filters)}`);
};
exports.logKYCSearch = logKYCSearch;
//# sourceMappingURL=logger.js.map