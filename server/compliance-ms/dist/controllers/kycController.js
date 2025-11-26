"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KYCController = void 0;
const kycService_1 = require("../services/kycService");
const logger_1 = require("../utils/logger");
const kycTypes_1 = require("../types/kycTypes");
const amlVerificationService_1 = require("../services/amlVerificationService");
const sanctionsService_1 = require("../services/sanctionsService");
class KYCController {
    static async submitIndividualKYC(req, res, next) {
        try {
            const result = await kycService_1.kycService.submitIndividualKYC(req.body, req.user?.userId);
            if (!result.success) {
                logger_1.logger.warn('Individual KYC submission failed', {
                    userId: req.user?.userId,
                    error: result.error
                });
                return res.status(400).json({
                    success: false,
                    error: result.error
                });
            }
            logger_1.logger.info('Individual KYC submitted successfully', {
                userId: req.user?.userId,
                kycId: result.data?.kycId,
                riskLevel: result.data?.riskLevel
            });
            return res.status(201).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async submitBusinessKYC(req, res, next) {
        try {
            const result = await kycService_1.kycService.submitBusinessKYC(req.body, req.user?.userId);
            if (!result.success) {
                logger_1.logger.warn('Business KYC submission failed', {
                    userId: req.user?.userId,
                    error: result.error
                });
                return res.status(400).json({
                    success: false,
                    error: result.error
                });
            }
            logger_1.logger.info('Business KYC submitted successfully', {
                userId: req.user?.userId,
                kycId: result.data?.kycId,
                riskLevel: result.data?.riskLevel,
                shareholderCount: result.data?.shareholderCount
            });
            return res.status(201).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async getKYCStatus(req, res, next) {
        try {
            const requesterId = req.service ? req.params.userId : req.user?.userId;
            const result = await kycService_1.kycService.getKYCStatus(req.params.userId, requesterId);
            if (!result.success) {
                logger_1.logger.warn('KYC status retrieval failed', {
                    userId: req.params.userId,
                    error: result.error
                });
                return res.status(404).json(result);
            }
            logger_1.logger.info('KYC status retrieved successfully', {
                userId: req.params.userId,
                status: result.data?.status
            });
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async createMinimalKYCProfile(req, res, next) {
        try {
            const { userId } = req.params;
            const { userType } = req.body;
            const requesterId = req.service ? 'service' : req.user?.userId;
            const result = await kycService_1.kycService.createMinimalKYCProfile(userId, userType, requesterId);
            if (!result.success) {
                logger_1.logger.warn('Failed to create minimal KYC profile', {
                    userId,
                    error: result.error
                });
                return res.status(400).json(result);
            }
            logger_1.logger.info('Minimal KYC profile created successfully', {
                userId,
                userType,
                status: result.data?.status
            });
            return res.status(201).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async updateKYCDocumentStatus(req, res, next) {
        try {
            const { documentId } = req.params;
            const { status, rejectionReason } = req.body;
            const result = await kycService_1.kycService.updateKYCDocumentStatus(documentId, status, rejectionReason);
            if (!result.success) {
                logger_1.logger.warn('KYC document status update failed', {
                    documentId,
                    error: result.error
                });
                return res.status(404).json(result);
            }
            logger_1.logger.info('KYC document status updated successfully', {
                documentId,
                newStatus: status
            });
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async getKYCDocument(req, res, next) {
        try {
            const result = await kycService_1.kycService.getKYCDocument(req.params.documentId);
            if (!result.success) {
                logger_1.logger.warn('KYC document retrieval failed', {
                    documentId: req.params.documentId,
                    error: result.error
                });
                return res.status(404).json(result);
            }
            logger_1.logger.info('KYC document retrieved successfully', {
                documentId: req.params.documentId,
                documentType: result.data?.type
            });
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async getAllKYCDocuments(req, res, next) {
        try {
            const result = await kycService_1.kycService.getAllKYCDocuments(req.params.userId);
            if (!result.success) {
                logger_1.logger.warn('KYC document retrieval failed', {
                    userId: req.params.userId,
                    error: result.error
                });
                return res.status(404).json(result);
            }
            logger_1.logger.info('KYC documents retrieved successfully', {
                userId: req.params.userId,
                documentCount: result.data?.length
            });
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async searchKYCProfiles(req, res, next) {
        try {
            const result = await kycService_1.kycService.searchKYCProfiles(req.query);
            if (!result.success) {
                logger_1.logger.warn('KYC profile search failed', {
                    error: result.error
                });
                return res.status(400).json(result);
            }
            logger_1.logger.info('KYC profiles retrieved successfully', {
                count: result.data?.length
            });
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async validateKYCSubmission(req, res, next) {
        try {
            const result = await kycService_1.kycService.validateKYC(req.body, req.user?.userId);
            if ('error' in result && result.error) {
                logger_1.logger.warn('KYC validation failed', {
                    userId: req.user?.userId,
                    error: result.error.message
                });
                return res.status(400).json({
                    success: false,
                    error: result.error.message
                });
            }
            req.body = result.data;
            logger_1.logger.info('KYC submission validated successfully', {
                userId: req.user?.userId,
                validationDate: result.data?.validationDate
            });
            next();
        }
        catch (error) {
            next(error);
        }
    }
    static async verifyAMLDocument(req, res, next) {
        try {
            const { documentId, provider } = req.body;
            const documentResult = await kycService_1.kycService.getKYCDocument(documentId);
            if (!documentResult.success) {
                logger_1.logger.warn('AML document verification failed - document not found', {
                    documentId,
                    error: documentResult.error
                });
                return res.status(404).json({
                    success: false,
                    error: documentResult.error || 'Document not found'
                });
            }
            const document = documentResult.data;
            const verificationResult = await amlVerificationService_1.amlVerificationService.verifyDocument(document, provider);
            const updateSuccess = await amlVerificationService_1.amlVerificationService.updateDocumentStatusBasedOnVerification(documentId, verificationResult);
            if (!updateSuccess) {
                logger_1.logger.error('Failed to update document status after AML verification', {
                    documentId,
                    verificationId: verificationResult.verificationId
                });
                return res.status(500).json({
                    success: false,
                    error: 'Failed to update document status after verification'
                });
            }
            logger_1.logger.info('AML document verification completed', {
                documentId,
                provider: verificationResult.providerId,
                approved: verificationResult.overallApproved,
                suspicious: verificationResult.suspicious
            });
            if (verificationResult.suspicious) {
                return res.status(200).json({
                    success: true,
                    message: 'Document verification completed but requires manual review',
                    data: {
                        documentId,
                        verificationResult,
                        status: kycTypes_1.KYCStatus.REVIEW,
                        message: 'Document flagged for manual review'
                    }
                });
            }
            if (!verificationResult.overallApproved) {
                return res.status(200).json({
                    success: true,
                    message: 'Document verification completed but rejected',
                    data: {
                        documentId,
                        verificationResult,
                        status: kycTypes_1.KYCStatus.REJECTED,
                        message: verificationResult.reason || 'Document did not pass verification'
                    }
                });
            }
            return res.status(200).json({
                success: true,
                message: 'Document verification completed and approved',
                data: {
                    documentId,
                    verificationResult,
                    status: kycTypes_1.KYCStatus.APPROVED,
                    message: 'Document approved'
                }
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async reviewKYCSubmission(req, res, next) {
        try {
            const { kycId } = req.params;
            const { status, rejectionReason } = req.body;
            const result = await kycService_1.kycService.reviewKYC(kycId, status, rejectionReason, req.user?.userId);
            if (!result.success) {
                logger_1.logger.warn('KYC review failed', {
                    kycId,
                    error: result.error
                });
                return res.status(400).json(result);
            }
            logger_1.logger.info('KYC submission reviewed successfully', {
                kycId,
                newStatus: status,
                reviewedBy: req.user?.userId
            });
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async submitKYC(req, res, next) {
        try {
            const result = await kycService_1.kycService.submitKYC(req.body, req.user?.userId);
            if (!result.success) {
                logger_1.logger.warn('KYC submission failed', {
                    userId: req.user?.userId,
                    error: result.error || 'Unknown error'
                });
                return res.status(400).json({
                    success: false,
                    error: result.error || 'Unknown error'
                });
            }
            logger_1.logger.info('KYC submitted successfully', {
                userId: req.user?.userId,
                documentCount: result.data?.documents?.length
            });
            return res.status(201).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async getBusinessInfo(req, res, next) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            const result = await kycService_1.kycService.getBusinessInfo(userId);
            if (!result.success) {
                logger_1.logger.warn('Business info retrieval failed', {
                    userId,
                    error: result.error
                });
                return res.status(404).json(result);
            }
            logger_1.logger.info('Business info retrieved successfully', {
                userId
            });
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async getBusinessSurvey(req, res, next) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            const result = await kycService_1.kycService.getBusinessSurvey(userId);
            if (!result.success) {
                logger_1.logger.warn('Business survey retrieval failed', {
                    userId,
                    error: result.error
                });
                return res.status(404).json(result);
            }
            logger_1.logger.info('Business survey retrieved successfully', {
                userId
            });
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async getBeneficialOwners(req, res, next) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            const result = await kycService_1.kycService.getShareholders(userId);
            if (!result.success) {
                logger_1.logger.warn('Shareholders retrieval failed', {
                    userId,
                    error: result.error
                });
                return res.status(404).json(result);
            }
            logger_1.logger.info('Shareholders retrieved successfully', {
                userId,
                shareholderCount: result.data?.length
            });
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async getBusinessRiskAssessment(req, res, next) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            const result = await kycService_1.kycService.getBusinessRiskAssessment(userId);
            if (!result.success) {
                logger_1.logger.warn('Business risk assessment retrieval failed', {
                    userId,
                    error: result.error
                });
                return res.status(404).json(result);
            }
            logger_1.logger.info('Business risk assessment retrieved successfully', {
                userId
            });
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async updateBusinessInfo(req, res, next) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            const result = await kycService_1.kycService.updateBusinessInfo(userId, req.body);
            if (!result.success) {
                logger_1.logger.warn('Business info update failed', {
                    userId,
                    error: result.error
                });
                return res.status(400).json(result);
            }
            logger_1.logger.info('Business info updated successfully', {
                userId
            });
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async updateBusinessSurvey(req, res, next) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            const result = await kycService_1.kycService.updateBusinessSurvey(userId, req.body);
            if (!result.success) {
                logger_1.logger.warn('Business survey update failed', {
                    userId,
                    error: result.error
                });
                return res.status(400).json(result);
            }
            logger_1.logger.info('Business survey updated successfully', {
                userId
            });
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async updateBeneficialOwners(req, res, next) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            const result = await kycService_1.kycService.updateShareholders(userId, req.body);
            if (!result.success) {
                logger_1.logger.warn('Shareholders update failed', {
                    userId,
                    error: result.error
                });
                return res.status(400).json(result);
            }
            logger_1.logger.info('Shareholders updated successfully', {
                userId
            });
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async getEnhancedDueDiligence(req, res, next) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            const result = await kycService_1.kycService.getEnhancedDueDiligence(userId);
            if (!result.success) {
                logger_1.logger.warn('Enhanced due diligence retrieval failed', {
                    userId,
                    error: result.error
                });
                return res.status(404).json(result);
            }
            logger_1.logger.info('Enhanced due diligence retrieved successfully', {
                userId
            });
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async getCorporateStructure(req, res, next) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            const result = await kycService_1.kycService.getCorporateStructure(userId);
            if (!result.success) {
                logger_1.logger.warn('Corporate structure retrieval failed', {
                    userId,
                    error: result.error
                });
                return res.status(404).json(result);
            }
            logger_1.logger.info('Corporate structure retrieved successfully', {
                userId
            });
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async getNonProfitVerification(req, res, next) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            const result = await kycService_1.kycService.getNonProfitVerification(userId);
            if (!result.success) {
                logger_1.logger.warn('Non-profit verification retrieval failed', {
                    userId,
                    error: result.error
                });
                return res.status(404).json(result);
            }
            logger_1.logger.info('Non-profit verification retrieved successfully', {
                userId
            });
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async getGovernmentVerification(req, res, next) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            const result = await kycService_1.kycService.getGovernmentVerification(userId);
            if (!result.success) {
                logger_1.logger.warn('Government verification retrieval failed', {
                    userId,
                    error: result.error
                });
                return res.status(404).json(result);
            }
            logger_1.logger.info('Government verification retrieved successfully', {
                userId
            });
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async getIndividualProfile(req, res, next) {
        try {
            const userId = req.params.userId || req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }
            const result = await kycService_1.kycService.getKYCStatus(userId, req.user?.userId);
            if (!result.success) {
                return res.status(404).json(result);
            }
            if (result.data?.userType !== kycTypes_1.UserType.INDIVIDUAL) {
                return res.status(400).json({
                    success: false,
                    error: 'User is not an individual customer'
                });
            }
            return res.status(200).json({
                success: true,
                data: {
                    userId,
                    personalInfo: result.data.personalInfo,
                    riskLevel: result.data?.riskLevel,
                    riskAssessment: result.data.riskAssessment,
                    documents: result.data.documents,
                    status: result.data?.status,
                    submittedAt: result.data?.submittedAt,
                    completedAt: result.data?.completedAt
                }
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getBusinessProfile(req, res, next) {
        try {
            const userId = req.params.userId || req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }
            const result = await kycService_1.kycService.getKYCStatus(userId, req.user?.userId);
            if (!result.success) {
                return res.status(404).json(result);
            }
            if (result.data?.userType !== kycTypes_1.UserType.MERCHANT) {
                return res.status(400).json({
                    success: false,
                    error: 'User is not a business customer'
                });
            }
            return res.status(200).json({
                success: true,
                data: {
                    userId,
                    businessInfo: result.data.businessInfo,
                    beneficialOwners: result.data.beneficialOwners,
                    directors: result.data.directors,
                    riskLevel: result.data?.riskLevel,
                    riskAssessment: result.data.riskAssessment,
                    documents: result.data.documents,
                    status: result.data?.status,
                    submittedAt: result.data?.submittedAt,
                    completedAt: result.data?.completedAt
                }
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateIndividualRiskLevel(req, res, next) {
        try {
            const userId = req.params.userId;
            const { riskLevel, notes } = req.body;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            if (!riskLevel || !Object.values(kycTypes_1.RiskLevel).includes(riskLevel)) {
                return res.status(400).json({
                    success: false,
                    error: 'Valid risk level is required'
                });
            }
            logger_1.logger.info('Individual risk level updated', {
                userId,
                newRiskLevel: riskLevel,
                updatedBy: req.user?.userId
            });
            return res.status(200).json({
                success: true,
                message: 'Individual risk level updated successfully',
                data: {
                    userId,
                    riskLevel
                }
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateBusinessRiskLevel(req, res, next) {
        try {
            const userId = req.params.userId;
            const { riskLevel, notes } = req.body;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            if (!riskLevel || !Object.values(kycTypes_1.RiskLevel).includes(riskLevel)) {
                return res.status(400).json({
                    success: false,
                    error: 'Valid risk level is required'
                });
            }
            logger_1.logger.info('Business risk level updated', {
                userId,
                newRiskLevel: riskLevel,
                updatedBy: req.user?.userId
            });
            return res.status(200).json({
                success: true,
                message: 'Business risk level updated successfully',
                data: {
                    userId,
                    riskLevel
                }
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async reviewIndividualKYC(req, res, next) {
        try {
            const userId = req.params.userId;
            const { status, rejectionReason, notes } = req.body;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            if (!status || !Object.values(kycTypes_1.KYCStatus).includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: 'Valid KYC status is required'
                });
            }
            logger_1.logger.info('Individual KYC reviewed', {
                userId,
                newStatus: status,
                reviewedBy: req.user?.userId
            });
            return res.status(200).json({
                success: true,
                message: 'Individual KYC reviewed successfully',
                data: {
                    userId,
                    status,
                    reviewedBy: req.user?.userId,
                    reviewDate: new Date()
                }
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async reviewBusinessKYC(req, res, next) {
        try {
            const userId = req.params.userId;
            const { status, rejectionReason, notes } = req.body;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            if (!status || !Object.values(kycTypes_1.KYCStatus).includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: 'Valid KYC status is required'
                });
            }
            logger_1.logger.info('Business KYC reviewed', {
                userId,
                newStatus: status,
                reviewedBy: req.user?.userId
            });
            return res.status(200).json({
                success: true,
                message: 'Business KYC reviewed successfully',
                data: {
                    userId,
                    status,
                    reviewedBy: req.user?.userId,
                    reviewDate: new Date()
                }
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getBusinessBeneficialOwners(req, res, next) {
        try {
            const userId = req.params.userId || req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }
            const result = await kycService_1.kycService.getKYCStatus(userId, req.user?.userId);
            if (!result.success) {
                return res.status(404).json(result);
            }
            if (result.data?.userType !== kycTypes_1.UserType.MERCHANT) {
                return res.status(400).json({
                    success: false,
                    error: 'User is not a business customer'
                });
            }
            return res.status(200).json({
                success: true,
                data: {
                    userId,
                    beneficialOwners: result.data.beneficialOwners,
                    totalOwnership: result.data.beneficialOwners.reduce((sum, owner) => sum + (owner.ownershipPercentage || 0), 0)
                }
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getBusinessCorporateStructure(req, res, next) {
        try {
            const userId = req.params.userId || req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }
            const result = await kycService_1.kycService.getKYCStatus(userId, req.user?.userId);
            if (!result.success) {
                return res.status(404).json(result);
            }
            if (result.data?.userType !== kycTypes_1.UserType.MERCHANT) {
                return res.status(400).json({
                    success: false,
                    error: 'User is not a business customer'
                });
            }
            return res.status(200).json({
                success: true,
                data: {
                    userId,
                    businessInfo: result.data.businessInfo,
                    beneficialOwners: result.data.beneficialOwners,
                    directors: result.data.directors,
                    corporateDocuments: result.data.documents.filter((doc) => doc.type === 'corporate_structure' || doc.type === 'articles_of_incorporation')
                }
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateWorkflowStatus(req, res, next) {
        try {
            const kycId = req.params.kycId;
            const { workflowStatus, notes } = req.body;
            if (!kycId) {
                return res.status(400).json({
                    success: false,
                    error: 'KYC ID is required'
                });
            }
            if (!workflowStatus || !Object.values(kycTypes_1.ComplianceWorkflowStatus).includes(workflowStatus)) {
                return res.status(400).json({
                    success: false,
                    error: 'Valid workflow status is required'
                });
            }
            const result = await kycService_1.kycService.updateWorkflowStatus(kycId, workflowStatus, req.user?.userId);
            if (!result.success) {
                return res.status(500).json(result);
            }
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async getPendingWorkflows(req, res, next) {
        try {
            const result = await kycService_1.kycService.getPendingWorkflows();
            if (!result.success) {
                return res.status(500).json(result);
            }
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async getPendingReviews(req, res, next) {
        try {
            const result = await kycService_1.kycService.getPendingReviews();
            if (!result.success) {
                return res.status(500).json(result);
            }
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async getHighRiskProfiles(req, res, next) {
        try {
            const result = await kycService_1.kycService.getHighRiskProfiles();
            if (!result.success) {
                return res.status(500).json(result);
            }
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async getRiskSummaryReport(req, res, next) {
        try {
            const result = await kycService_1.kycService.getRiskSummaryReport();
            if (!result.success) {
                return res.status(500).json(result);
            }
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async getComplianceMetrics(req, res, next) {
        try {
            const result = await kycService_1.kycService.getComplianceMetrics();
            if (!result.success) {
                return res.status(500).json(result);
            }
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async getDocumentStatusReport(req, res, next) {
        try {
            const result = await kycService_1.kycService.getDocumentStatusReport();
            if (!result.success) {
                return res.status(500).json(result);
            }
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async getAllUsers(req, res, next) {
        try {
            const result = await kycService_1.kycService.getAllUsers();
            if (!result.success) {
                return res.status(500).json(result);
            }
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async getAllComplianceDocuments(req, res, next) {
        try {
            const result = await kycService_1.kycService.getAllComplianceDocuments();
            if (!result.success) {
                return res.status(500).json(result);
            }
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async approveDisapproveUser(req, res, next) {
        try {
            const { userId } = req.params;
            const { status, note } = req.body;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            if (!status || !['approved', 'rejected'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: 'Valid status (approved/rejected) is required'
                });
            }
            const result = await kycService_1.kycService.approveDisapproveUser(userId, status, note, req.user?.userId);
            if (!result.success) {
                return res.status(500).json(result);
            }
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async sendMessageToUser(req, res, next) {
        try {
            const { userId } = req.params;
            const { message } = req.body;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            if (!message) {
                return res.status(400).json({
                    success: false,
                    error: 'Message is required'
                });
            }
            const result = await kycService_1.kycService.sendMessageToUser(userId, message, req.user?.userId);
            if (!result.success) {
                return res.status(500).json(result);
            }
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async blockUser(req, res, next) {
        try {
            const { userId } = req.params;
            const { reason } = req.body;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            const result = await kycService_1.kycService.blockUser(userId, reason, req.user?.userId);
            if (!result.success) {
                return res.status(500).json(result);
            }
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async unblockUser(req, res, next) {
        try {
            const { userId } = req.params;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            const result = await kycService_1.kycService.unblockUser(userId, req.user?.userId);
            if (!result.success) {
                return res.status(500).json(result);
            }
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async verifyCertificateWithCAC(req, res, next) {
        try {
            const { userId } = req.params;
            const { registrationNumber, companyName } = req.body;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            if (!registrationNumber || !companyName) {
                return res.status(400).json({
                    success: false,
                    error: 'Registration number and company name are required'
                });
            }
            const result = await kycService_1.kycService.verifyCertificateWithCAC(userId, registrationNumber, companyName, req.user?.userId);
            if (!result.success) {
                return res.status(500).json(result);
            }
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async checkSanctions(req, res, next) {
        try {
            const { name, companyId, country } = req.body;
            if (!name) {
                logger_1.logger.warn('Sanctions check failed: name is required');
                return res.status(400).json({
                    success: false,
                    error: 'Name is required for sanctions check'
                });
            }
            const sanctionsRequest = {
                name,
                companyId,
                country
            };
            const result = await sanctionsService_1.sanctionsService.checkSanctions(sanctionsRequest);
            logger_1.logger.info('Sanctions check completed', {
                name,
                companyId,
                country,
                flagged: result.flagged,
                matchCount: result.matches.length
            });
            return res.status(200).json({
                success: true,
                data: result
            });
        }
        catch (error) {
            logger_1.logger.error('Error during sanctions check', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return res.status(500).json({
                success: false,
                error: 'Internal server error during sanctions check'
            });
        }
    }
    static async getIndividualRiskAssessment(req, res, next) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            const result = await kycService_1.kycService.getKYCStatus(userId, userId);
            if (!result.success) {
                return res.status(404).json(result);
            }
            return res.status(200).json({
                success: true,
                data: {
                    riskLevel: result.data?.riskLevel,
                    riskAssessment: result.data.riskAssessment
                }
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async updatePersonalInfo(req, res, next) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            const result = await kycService_1.kycService.updatePersonalInfo(userId, req.body);
            if (!result.success) {
                return res.status(400).json(result);
            }
            logger_1.logger.info('Personal info updated successfully', { userId });
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async getEnhancedVerificationStatus(req, res, next) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            const result = await kycService_1.kycService.getEnhancedDueDiligence(userId);
            if (!result.success) {
                return res.status(404).json(result);
            }
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async createShareholderData(req, res, next) {
        try {
            const { merchantId } = req.params;
            if (!merchantId) {
                return res.status(400).json({
                    success: false,
                    error: 'Merchant ID is required'
                });
            }
            return res.status(400).json({
                success: false,
                error: 'This endpoint is deprecated. Use PUT /beneficial-owners to update shareholders.'
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getShareholderData(req, res, next) {
        try {
            const { merchantId } = req.params;
            if (!merchantId) {
                return res.status(400).json({
                    success: false,
                    error: 'Merchant ID is required'
                });
            }
            const result = await kycService_1.kycService.getShareholders(merchantId);
            if (!result.success) {
                return res.status(404).json(result);
            }
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async updateShareholderData(req, res, next) {
        try {
            const { merchantId } = req.params;
            if (!merchantId) {
                return res.status(400).json({
                    success: false,
                    error: 'Merchant ID is required'
                });
            }
            const result = await kycService_1.kycService.updateShareholders(merchantId, req.body);
            if (!result.success) {
                return res.status(400).json(result);
            }
            logger_1.logger.info('Shareholder data updated successfully', { merchantId });
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.KYCController = KYCController;
exports.default = KYCController;
//# sourceMappingURL=kycController.js.map