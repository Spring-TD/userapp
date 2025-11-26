export declare enum KYCStatus {
    PENDING = "pending",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    FAILED = "failed",
    REVIEW = "review",
    APPROVED = "approved",
    REJECTED = "rejected"
}
export declare enum UserType {
    INDIVIDUAL = "individual",
    MERCHANT = "merchant",
    ADMIN = "admin"
}
export declare enum DocumentType {
    IDENTITY = "identity",
    ADDRESS = "address",
    INCOME_PROOF = "income_proof",
    BUSINESS_REGISTRATION = "business_registration",
    BUSINESS_LICENSE = "business_license",
    CORPORATE_STRUCTURE = "corporate_structure",
    BENEFICIAL_OWNERSHIP = "beneficial_ownership",
    ARTICLES_OF_INCORPORATION = "articles_of_incorporation",
    FINANCIAL_STATEMENTS = "financial_statements",
    TAX_CERTIFICATE = "tax_certificate",
    BANK = "bank",
    TAX = "tax"
}
export interface KYCDocument {
    type: DocumentType;
    fileName: string;
    fileType: string;
    fileSize: number;
    uploadDate: Date;
    status: KYCStatus;
    rejectionReason?: string;
}
export interface KYCProfile {
    userId: string;
    userType: UserType;
    documents: KYCDocument[];
    status: KYCStatus;
    submittedAt?: Date;
    completedAt?: Date;
    reviewedBy?: string;
    reviewDate?: Date;
    rejectionReason?: string;
    isBlocked?: boolean;
    blockedReason?: string;
    blockedBy?: string;
    blockedAt?: Date;
    unblockedBy?: string;
    unblockedAt?: Date;
    approvalNotes?: string;
    messages?: Array<{
        id: string;
        message: string;
        sentBy?: string;
        sentAt: Date;
        read: boolean;
    }>;
    shareholders?: Array<Shareholder>;
}
export interface EnhancedKYCProfile extends KYCProfile {
    riskLevel: RiskLevel;
    complianceNotes?: string;
    lastReviewDate?: Date;
    nextReviewDate?: Date;
    approvedBy?: string;
    approvalDate?: Date;
}
export interface KYCVerification {
    success: boolean;
    message: string;
    data?: {
        kycStatus: KYCStatus;
        documents: KYCDocument[];
        verificationDate: Date;
    };
    error?: string;
}
export interface IndividualKYCSubmissionRequest {
    userId: string;
    userType: UserType.INDIVIDUAL;
    personalInfo: {
        firstName: string;
        lastName: string;
        dateOfBirth: Date;
        nationality: string;
        occupation: string;
        sourceOfFunds: string;
    };
    documents: Array<{
        type: DocumentType.IDENTITY | DocumentType.ADDRESS | DocumentType.INCOME_PROOF | DocumentType.BANK;
        fileName: string;
        fileType: string;
        fileSize: number;
        fileUrl: string;
    }>;
    riskAssessment?: {
        politicallyExposed: boolean;
        sanctionListCheck: boolean;
    };
}
export declare enum BusinessDocumentType {
    CERTIFICATE_OF_INCORPORATION = "certificate_of_incorporation",
    ARTICLES_OF_ASSOCIATION = "articles_of_association",
    LIST_OF_SHAREHOLDERS = "list_of_shareholders",
    PROOF_OF_ADDRESS = "proof_of_address",
    BANK_STATEMENT = "bank_statement",
    AML_POLICIES = "aml_policies",
    DATA_PRIVACY_POLICY = "data_privacy_policy"
}
export interface BusinessDocumentData {
    type: BusinessDocumentType;
    fileName: string;
    fileType: string;
    fileSize: number;
    fileUrl: string;
    uploadedAt: Date;
    status: KYCStatus;
    rejectionReason?: string;
}
export interface Shareholder {
    fullName: string;
    email?: string;
    phoneNumber?: string;
    bvn?: string;
    bankAccount?: string;
    ownershipPercentage: number;
    submittedAt?: Date;
    uboDocument?: {
        fileName: string;
        fileType: string;
        fileSize: number;
        fileUrl: string;
        uploadDate: Date;
    };
    bankStatement: {
        fileName: string;
        fileType: string;
        fileSize: number;
        fileUrl: string;
        uploadDate: Date;
    };
    status: KYCStatus;
    kyc: {
        url: string;
        expiresAt: Date;
        status: 'pending' | 'active' | 'expired' | 'completed' | 'failed';
        providerReference?: string;
        result?: {
            success: boolean;
            score?: number;
            details?: string;
            completedAt?: Date;
        };
    };
}
export interface BusinessKYCSubmissionRequest {
    userId: string;
    userType: UserType.MERCHANT;
    businessInfo: AboutTheBusinessData;
    businessSurvey: BusinessSurveyData;
    shareholders: Shareholder[];
    businessDocuments: BusinessDocumentData[];
    riskAssessment: {
        annualTurnover: number;
        expectedTransactionVolume: number;
        highRiskJurisdiction: boolean;
        sanctionListCheck: boolean;
        adverseMediaCheck: boolean;
    };
}
export interface AboutTheBusinessData {
    companyName: string;
    industry: string;
    countryOfIncorporation: string;
    website: string;
    companyRegId: string;
    companyLogoUrl: string;
}
export interface BusinessSurveyData {
    businessType: string;
    country: string;
    businessModel: string;
    monthlyProcessedVolume: number;
}
export interface KYCSubmissionRequest {
    userId: string;
    userType: UserType;
    documents: Array<{
        type: DocumentType;
        fileName: string;
        fileType: string;
        fileSize: number;
        fileUrl: string;
    }>;
    additionalInfo?: {
        [key: string]: any;
    };
}
export interface KYCReviewRequest {
    kycId: string;
    status: KYCStatus;
    rejectionReason?: string;
    reviewedBy: string;
}
export declare enum BusinessType {
    SOLE_PROPRIETORSHIP = "sole_proprietorship",
    PARTNERSHIP = "partnership",
    LIMITED_LIABILITY_COMPANY = "limited_liability_company",
    CORPORATION = "corporation",
    NON_PROFIT = "non_profit",
    GOVERNMENT_ENTITY = "government_entity"
}
export declare enum RiskLevel {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    VERY_HIGH = "very_high"
}
export interface KYCSearchFilters {
    userId?: string;
    userType?: UserType;
    status?: KYCStatus;
    riskLevel?: RiskLevel;
    businessType?: BusinessType;
    industry?: string;
    jurisdiction?: string;
    startDate?: Date;
    endDate?: Date;
    merchantId?: string;
    approvedBy?: string;
}
export declare const INDIVIDUAL_REQUIRED_DOCUMENTS: readonly [DocumentType.IDENTITY, DocumentType.ADDRESS];
export declare const INDIVIDUAL_OPTIONAL_DOCUMENTS: readonly [DocumentType.INCOME_PROOF, DocumentType.BANK];
export declare const BUSINESS_OPTIONAL_DOCUMENTS: readonly [DocumentType.BUSINESS_LICENSE, DocumentType.CORPORATE_STRUCTURE, DocumentType.ARTICLES_OF_INCORPORATION, DocumentType.FINANCIAL_STATEMENTS, DocumentType.TAX_CERTIFICATE];
export interface RiskIndicators {
    politicallyExposed: boolean;
    highRiskJurisdiction: boolean;
    adverseMedia: boolean;
    sanctionList: boolean;
    unusualTransactionPattern: boolean;
    highValueTransactions: boolean;
}
export declare enum ComplianceWorkflowStatus {
    INITIAL_SCREENING = "initial_screening",
    DOCUMENT_REVIEW = "document_review",
    ENHANCED_DUE_DILIGENCE = "enhanced_due_diligence",
    RISK_ASSESSMENT = "risk_assessment",
    FINAL_APPROVAL = "final_approval",
    ONGOING_MONITORING = "ongoing_monitoring"
}
//# sourceMappingURL=kycTypes.d.ts.map