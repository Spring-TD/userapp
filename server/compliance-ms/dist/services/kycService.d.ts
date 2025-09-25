import { KYCProfile, KYCStatus, KYCSubmissionRequest, IndividualKYCSubmissionRequest, BusinessKYCSubmissionRequest, RiskLevel, ComplianceWorkflowStatus } from '../types/kycTypes';
import { CACVerificationResult } from './cacService';
export declare class KYCService {
    submitIndividualKYC(data: IndividualKYCSubmissionRequest, userId?: string): Promise<{
        success: boolean;
        message?: string;
        data?: {
            kycId: string;
            status: KYCStatus;
            riskLevel: RiskLevel;
            submittedAt: Date | undefined;
            documents: any[];
        };
        error?: any;
    }>;
    submitBusinessKYC(data: BusinessKYCSubmissionRequest, userId?: string): Promise<{
        success: boolean;
        message?: string;
        data?: {
            kycId: string;
            status: KYCStatus;
            riskLevel: RiskLevel;
            submittedAt: Date | undefined;
            documents: any[];
            shareholderCount: number;
        };
        error?: any;
    }>;
    private calculateIndividualRiskLevel;
    private calculateBusinessRiskLevel;
    submitKYC(data: KYCSubmissionRequest | IndividualKYCSubmissionRequest | BusinessKYCSubmissionRequest, userId?: string): Promise<{
        success: boolean;
        message?: string;
        data?: {
            kycId: string;
            status: KYCStatus;
            riskLevel: RiskLevel;
            submittedAt: Date | undefined;
            documents: any[];
        };
        error?: any;
    } | {
        success: boolean;
        message: string;
        data: {
            kycId: string;
            status: KYCStatus;
            submittedAt: Date | undefined;
            documents: import("../types/kycTypes").KYCDocument[];
        };
    }>;
    getKYCStatus(userId: string, requesterId?: string): Promise<{
        success: boolean;
        data?: {
            userId: string;
            userType: any;
            status: KYCStatus;
            documentCount: number;
            submittedAt: Date | undefined;
            completedAt: Date | undefined;
            riskLevel?: RiskLevel;
        };
        error?: string;
    }>;
    validateKYC(data: KYCSubmissionRequest, userId?: string): Promise<{
        error: {
            message: any;
        };
        success?: undefined;
        data?: undefined;
    } | {
        success: boolean;
        data: any;
        error?: undefined;
    }>;
    updateWorkflowStatus(kycId: string, workflowStatus: ComplianceWorkflowStatus, updatedBy?: string): Promise<{
        success: boolean;
        error: string;
        message?: undefined;
        data?: undefined;
    } | {
        success: boolean;
        message: string;
        data: {
            kycId: any;
            workflowStatus: any;
            lastUpdated: any;
        };
        error?: undefined;
    }>;
    getPendingWorkflows(): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: string;
        data?: undefined;
    }>;
    getPendingReviews(): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: string;
        data?: undefined;
    }>;
    getHighRiskProfiles(): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: string;
        data?: undefined;
    }>;
    getRiskSummaryReport(): Promise<{
        success: boolean;
        data: {
            totalProfiles: any;
            riskDistribution: Record<string, number>;
            userTypeDistribution: Record<string, number>;
            highRiskProfiles: number;
        };
        error?: undefined;
    } | {
        success: boolean;
        error: string;
        data?: undefined;
    }>;
    getComplianceMetrics(): Promise<{
        success: boolean;
        data: {
            totalProfiles: any;
            statusDistribution: Record<string, number>;
            userTypeDistribution: Record<string, number>;
            totalDocuments: number;
            approvedDocuments: number;
            documentApprovalRate: string;
        };
        error?: undefined;
    } | {
        success: boolean;
        error: string;
        data?: undefined;
    }>;
    getDocumentStatusReport(): Promise<{
        success: boolean;
        data: {
            totalDocuments: number;
            documentStatusDistribution: Record<string, number>;
            documentTypeDistribution: Record<string, number>;
        };
        error?: undefined;
    } | {
        success: boolean;
        error: string;
        data?: undefined;
    }>;
    getAllUsers(): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: string;
        data?: undefined;
    }>;
    getAllComplianceDocuments(): Promise<{
        success: boolean;
        data: any[];
        error?: undefined;
    } | {
        success: boolean;
        error: string;
        data?: undefined;
    }>;
    approveDisapproveUser(userId: string, status: 'approved' | 'rejected', note?: string, updatedBy?: string): Promise<{
        success: boolean;
        error: string;
        message?: undefined;
        data?: undefined;
    } | {
        success: boolean;
        message: string;
        data: {
            userId: string;
            status: KYCStatus;
            reviewedBy: string | undefined;
            reviewDate: Date | undefined;
        };
        error?: undefined;
    }>;
    sendMessageToUser(userId: string, message: string, sentBy?: string): Promise<{
        success: boolean;
        error: string;
        message?: undefined;
        data?: undefined;
    } | {
        success: boolean;
        message: string;
        data: {
            id: `${string}-${string}-${string}-${string}-${string}`;
            message: string;
            sentBy: string | undefined;
            sentAt: Date;
            read: boolean;
        };
        error?: undefined;
    }>;
    blockUser(userId: string, reason?: string, blockedBy?: string): Promise<{
        success: boolean;
        error: string;
        message?: undefined;
        data?: undefined;
    } | {
        success: boolean;
        message: string;
        data: {
            userId: string;
            isBlocked: boolean | undefined;
            blockedReason: string | undefined;
            blockedBy: string | undefined;
            blockedAt: Date | undefined;
        };
        error?: undefined;
    }>;
    unblockUser(userId: string, unblockedBy?: string): Promise<{
        success: boolean;
        error: string;
        message?: undefined;
        data?: undefined;
    } | {
        success: boolean;
        message: string;
        data: {
            userId: string;
            isBlocked: boolean | undefined;
            unblockedBy: string | undefined;
            unblockedAt: Date;
        };
        error?: undefined;
    }>;
    verifyCertificateWithCAC(userId: string, registrationNumber: string, companyName: string, verifiedBy?: string): Promise<{
        success: boolean;
        message?: string;
        data?: {
            verificationResult: CACVerificationResult;
            userId: string;
            verifiedBy?: string;
            verifiedAt: Date;
        };
        error?: string;
    }>;
    updateKYCDocumentStatus(documentId: string, status: KYCStatus, rejectionReason?: string): Promise<{
        success: boolean;
        message?: string;
        data?: {
            documentId: string;
            status: KYCStatus;
            rejectionReason: string | undefined;
        };
        error?: string;
    }>;
    getKYCDocument(documentId: string): Promise<{
        success: boolean;
        data?: {
            userId: string;
            type: any;
            fileName: string;
            fileType: string;
            fileSize: number;
            uploadDate: Date;
            status: KYCStatus;
            rejectionReason?: string;
        };
        error?: string;
    }>;
    getAllKYCDocuments(userId: string): Promise<{
        success: boolean;
        data?: any[];
        error?: string;
    }>;
    searchKYCProfiles(filters: any): Promise<{
        success: boolean;
        data?: (KYCProfile & {
            _id: string;
        })[];
        error?: string;
    }>;
    reviewKYC(kycId: string, status: KYCStatus, rejectionReason?: string, reviewedBy?: string): Promise<{
        success: boolean;
        message?: string;
        data?: {
            kycId: string;
            status: KYCStatus;
            rejectionReason: string | undefined;
            reviewedBy: string | undefined;
            reviewDate: Date | undefined;
        };
        error?: string;
    }>;
}
export declare const kycService: KYCService;
//# sourceMappingURL=kycService.d.ts.map