"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kycService = exports.KYCService = void 0;
const crypto_1 = require("crypto");
const kycTypes_1 = require("../types/kycTypes");
const logger_1 = require("../utils/logger");
const audit_1 = require("../utils/audit");
const mockDb_1 = require("../utils/mockDb");
const validation_1 = require("../utils/validation");
class KYCService {
    async submitIndividualKYC(data, userId) {
        try {
            const { error } = (0, validation_1.validateIndividualKYCSubmission)(data);
            if (error) {
                return {
                    success: false,
                    error: error.message || error.details?.[0]?.message || 'Validation error'
                };
            }
            const riskLevel = this.calculateIndividualRiskLevel(data);
            const kycProfileData = {
                userId: data.userId,
                userType: data.userType,
                documents: data.documents.map((doc) => ({
                    type: doc.type,
                    fileName: doc.fileName,
                    fileType: doc.fileType,
                    fileSize: doc.fileSize,
                    uploadDate: new Date(),
                    status: kycTypes_1.KYCStatus.PENDING
                })),
                status: kycTypes_1.KYCStatus.PENDING,
                submittedAt: new Date(),
                personalInfo: data.personalInfo,
                riskAssessment: data.riskAssessment,
                riskLevel,
                workflowStatus: kycTypes_1.ComplianceWorkflowStatus.INITIAL_SCREENING
            };
            const result = await mockDb_1.MockKYCProfileModel.save(kycProfileData);
            logger_1.logger.info('Individual KYC submitted successfully', {
                userId: data.userId,
                riskLevel,
                documentCount: data.documents.length
            });
            (0, audit_1.auditLogger)('INDIVIDUAL_KYC_SUBMISSION', data.userId, {
                riskLevel,
                documentCount: data.documents.length,
                politicallyExposed: data.riskAssessment?.politicallyExposed
            });
            return {
                success: true,
                message: 'Individual KYC submitted successfully for processing',
                data: {
                    kycId: result._id,
                    status: result.status,
                    riskLevel,
                    submittedAt: result.submittedAt,
                    documents: result.documents
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Error submitting individual KYC', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                error: 'Error submitting individual KYC'
            };
        }
    }
    async submitBusinessKYC(data, userId) {
        try {
            const { error } = (0, validation_1.validateBusinessKYCSubmission)(data);
            if (error) {
                return {
                    success: false,
                    error: error.message || error.details?.[0]?.message || 'Validation error'
                };
            }
            const riskLevel = this.calculateBusinessRiskLevel(data);
            const kycProfileData = {
                userId: data.userId,
                userType: data.userType,
                documents: data.businessDocuments.map(doc => ({
                    type: doc.type,
                    fileName: doc.fileName,
                    fileType: doc.fileType,
                    fileSize: doc.fileSize,
                    uploadDate: new Date(),
                    status: kycTypes_1.KYCStatus.PENDING
                })),
                status: kycTypes_1.KYCStatus.PENDING,
                submittedAt: new Date(),
                businessInfo: data.businessInfo,
                businessSurvey: data.businessSurvey,
                beneficialOwners: data.beneficialOwners,
                directors: data.directors,
                riskAssessment: data.riskAssessment,
                riskLevel,
                workflowStatus: kycTypes_1.ComplianceWorkflowStatus.INITIAL_SCREENING
            };
            const result = await mockDb_1.MockKYCProfileModel.save(kycProfileData);
            logger_1.logger.info('Business KYC submitted successfully', {
                userId: data.userId,
                industry: data.businessInfo?.industry,
                riskLevel,
                documentCount: data.businessDocuments?.length,
                beneficialOwnerCount: data.beneficialOwners?.length
            });
            (0, audit_1.auditLogger)('BUSINESS_KYC_SUBMISSION', data.userId, {
                industry: data.businessInfo?.industry,
                riskLevel,
                documentCount: data.businessDocuments?.length,
                beneficialOwnerCount: data.beneficialOwners?.length,
                highRiskJurisdiction: data.riskAssessment?.highRiskJurisdiction
            });
            return {
                success: true,
                message: 'Business KYC submitted successfully for processing',
                data: {
                    kycId: result._id,
                    status: result.status,
                    riskLevel,
                    submittedAt: result.submittedAt,
                    documents: result.documents,
                    beneficialOwnerCount: data.beneficialOwners.length
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Error submitting business KYC', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                error: 'Error submitting business KYC'
            };
        }
    }
    calculateIndividualRiskLevel(data) {
        let riskScore = 0;
        if (data.riskAssessment?.politicallyExposed)
            riskScore += 3;
        if (data.riskAssessment?.sanctionListCheck)
            riskScore += 5;
        const highRiskOccupations = ['politician', 'arms dealer', 'casino', 'money exchange'];
        if (highRiskOccupations.some(occ => data.personalInfo.occupation.toLowerCase().includes(occ))) {
            riskScore += 2;
        }
        const highRiskCountries = ['AF', 'KP', 'IR', 'SY'];
        if (highRiskCountries.includes(data.personalInfo.nationality)) {
            riskScore += 2;
        }
        if (riskScore >= 7)
            return kycTypes_1.RiskLevel.VERY_HIGH;
        if (riskScore >= 5)
            return kycTypes_1.RiskLevel.HIGH;
        if (riskScore >= 2)
            return kycTypes_1.RiskLevel.MEDIUM;
        return kycTypes_1.RiskLevel.LOW;
    }
    calculateBusinessRiskLevel(data) {
        let riskScore = 0;
        if (data.riskAssessment?.highRiskJurisdiction)
            riskScore += 3;
        if (data.riskAssessment?.adverseMediaCheck)
            riskScore += 2;
        if (data.riskAssessment?.sanctionListCheck)
            riskScore += 5;
        const highRiskIndustries = ['gambling', 'cryptocurrency', 'arms', 'precious metals'];
        if (data.businessInfo?.industry && highRiskIndustries.some(industry => data.businessInfo.industry.toLowerCase().includes(industry))) {
            riskScore += 3;
        }
        const pepOwners = data.beneficialOwners?.filter(owner => owner.isPoliticallyExposed) || [];
        if (pepOwners.length > 0) {
            riskScore += 2 + pepOwners.length;
        }
        if (data.riskAssessment?.expectedTransactionVolume > 1000000) {
            riskScore += 2;
        }
        if (data.businessSurvey?.annualTurnover > 10000000) {
            riskScore += 2;
        }
        if (data.businessSurvey?.numberOfEmployees > 1000) {
            riskScore += 1;
        }
        if (riskScore >= 10)
            return kycTypes_1.RiskLevel.VERY_HIGH;
        if (riskScore >= 6)
            return kycTypes_1.RiskLevel.HIGH;
        if (riskScore >= 3)
            return kycTypes_1.RiskLevel.MEDIUM;
        return kycTypes_1.RiskLevel.LOW;
    }
    async submitKYC(data, userId) {
        if (data.userType === kycTypes_1.UserType.INDIVIDUAL) {
            return this.submitIndividualKYC(data, userId);
        }
        else if (data.userType === kycTypes_1.UserType.MERCHANT) {
            return this.submitBusinessKYC(data, userId);
        }
        else {
            try {
                const { error } = (0, validation_1.validateKYCSubmission)(data);
                if (error) {
                    return {
                        success: false,
                        error: error.details?.[0]?.message || 'Validation error'
                    };
                }
                let documents = [];
                if ('documents' in data) {
                    documents = data.documents.map((doc) => ({
                        type: doc.type,
                        fileName: doc.fileName,
                        fileType: doc.fileType,
                        fileSize: doc.fileSize,
                        uploadDate: new Date(),
                        status: kycTypes_1.KYCStatus.PENDING
                    }));
                }
                else if ('businessDocuments' in data) {
                    documents = data.businessDocuments.map((doc) => ({
                        type: doc.type,
                        fileName: doc.fileName,
                        fileType: doc.fileType,
                        fileSize: doc.fileSize,
                        uploadDate: new Date(),
                        status: kycTypes_1.KYCStatus.PENDING
                    }));
                }
                const kycProfileData = {
                    userId: data.userId,
                    userType: data.userType,
                    documents,
                    status: kycTypes_1.KYCStatus.PENDING,
                    submittedAt: new Date()
                };
                const result = await mockDb_1.MockKYCProfileModel.save(kycProfileData);
                let documentCount = 0;
                if ('documents' in data) {
                    documentCount = data.documents.length;
                }
                else if ('businessDocuments' in data) {
                    documentCount = data.businessDocuments.length;
                }
                logger_1.logger.info('KYC submitted successfully', {
                    userId: data.userId,
                    userType: data.userType,
                    documentCount
                });
                (0, audit_1.auditLogger)('KYC_SUBMISSION', data.userId, {
                    userType: data.userType,
                    documentCount
                });
                return {
                    success: true,
                    message: 'KYC submitted successfully for processing',
                    data: {
                        kycId: result._id,
                        status: result.status,
                        submittedAt: result.submittedAt,
                        documents: result.documents
                    }
                };
            }
            catch (error) {
                logger_1.logger.error('Error submitting KYC', {
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                return {
                    success: false,
                    error: 'Error submitting KYC'
                };
            }
        }
    }
    async getKYCStatus(userId, requesterId) {
        try {
            const kycProfile = await mockDb_1.MockKYCProfileModel.findOne({ userId });
            if (!kycProfile) {
                return {
                    success: false,
                    error: 'No KYC profile found for this user'
                };
            }
            (0, audit_1.auditLogger)('KYC_STATUS', requesterId || 'anonymous', {
                userId,
                status: kycProfile.status
            });
            return {
                success: true,
                data: {
                    userId: kycProfile.userId,
                    userType: kycProfile.userType,
                    status: kycProfile.status,
                    documentCount: kycProfile.documents.length,
                    submittedAt: kycProfile.submittedAt,
                    completedAt: kycProfile.completedAt,
                    riskLevel: kycProfile.riskLevel
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: 'Error retrieving KYC status'
            };
        }
    }
    async validateKYC(data, userId) {
        try {
            const { error, value } = (0, validation_1.validateKYCSubmission)(data);
            if (error) {
                return { error: { message: error.details?.[0]?.message || 'Validation error' } };
            }
            return {
                success: true,
                data: {
                    ...value,
                    validationDate: new Date()
                }
            };
        }
        catch (error) {
            return { error: { message: 'Error validating KYC submission' } };
        }
    }
    async updateWorkflowStatus(kycId, workflowStatus, updatedBy) {
        try {
            const updatedProfile = await mockDb_1.MockKYCProfileModel.findByIdAndUpdate(kycId, {
                workflowStatus,
                lastUpdatedBy: updatedBy,
                lastUpdated: new Date()
            }, { new: true });
            if (!updatedProfile) {
                return {
                    success: false,
                    error: 'KYC profile not found'
                };
            }
            logger_1.logger.info('Workflow status updated', {
                kycId,
                workflowStatus,
                updatedBy
            });
            (0, audit_1.auditLogger)('WORKFLOW_STATUS_UPDATE', updatedBy || 'system', {
                kycId,
                workflowStatus
            });
            return {
                success: true,
                message: 'Workflow status updated successfully',
                data: {
                    kycId: updatedProfile._id,
                    workflowStatus: updatedProfile.workflowStatus,
                    lastUpdated: updatedProfile.lastUpdated
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Error updating workflow status', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                error: 'Error updating workflow status'
            };
        }
    }
    async getPendingWorkflows() {
        try {
            const pendingWorkflows = await mockDb_1.MockKYCProfileModel.find({
                workflowStatus: {
                    $in: [
                        kycTypes_1.ComplianceWorkflowStatus.INITIAL_SCREENING,
                        kycTypes_1.ComplianceWorkflowStatus.DOCUMENT_REVIEW,
                        kycTypes_1.ComplianceWorkflowStatus.ENHANCED_DUE_DILIGENCE,
                        kycTypes_1.ComplianceWorkflowStatus.RISK_ASSESSMENT
                    ]
                }
            });
            logger_1.logger.info('Retrieved pending workflows', {
                count: pendingWorkflows.length
            });
            return {
                success: true,
                data: pendingWorkflows.map((profile) => ({
                    kycId: profile._id,
                    userId: profile.userId,
                    userType: profile.userType,
                    workflowStatus: profile.workflowStatus,
                    riskLevel: profile.riskLevel,
                    submittedAt: profile.submittedAt
                }))
            };
        }
        catch (error) {
            logger_1.logger.error('Error retrieving pending workflows', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                error: 'Error retrieving pending workflows'
            };
        }
    }
    async getPendingReviews() {
        try {
            const pendingReviews = await mockDb_1.MockKYCProfileModel.find({
                status: kycTypes_1.KYCStatus.REVIEW
            });
            logger_1.logger.info('Retrieved pending reviews', {
                count: pendingReviews.length
            });
            return {
                success: true,
                data: pendingReviews.map((profile) => ({
                    kycId: profile._id,
                    userId: profile.userId,
                    userType: profile.userType,
                    riskLevel: profile.riskLevel,
                    submittedAt: profile.submittedAt,
                    documents: profile.documents
                }))
            };
        }
        catch (error) {
            logger_1.logger.error('Error retrieving pending reviews', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                error: 'Error retrieving pending reviews'
            };
        }
    }
    async getHighRiskProfiles() {
        try {
            const highRiskProfiles = await mockDb_1.MockKYCProfileModel.find({
                riskLevel: {
                    $in: [kycTypes_1.RiskLevel.HIGH, kycTypes_1.RiskLevel.VERY_HIGH]
                }
            });
            logger_1.logger.info('Retrieved high risk profiles', {
                count: highRiskProfiles.length
            });
            return {
                success: true,
                data: highRiskProfiles.map((profile) => ({
                    kycId: profile._id,
                    userId: profile.userId,
                    userType: profile.userType,
                    riskLevel: profile.riskLevel,
                    businessType: profile.businessInfo?.businessType,
                    submittedAt: profile.submittedAt,
                    lastReviewDate: profile.lastReviewDate
                }))
            };
        }
        catch (error) {
            logger_1.logger.error('Error retrieving high risk profiles', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                error: 'Error retrieving high risk profiles'
            };
        }
    }
    async getRiskSummaryReport() {
        try {
            const allProfiles = await mockDb_1.MockKYCProfileModel.find({});
            const riskDistribution = {};
            const userTypeDistribution = {};
            let highRiskProfiles = 0;
            allProfiles.forEach((profile) => {
                const riskLevel = profile.riskLevel || kycTypes_1.RiskLevel.LOW;
                riskDistribution[riskLevel] = (riskDistribution[riskLevel] || 0) + 1;
                userTypeDistribution[profile.userType] = (userTypeDistribution[profile.userType] || 0) + 1;
                if (profile.riskLevel === kycTypes_1.RiskLevel.HIGH || profile.riskLevel === kycTypes_1.RiskLevel.VERY_HIGH) {
                    highRiskProfiles++;
                }
            });
            const report = {
                totalProfiles: allProfiles.length,
                riskDistribution,
                userTypeDistribution,
                highRiskProfiles
            };
            logger_1.logger.info('Generated risk summary report', report);
            return {
                success: true,
                data: report
            };
        }
        catch (error) {
            logger_1.logger.error('Error generating risk summary report', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                error: 'Error generating risk summary report'
            };
        }
    }
    async getComplianceMetrics() {
        try {
            const allProfiles = await mockDb_1.MockKYCProfileModel.find({});
            const statusDistribution = {};
            const userTypeDistribution = {};
            let totalDocuments = 0;
            let approvedDocuments = 0;
            allProfiles.forEach((profile) => {
                statusDistribution[profile.status] = (statusDistribution[profile.status] || 0) + 1;
                userTypeDistribution[profile.userType] = (userTypeDistribution[profile.userType] || 0) + 1;
                totalDocuments += profile.documents.length;
                approvedDocuments += profile.documents.filter((doc) => doc.status === kycTypes_1.KYCStatus.APPROVED).length;
            });
            const documentApprovalRate = totalDocuments > 0
                ? `${((approvedDocuments / totalDocuments) * 100).toFixed(2)}%`
                : '0%';
            const metrics = {
                totalProfiles: allProfiles.length,
                statusDistribution,
                userTypeDistribution,
                totalDocuments,
                approvedDocuments,
                documentApprovalRate
            };
            logger_1.logger.info('Generated compliance metrics', metrics);
            return {
                success: true,
                data: metrics
            };
        }
        catch (error) {
            logger_1.logger.error('Error generating compliance metrics', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                error: 'Error generating compliance metrics'
            };
        }
    }
    async getDocumentStatusReport() {
        try {
            const allProfiles = await mockDb_1.MockKYCProfileModel.find({});
            let totalDocuments = 0;
            const documentStatusDistribution = {};
            const documentTypeDistribution = {};
            allProfiles.forEach((profile) => {
                profile.documents.forEach((doc) => {
                    totalDocuments++;
                    documentStatusDistribution[doc.status] = (documentStatusDistribution[doc.status] || 0) + 1;
                    documentTypeDistribution[doc.type] = (documentTypeDistribution[doc.type] || 0) + 1;
                });
            });
            const report = {
                totalDocuments,
                documentStatusDistribution,
                documentTypeDistribution
            };
            logger_1.logger.info('Generated document status report', report);
            return {
                success: true,
                data: report
            };
        }
        catch (error) {
            logger_1.logger.error('Error generating document status report', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                error: 'Error generating document status report'
            };
        }
    }
    async getAllUsers() {
        try {
            const allProfiles = await mockDb_1.MockKYCProfileModel.find({});
            const users = allProfiles.map((profile) => ({
                userId: profile.userId,
                userType: profile.userType,
                status: profile.status,
                riskLevel: profile.riskLevel,
                submittedAt: profile.submittedAt,
                completedAt: profile.completedAt,
                reviewedBy: profile.reviewedBy,
                reviewDate: profile.reviewDate,
                isBlocked: profile.isBlocked || false,
                blockedReason: profile.blockedReason
            }));
            logger_1.logger.info('Retrieved all users', { count: users.length });
            return {
                success: true,
                data: users
            };
        }
        catch (error) {
            logger_1.logger.error('Error retrieving all users', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                error: 'Error retrieving all users'
            };
        }
    }
    async getAllComplianceDocuments() {
        try {
            const allProfiles = await mockDb_1.MockKYCProfileModel.find({});
            const allDocuments = [];
            allProfiles.forEach((profile) => {
                profile.documents.forEach((doc) => {
                    allDocuments.push({
                        documentId: doc._id,
                        userId: profile.userId,
                        userType: profile.userType,
                        type: doc.type,
                        fileName: doc.fileName,
                        fileType: doc.fileType,
                        fileSize: doc.fileSize,
                        uploadDate: doc.uploadDate,
                        status: doc.status,
                        rejectionReason: doc.rejectionReason
                    });
                });
            });
            logger_1.logger.info('Retrieved all compliance documents', { count: allDocuments.length });
            return {
                success: true,
                data: allDocuments
            };
        }
        catch (error) {
            logger_1.logger.error('Error retrieving all compliance documents', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                error: 'Error retrieving all compliance documents'
            };
        }
    }
    async approveDisapproveUser(userId, status, note, updatedBy) {
        try {
            const userProfile = await mockDb_1.MockKYCProfileModel.findOne({ userId });
            if (!userProfile) {
                return {
                    success: false,
                    error: 'User profile not found'
                };
            }
            const updatedProfile = await mockDb_1.MockKYCProfileModel.findByIdAndUpdate(userProfile._id, {
                status: status === 'approved' ? kycTypes_1.KYCStatus.APPROVED : kycTypes_1.KYCStatus.REJECTED,
                reviewedBy: updatedBy,
                reviewDate: new Date(),
                ...(status === 'approved' && { completedAt: new Date() }),
                ...(status === 'rejected' && { rejectionReason: note }),
                approvalNotes: note
            }, { new: true });
            if (!updatedProfile) {
                return {
                    success: false,
                    error: 'Failed to update user profile'
                };
            }
            logger_1.logger.info('User profile reviewed', {
                userId,
                status,
                reviewedBy: updatedBy,
                note
            });
            (0, audit_1.auditLogger)('USER_PROFILE_REVIEW', updatedBy || 'system', {
                userId,
                status,
                note
            });
            return {
                success: true,
                message: `User profile ${status} successfully`,
                data: {
                    userId: updatedProfile.userId,
                    status: updatedProfile.status,
                    reviewedBy: updatedProfile.reviewedBy,
                    reviewDate: updatedProfile.reviewDate
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Error reviewing user profile', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                error: 'Error reviewing user profile'
            };
        }
    }
    async sendMessageToUser(userId, message, sentBy) {
        try {
            const userProfile = await mockDb_1.MockKYCProfileModel.findOne({ userId });
            if (!userProfile) {
                return {
                    success: false,
                    error: 'User profile not found'
                };
            }
            const userMessage = {
                id: (0, crypto_1.randomUUID)(),
                message,
                sentBy,
                sentAt: new Date(),
                read: false
            };
            const updatedProfile = await mockDb_1.MockKYCProfileModel.findByIdAndUpdate(userProfile._id, {
                $push: {
                    messages: userMessage
                }
            }, { new: true });
            if (!updatedProfile) {
                return {
                    success: false,
                    error: 'Failed to send message to user'
                };
            }
            logger_1.logger.info('Message sent to user', {
                userId,
                sentBy,
                message: message.substring(0, 50) + (message.length > 50 ? '...' : '')
            });
            (0, audit_1.auditLogger)('MESSAGE_SENT_TO_USER', sentBy || 'system', {
                userId,
                message: message.substring(0, 50) + (message.length > 50 ? '...' : '')
            });
            return {
                success: true,
                message: 'Message sent to user successfully',
                data: userMessage
            };
        }
        catch (error) {
            logger_1.logger.error('Error sending message to user', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                error: 'Error sending message to user'
            };
        }
    }
    async blockUser(userId, reason, blockedBy) {
        try {
            const userProfile = await mockDb_1.MockKYCProfileModel.findOne({ userId });
            if (!userProfile) {
                return {
                    success: false,
                    error: 'User profile not found'
                };
            }
            const updatedProfile = await mockDb_1.MockKYCProfileModel.findByIdAndUpdate(userProfile._id, {
                isBlocked: true,
                blockedReason: reason,
                blockedBy,
                blockedAt: new Date()
            }, { new: true });
            if (!updatedProfile) {
                return {
                    success: false,
                    error: 'Failed to block user'
                };
            }
            logger_1.logger.info('User blocked', {
                userId,
                blockedBy,
                reason
            });
            (0, audit_1.auditLogger)('USER_BLOCKED', blockedBy || 'system', {
                userId,
                reason
            });
            return {
                success: true,
                message: 'User blocked successfully',
                data: {
                    userId: updatedProfile.userId,
                    isBlocked: updatedProfile.isBlocked,
                    blockedReason: updatedProfile.blockedReason,
                    blockedBy: updatedProfile.blockedBy,
                    blockedAt: updatedProfile.blockedAt
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Error blocking user', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                error: 'Error blocking user'
            };
        }
    }
    async unblockUser(userId, unblockedBy) {
        try {
            const userProfile = await mockDb_1.MockKYCProfileModel.findOne({ userId });
            if (!userProfile) {
                return {
                    success: false,
                    error: 'User profile not found'
                };
            }
            const updatedProfile = await mockDb_1.MockKYCProfileModel.findByIdAndUpdate(userProfile._id, {
                isBlocked: false,
                blockedReason: undefined,
                unblockedBy,
                unblockedAt: new Date()
            }, { new: true });
            if (!updatedProfile) {
                return {
                    success: false,
                    error: 'Failed to unblock user'
                };
            }
            logger_1.logger.info('User unblocked', {
                userId,
                unblockedBy
            });
            (0, audit_1.auditLogger)('USER_UNBLOCKED', unblockedBy || 'system', {
                userId
            });
            return {
                success: true,
                message: 'User unblocked successfully',
                data: {
                    userId: updatedProfile.userId,
                    isBlocked: updatedProfile.isBlocked,
                    unblockedBy,
                    unblockedAt: new Date()
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Error unblocking user', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                error: 'Error unblocking user'
            };
        }
    }
    async updateKYCDocumentStatus(documentId, status, rejectionReason) {
        try {
            const allProfiles = await mockDb_1.MockKYCProfileModel.find({});
            let targetProfile = null;
            let documentIndex = -1;
            for (const profile of allProfiles) {
                const docIndex = profile.documents.findIndex((doc) => doc._id === documentId);
                if (docIndex !== -1) {
                    targetProfile = profile;
                    documentIndex = docIndex;
                    break;
                }
            }
            if (!targetProfile || documentIndex === -1) {
                return {
                    success: false,
                    error: 'Document not found'
                };
            }
            targetProfile.documents[documentIndex].status = status;
            if (rejectionReason) {
                targetProfile.documents[documentIndex].rejectionReason = rejectionReason;
            }
            await mockDb_1.MockKYCProfileModel.findByIdAndUpdate(targetProfile._id, { documents: targetProfile.documents }, { new: true });
            return {
                success: true,
                message: 'Document status updated successfully',
                data: { documentId, status, rejectionReason }
            };
        }
        catch (error) {
            return {
                success: false,
                error: 'Error updating document status'
            };
        }
    }
    async getKYCDocument(documentId) {
        try {
            const allProfiles = await mockDb_1.MockKYCProfileModel.find({});
            let targetDocument = null;
            for (const profile of allProfiles) {
                const document = profile.documents.find((doc) => doc._id === documentId);
                if (document) {
                    targetDocument = { ...document, userId: profile.userId };
                    break;
                }
            }
            if (!targetDocument) {
                return {
                    success: false,
                    error: 'Document not found'
                };
            }
            return {
                success: true,
                data: targetDocument
            };
        }
        catch (error) {
            return {
                success: false,
                error: 'Error retrieving document'
            };
        }
    }
    async getAllKYCDocuments(userId) {
        try {
            const kycProfile = await mockDb_1.MockKYCProfileModel.findOne({ userId });
            if (!kycProfile) {
                return {
                    success: false,
                    error: 'KYC profile not found for this user'
                };
            }
            return {
                success: true,
                data: kycProfile.documents
            };
        }
        catch (error) {
            return {
                success: false,
                error: 'Error retrieving documents'
            };
        }
    }
    async searchKYCProfiles(filters) {
        try {
            const query = {};
            if (filters.userId)
                query.userId = filters.userId;
            if (filters.userType)
                query.userType = filters.userType;
            if (filters.status)
                query.status = filters.status;
            if (filters.riskLevel)
                query.riskLevel = filters.riskLevel;
            if (filters.startDate || filters.endDate) {
                query.submittedAt = {};
                if (filters.startDate)
                    query.submittedAt.$gte = new Date(filters.startDate);
                if (filters.endDate)
                    query.submittedAt.$lte = new Date(filters.endDate);
            }
            const profiles = await mockDb_1.MockKYCProfileModel.find(query);
            return {
                success: true,
                data: profiles
            };
        }
        catch (error) {
            return {
                success: false,
                error: 'Error searching KYC profiles'
            };
        }
    }
    async reviewKYC(kycId, status, rejectionReason, reviewedBy) {
        try {
            const updatedProfile = await mockDb_1.MockKYCProfileModel.findByIdAndUpdate(kycId, {
                status,
                reviewedBy,
                reviewDate: new Date(),
                ...(status === kycTypes_1.KYCStatus.COMPLETED && { completedAt: new Date() }),
                ...(rejectionReason && { rejectionReason })
            }, { new: true });
            if (!updatedProfile) {
                return {
                    success: false,
                    error: 'KYC profile not found'
                };
            }
            (0, audit_1.auditLogger)('KYC_REVIEW', reviewedBy || 'anonymous', {
                kycId,
                newStatus: status,
                rejectionReason
            });
            return {
                success: true,
                message: 'KYC submission reviewed successfully',
                data: {
                    kycId: updatedProfile._id,
                    status: updatedProfile.status,
                    rejectionReason: updatedProfile.rejectionReason,
                    reviewedBy: updatedProfile.reviewedBy,
                    reviewDate: updatedProfile.reviewDate
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: 'Error reviewing KYC submission'
            };
        }
    }
}
exports.KYCService = KYCService;
exports.kycService = new KYCService();
//# sourceMappingURL=kycService.js.map