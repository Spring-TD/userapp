// src/types/kycTypes.ts

// KYC status enum
export enum KYCStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REVIEW = 'review',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

// User types
export enum UserType {
  INDIVIDUAL = 'individual',
  MERCHANT = 'merchant',
  ADMIN = 'admin'
}

// KYC document types
export enum DocumentType {
  // Individual-specific documents
  IDENTITY = 'identity',
  ADDRESS = 'address',
  INCOME_PROOF = 'income_proof',
  
  // Business-specific documents
  BUSINESS_REGISTRATION = 'business_registration',
  BUSINESS_LICENSE = 'business_license',
  CORPORATE_STRUCTURE = 'corporate_structure',
  BENEFICIAL_OWNERSHIP = 'beneficial_ownership',
  ARTICLES_OF_INCORPORATION = 'articles_of_incorporation',
  FINANCIAL_STATEMENTS = 'financial_statements',
  TAX_CERTIFICATE = 'tax_certificate',
  
  // Common documents
  BANK = 'bank',
  TAX = 'tax'
}

// KYC document interface
export interface KYCDocument {
  type: DocumentType;
  fileName: string;
  fileType: string; // MIME type
  fileSize: number; // in bytes
  uploadDate: Date;
  status: KYCStatus;
  rejectionReason?: string;
}

// KYC profile interface
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
  // New fields for admin functionality
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
  // Updated from beneficialOwners to shareholders
  shareholders?: Array<Shareholder>;
}

// Enhanced KYC profile interface
export interface EnhancedKYCProfile extends KYCProfile {
  riskLevel: RiskLevel;
  complianceNotes?: string;
  lastReviewDate?: Date;
  nextReviewDate?: Date;
  approvedBy?: string;
  approvalDate?: Date;
}

// KYC verification result
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

// Individual KYC submission request
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

// Business document types enum for the 8 required documents
export enum BusinessDocumentType {
  CERTIFICATE_OF_INCORPORATION = 'certificate_of_incorporation',
  ARTICLES_OF_ASSOCIATION = 'articles_of_association',
  LIST_OF_SHAREHOLDERS = 'list_of_shareholders',
  PROOF_OF_ADDRESS = 'proof_of_address',
  BANK_STATEMENT = 'bank_statement',
  AML_POLICIES = 'aml_policies',
  DATA_PRIVACY_POLICY = 'data_privacy_policy',
  LICENSE = 'license'
}

// Business Document interface for the 8 required documents
export interface BusinessDocumentData {
  type: BusinessDocumentType;
  fileName: string;
  fileType: string; // Must be 'application/pdf'
  fileSize: number; // in bytes, must not exceed 5MB (5242880 bytes)
  fileUrl: string; // Cloudinary URL
  uploadedAt: Date;
  status: KYCStatus;
  rejectionReason?: string;
}

// Shareholder interface for business KYC
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
  // Added kyc field for liveness test link
  kyc: {
    url: string; // The URL for the liveness test
    expiresAt: Date; // When the link expires
    status: 'pending' | 'active' | 'expired' | 'completed' | 'failed'; // Current status of the link
    providerReference?: string; // Reference ID from the 3rd party provider
    result?: {
      success: boolean;
      score?: number;
      details?: string;
      completedAt?: Date;
    };
  };
}

// Business KYC submission request with dedicated business documents
export interface BusinessKYCSubmissionRequest {
  userId: string;
  userType: UserType.MERCHANT;
  businessInfo: AboutTheBusinessData;
  businessSurvey: BusinessSurveyData;
  shareholders: Shareholder[];
  // Replace the generic documents array with businessDocuments
  businessDocuments: BusinessDocumentData[];
  riskAssessment: {
    annualTurnover: number;
    expectedTransactionVolume: number;
    highRiskJurisdiction: boolean;
    sanctionListCheck: boolean;
    adverseMediaCheck: boolean;
  };
}

// AboutTheBusinessData interface for business information
export interface AboutTheBusinessData {
  // Company name
  companyName: string;
  
  // Industry
  industry: string;
  
  // Country of incorporation
  countryOfIncorporation: string;
  
  // Website
  website: string;
  
  // Company registration ID/Number
  companyRegId: string;
  
  // Upload company logo (URL reference)
  companyLogoUrl: string;
}

// BusinessSurvey interface for business survey information
export interface BusinessSurveyData {
  annualTurnover: number;
  expectedTransactionVolume: number;
  expectedTransactionValue: number;
  sourceOfFunds: string;
  businessPurpose: string;
  numberOfEmployees: number;
  operatingSince: Date;
  websiteTraffic?: number;
  socialMediaPresence?: boolean;
  marketingChannels?: string;
  paymentMethods?: string;
  businessModelDescription: string;
  customerBaseDescription: string;
  geographicMarkets: string;
  regulatoryLicenses?: string;
  insuranceCoverage?: string;
  previousBankingRelationship?: string;
  reasonForOpeningAccount: string;
}

// Generic KYC submission request (for backward compatibility)
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

// KYC review request
export interface KYCReviewRequest {
  kycId: string;
  status: KYCStatus;
  rejectionReason?: string;
  reviewedBy: string;
}

// Business types enum
export enum BusinessType {
  SOLE_PROPRIETORSHIP = 'sole_proprietorship',
  PARTNERSHIP = 'partnership',
  LIMITED_LIABILITY_COMPANY = 'limited_liability_company',
  CORPORATION = 'corporation',
  NON_PROFIT = 'non_profit',
  GOVERNMENT_ENTITY = 'government_entity'
}

// Risk levels enum
export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high'
}

// KYC search filters
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

// Document requirements by user type
export const INDIVIDUAL_REQUIRED_DOCUMENTS = [
  DocumentType.IDENTITY,
  DocumentType.ADDRESS
] as const;

export const INDIVIDUAL_OPTIONAL_DOCUMENTS = [
  DocumentType.INCOME_PROOF,
  DocumentType.BANK
] as const;

export const BUSINESS_REQUIRED_DOCUMENTS = [
  DocumentType.BUSINESS_REGISTRATION,
  DocumentType.BENEFICIAL_OWNERSHIP,
  DocumentType.BANK
] as const;

export const BUSINESS_OPTIONAL_DOCUMENTS = [
  DocumentType.BUSINESS_LICENSE,
  DocumentType.CORPORATE_STRUCTURE,
  DocumentType.ARTICLES_OF_INCORPORATION,
  DocumentType.FINANCIAL_STATEMENTS,
  DocumentType.TAX_CERTIFICATE
] as const;

// High-risk indicators
export interface RiskIndicators {
  politicallyExposed: boolean;
  highRiskJurisdiction: boolean;
  adverseMedia: boolean;
  sanctionList: boolean;
  unusualTransactionPattern: boolean;
  highValueTransactions: boolean;
}

// Compliance workflow status
export enum ComplianceWorkflowStatus {
  INITIAL_SCREENING = 'initial_screening',
  DOCUMENT_REVIEW = 'document_review',
  ENHANCED_DUE_DILIGENCE = 'enhanced_due_diligence',
  RISK_ASSESSMENT = 'risk_assessment',
  FINAL_APPROVAL = 'final_approval',
  ONGOING_MONITORING = 'ongoing_monitoring'
}