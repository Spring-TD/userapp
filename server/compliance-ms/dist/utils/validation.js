"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDocumentUpload = exports.validateKYCStatusUpdate = exports.validateKYCSubmission = exports.validateBusinessKYCSubmission = exports.validateIndividualKYCSubmission = exports.documentUploadSchema = exports.kycStatusUpdateSchema = exports.kycSubmissionSchema = exports.businessKYCSubmissionSchema = exports.businessDocumentSchema = exports.individualKYCSubmissionSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const kycTypes_1 = require("../types/kycTypes");
const logger_1 = require("./logger");
exports.individualKYCSubmissionSchema = joi_1.default.object({
    userId: joi_1.default.string().required(),
    userType: joi_1.default.string().valid(kycTypes_1.UserType.INDIVIDUAL).required(),
    personalInfo: joi_1.default.object({
        firstName: joi_1.default.string().min(2).max(50).required(),
        lastName: joi_1.default.string().min(2).max(50).required(),
        dateOfBirth: joi_1.default.date().max('now').required(),
        nationality: joi_1.default.string().min(2).max(3).required(),
        occupation: joi_1.default.string().min(2).max(100).required(),
        sourceOfFunds: joi_1.default.string().min(5).max(200).required()
    }).required(),
    documents: joi_1.default.array().items(joi_1.default.object({
        type: joi_1.default.string().valid(kycTypes_1.DocumentType.IDENTITY, kycTypes_1.DocumentType.ADDRESS, kycTypes_1.DocumentType.INCOME_PROOF, kycTypes_1.DocumentType.BANK).required(),
        fileName: joi_1.default.string().required(),
        fileType: joi_1.default.string().required(),
        fileSize: joi_1.default.number().positive().max(10 * 1024 * 1024).required(),
        fileUrl: joi_1.default.string().uri().required()
    })).min(2).required(),
    riskAssessment: joi_1.default.object({
        politicallyExposed: joi_1.default.boolean().required(),
        sanctionListCheck: joi_1.default.boolean().required()
    }).optional()
});
exports.businessDocumentSchema = joi_1.default.object({
    type: joi_1.default.string().valid(...Object.values(kycTypes_1.BusinessDocumentType)).required(),
    fileName: joi_1.default.string().required(),
    fileType: joi_1.default.string().valid('application/pdf').required(),
    fileSize: joi_1.default.number().positive().max(5 * 1024 * 1024).required(),
    fileUrl: joi_1.default.string().uri().required(),
    uploadedAt: joi_1.default.date().required(),
    status: joi_1.default.string().valid(...Object.values(kycTypes_1.RiskLevel)).required()
});
exports.businessKYCSubmissionSchema = joi_1.default.object({
    userId: joi_1.default.string().required(),
    userType: joi_1.default.string().valid(kycTypes_1.UserType.MERCHANT).required(),
    businessInfo: joi_1.default.object({
        companyName: joi_1.default.string().min(2).max(100).required(),
        industry: joi_1.default.string().min(2).max(50).required(),
        businessDescription: joi_1.default.string().min(10).max(500).required(),
        countryOfIncorporation: joi_1.default.string().min(2).max(50).required(),
        website: joi_1.default.string().uri().required(),
        companyRegId: joi_1.default.string().min(5).max(50).required(),
        companyLogoUrl: joi_1.default.string().uri().required()
    }).required(),
    businessSurvey: joi_1.default.object({
        annualTurnover: joi_1.default.number().min(0).required(),
        expectedTransactionVolume: joi_1.default.number().min(0).required(),
        expectedTransactionValue: joi_1.default.number().min(0).required(),
        sourceOfFunds: joi_1.default.string().min(5).max(200).required(),
        businessPurpose: joi_1.default.string().min(5).max(200).required(),
        numberOfEmployees: joi_1.default.number().min(0).required(),
        operatingSince: joi_1.default.date().max('now').required(),
        websiteTraffic: joi_1.default.number().min(0).optional(),
        socialMediaPresence: joi_1.default.boolean().optional(),
        marketingChannels: joi_1.default.string().optional(),
        paymentMethods: joi_1.default.string().optional(),
        businessModelDescription: joi_1.default.string().min(5).max(500).required(),
        customerBaseDescription: joi_1.default.string().min(5).max(500).required(),
        geographicMarkets: joi_1.default.string().min(5).max(500).required(),
        regulatoryLicenses: joi_1.default.string().optional(),
        insuranceCoverage: joi_1.default.string().optional(),
        previousBankingRelationship: joi_1.default.string().optional(),
        reasonForOpeningAccount: joi_1.default.string().min(5).max(500).required()
    }).required(),
    shareholders: joi_1.default.array().items(joi_1.default.object({
        fullName: joi_1.default.string().min(2).max(100).required(),
        email: joi_1.default.string().email().optional(),
        phoneNumber: joi_1.default.string().min(10).max(20).optional(),
        bvn: joi_1.default.string().min(11).max(11).optional(),
        bankAccount: joi_1.default.string().min(10).max(20).optional(),
        ownershipPercentage: joi_1.default.number().min(0).max(100).required(),
        submittedAt: joi_1.default.date().optional(),
        uboDocument: joi_1.default.object({
            fileName: joi_1.default.string().required(),
            fileType: joi_1.default.string().required(),
            fileSize: joi_1.default.number().positive().max(5 * 1024 * 1024).required(),
            fileUrl: joi_1.default.string().uri().required(),
            uploadDate: joi_1.default.date().required()
        }).optional(),
        bankStatement: joi_1.default.object({
            fileName: joi_1.default.string().required(),
            fileType: joi_1.default.string().required(),
            fileSize: joi_1.default.number().positive().max(5 * 1024 * 1024).required(),
            fileUrl: joi_1.default.string().uri().required(),
            uploadDate: joi_1.default.date().required()
        }).required(),
        status: joi_1.default.string().valid(...Object.values(kycTypes_1.KYCStatus)).required(),
        kyc: joi_1.default.object({
            url: joi_1.default.string().uri().required(),
            expiresAt: joi_1.default.date().required(),
            status: joi_1.default.string().valid('pending', 'active', 'expired', 'completed', 'failed').required(),
            providerReference: joi_1.default.string().optional(),
            result: joi_1.default.object({
                success: joi_1.default.boolean().required(),
                score: joi_1.default.number().min(0).max(100).optional(),
                details: joi_1.default.string().optional(),
                completedAt: joi_1.default.date().optional()
            }).optional()
        }).required()
    }).required()).min(1).required(),
    directors: joi_1.default.array().items(joi_1.default.object({
        firstName: joi_1.default.string().min(2).max(50).required(),
        lastName: joi_1.default.string().min(2).max(50).required(),
        position: joi_1.default.string().min(2).max(50).required(),
        dateOfBirth: joi_1.default.date().max('now').required(),
        nationality: joi_1.default.string().min(2).max(3).required()
    }).required()).min(1).required(),
    businessDocuments: joi_1.default.array().items(exports.businessDocumentSchema).min(8).required(),
    riskAssessment: joi_1.default.object({
        annualTurnover: joi_1.default.number().min(0).required(),
        expectedTransactionVolume: joi_1.default.number().min(0).required(),
        highRiskJurisdiction: joi_1.default.boolean().required(),
        sanctionListCheck: joi_1.default.boolean().required(),
        adverseMediaCheck: joi_1.default.boolean().required()
    }).required()
});
exports.kycSubmissionSchema = joi_1.default.object({
    userId: joi_1.default.string().required(),
    userType: joi_1.default.string().valid(...Object.values(kycTypes_1.UserType)).required(),
    documents: joi_1.default.array().items(joi_1.default.object({
        type: joi_1.default.string().valid(...Object.values(kycTypes_1.DocumentType)).required(),
        fileName: joi_1.default.string().required(),
        fileType: joi_1.default.string().required(),
        fileSize: joi_1.default.number().positive().max(10 * 1024 * 1024).required(),
        fileUrl: joi_1.default.string().uri().required()
    })).min(1).required(),
    additionalInfo: joi_1.default.object().optional()
});
exports.kycStatusUpdateSchema = joi_1.default.object({
    status: joi_1.default.string().valid('pending', 'in_progress', 'completed', 'failed', 'review', 'approved', 'rejected').required(),
    rejectionReason: joi_1.default.string().when('status', {
        is: 'rejected',
        then: joi_1.default.required(),
        otherwise: joi_1.default.optional()
    })
});
exports.documentUploadSchema = joi_1.default.object({
    type: joi_1.default.string().valid(...Object.values(kycTypes_1.DocumentType)).required(),
    fileName: joi_1.default.string().required(),
    fileType: joi_1.default.string().required(),
    fileSize: joi_1.default.number().positive().max(10 * 1024 * 1024).required(),
    fileUrl: joi_1.default.string().uri().required()
});
const validateIndividualKYCSubmission = (data) => {
    const { error, value } = exports.individualKYCSubmissionSchema.validate(data, { abortEarly: false });
    if (error) {
        logger_1.logger.warn('Individual KYC submission validation failed', {
            error: error.details.map(detail => detail.message)
        });
        return { error };
    }
    const documentTypes = value.documents.map((doc) => doc.type);
    const hasRequiredDocs = kycTypes_1.INDIVIDUAL_REQUIRED_DOCUMENTS.every(reqType => documentTypes.includes(reqType));
    if (!hasRequiredDocs) {
        const missing = kycTypes_1.INDIVIDUAL_REQUIRED_DOCUMENTS.filter(reqType => !documentTypes.includes(reqType));
        logger_1.logger.warn('Individual KYC missing required documents', { missing });
        return {
            error: {
                message: `Missing required documents: ${missing.join(', ')}`
            }
        };
    }
    return { value };
};
exports.validateIndividualKYCSubmission = validateIndividualKYCSubmission;
const validateBusinessKYCSubmission = (data) => {
    const { error, value } = exports.businessKYCSubmissionSchema.validate(data, { abortEarly: false });
    if (error) {
        logger_1.logger.warn('Business KYC submission validation failed', {
            error: error.details.map(detail => detail.message)
        });
        return { error };
    }
    const documentTypes = value.businessDocuments.map((doc) => doc.type);
    const requiredDocumentTypes = Object.values(kycTypes_1.BusinessDocumentType);
    const missingDocuments = requiredDocumentTypes.filter(type => !documentTypes.includes(type));
    if (missingDocuments.length > 0) {
        logger_1.logger.warn('Business KYC missing required business documents', { missingDocuments });
        return {
            error: {
                message: `Missing required business documents: ${missingDocuments.join(', ')}`
            }
        };
    }
    const totalOwnership = value.beneficialOwners.reduce((sum, owner) => sum + owner.ownershipPercentage, 0);
    if (totalOwnership > 100) {
        logger_1.logger.warn('Business KYC beneficial ownership exceeds 100%', { totalOwnership });
        return {
            error: {
                message: 'Total beneficial ownership cannot exceed 100%'
            }
        };
    }
    return { value };
};
exports.validateBusinessKYCSubmission = validateBusinessKYCSubmission;
const validateKYCSubmission = (data) => {
    if (data.userType === kycTypes_1.UserType.INDIVIDUAL) {
        return (0, exports.validateIndividualKYCSubmission)(data);
    }
    else if (data.userType === kycTypes_1.UserType.MERCHANT) {
        return (0, exports.validateBusinessKYCSubmission)(data);
    }
    else {
        const { error, value } = exports.kycSubmissionSchema.validate(data, { abortEarly: false });
        if (error) {
            logger_1.logger.warn('KYC submission validation failed', {
                error: error.details.map(detail => detail.message)
            });
            return { error };
        }
        return { value };
    }
};
exports.validateKYCSubmission = validateKYCSubmission;
const validateKYCStatusUpdate = (data) => {
    return exports.kycStatusUpdateSchema.validate(data, { abortEarly: false });
};
exports.validateKYCStatusUpdate = validateKYCStatusUpdate;
const validateDocumentUpload = (data) => {
    return exports.documentUploadSchema.validate(data, { abortEarly: false });
};
exports.validateDocumentUpload = validateDocumentUpload;
//# sourceMappingURL=validation.js.map