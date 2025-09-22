"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireComplianceOfficer = exports.validateDocumentRequirements = exports.validateBusinessType = exports.requireHighRiskApproval = exports.requireBusinessCustomer = exports.requireIndividualCustomer = void 0;
const logger_1 = require("../utils/logger");
const kycTypes_1 = require("../types/kycTypes");
const kycService_1 = require("../services/kycService");
const requireIndividualCustomer = (req, res, next) => {
    try {
        if (!req.user) {
            logger_1.logger.warn('Individual compliance access denied - User not authenticated');
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        if (req.user.userType !== kycTypes_1.UserType.INDIVIDUAL) {
            logger_1.logger.warn('Individual compliance access denied', {
                userId: req.user.userId,
                userType: req.user.userType
            });
            return res.status(403).json({
                success: false,
                error: 'Individual customer access required'
            });
        }
        logger_1.logger.info('Individual compliance access granted', {
            userId: req.user.userId
        });
        next();
    }
    catch (error) {
        logger_1.logger.error('Error in individual compliance middleware', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.requireIndividualCustomer = requireIndividualCustomer;
const requireBusinessCustomer = (req, res, next) => {
    try {
        if (!req.user) {
            logger_1.logger.warn('Business compliance access denied - User not authenticated');
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        if (req.user.userType !== kycTypes_1.UserType.MERCHANT) {
            logger_1.logger.warn('Business compliance access denied', {
                userId: req.user.userId,
                userType: req.user.userType
            });
            return res.status(403).json({
                success: false,
                error: 'Business customer access required'
            });
        }
        logger_1.logger.info('Business compliance access granted', {
            userId: req.user.userId
        });
        next();
    }
    catch (error) {
        logger_1.logger.error('Error in business compliance middleware', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.requireBusinessCustomer = requireBusinessCustomer;
const requireHighRiskApproval = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        const result = await kycService_1.kycService.getKYCStatus(req.user.userId, req.user.userId);
        if (!result.success) {
            logger_1.logger.warn('High-risk check failed - KYC status not found', {
                userId: req.user.userId
            });
            return res.status(403).json({
                success: false,
                error: 'KYC verification required'
            });
        }
        const riskLevel = result.data?.riskLevel;
        if (riskLevel === kycTypes_1.RiskLevel.HIGH || riskLevel === kycTypes_1.RiskLevel.VERY_HIGH) {
            if (result.data?.status !== kycTypes_1.KYCStatus.APPROVED) {
                logger_1.logger.warn('High-risk customer access denied - Enhanced due diligence required', {
                    userId: req.user.userId,
                    riskLevel
                });
                return res.status(403).json({
                    success: false,
                    error: 'Enhanced due diligence approval required for high-risk customers'
                });
            }
        }
        next();
    }
    catch (error) {
        logger_1.logger.error('Error in high-risk approval middleware', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.requireHighRiskApproval = requireHighRiskApproval;
const validateBusinessType = (allowedTypes) => {
    return async (req, res, next) => {
        try {
            if (!req.user || req.user.userType !== kycTypes_1.UserType.MERCHANT) {
                return res.status(403).json({
                    success: false,
                    error: 'Business customer access required'
                });
            }
            const result = await kycService_1.kycService.getKYCStatus(req.user.userId, req.user.userId);
            if (!result.success) {
                return res.status(403).json({
                    success: false,
                    error: 'Business KYC verification required'
                });
            }
            const businessInfo = result.data?.businessInfo;
            if (!businessInfo || !allowedTypes.includes(businessInfo.businessType)) {
                logger_1.logger.warn('Business type access denied', {
                    userId: req.user.userId,
                    businessType: businessInfo?.businessType,
                    allowedTypes
                });
                return res.status(403).json({
                    success: false,
                    error: `Access restricted to: ${allowedTypes.join(', ')}`
                });
            }
            next();
        }
        catch (error) {
            logger_1.logger.error('Error in business type validation middleware', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    };
};
exports.validateBusinessType = validateBusinessType;
const validateDocumentRequirements = (req, res, next) => {
    try {
        const { userType, documents } = req.body;
        if (!userType || !documents) {
            return res.status(400).json({
                success: false,
                error: 'User type and documents are required'
            });
        }
        const documentTypes = documents.map((doc) => doc.type);
        if (userType === kycTypes_1.UserType.INDIVIDUAL) {
            const requiredDocs = ['identity', 'address'];
            const missingDocs = requiredDocs.filter(doc => !documentTypes.includes(doc));
            if (missingDocs.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: `Missing required documents for individual: ${missingDocs.join(', ')}`
                });
            }
        }
        else if (userType === kycTypes_1.UserType.MERCHANT) {
            const requiredDocs = ['business_registration', 'beneficial_ownership', 'director_identification', 'bank'];
            const missingDocs = requiredDocs.filter(doc => !documentTypes.includes(doc));
            if (missingDocs.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: `Missing required documents for business: ${missingDocs.join(', ')}`
                });
            }
        }
        next();
    }
    catch (error) {
        logger_1.logger.error('Error in document requirements validation', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.validateDocumentRequirements = validateDocumentRequirements;
const requireComplianceOfficer = (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        next();
    }
    catch (error) {
        logger_1.logger.error('Error in compliance officer middleware', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.requireComplianceOfficer = requireComplianceOfficer;
//# sourceMappingURL=complianceMiddleware.js.map