"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateKYCSubmission = exports.validateDocumentType = exports.validateKYCStatus = void 0;
const logger_1 = require("../utils/logger");
const kycTypes_1 = require("../types/kycTypes");
const validation_1 = require("../utils/validation");
const validateKYCStatus = (req, res, next) => {
    try {
        const { status } = req.body;
        if (!Object.values(kycTypes_1.KYCStatus).includes(status)) {
            logger_1.logger.warn('KYC status validation failed', {
                error: `Invalid KYC status: ${status}`
            });
            return res.status(400).json({
                success: false,
                error: `Invalid KYC status: ${status}`
            });
        }
        return next();
    }
    catch (error) {
        logger_1.logger.error('Error in KYC status validation', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.validateKYCStatus = validateKYCStatus;
const validateDocumentType = (req, res, next) => {
    try {
        const { type } = req.body;
        if (!Object.values(kycTypes_1.DocumentType).includes(type)) {
            logger_1.logger.warn('Document type validation failed', {
                error: `Invalid document type: ${type}`
            });
            return res.status(400).json({
                success: false,
                error: `Invalid document type: ${type}`
            });
        }
        return next();
    }
    catch (error) {
        logger_1.logger.error('Error in document type validation', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.validateDocumentType = validateDocumentType;
const validateKYCSubmission = (req, res, next) => {
    try {
        const { error, value } = (0, validation_1.validateKYCSubmission)(req.body);
        if (error) {
            logger_1.logger.warn('KYC submission validation failed', {
                error: error.details?.map((detail) => detail.message)
            });
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: error.details?.map((detail) => detail.message)
            });
        }
        req.body = value;
        return next();
    }
    catch (error) {
        logger_1.logger.error('Error in KYC submission validation', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.validateKYCSubmission = validateKYCSubmission;
//# sourceMappingURL=kycValidation.js.map