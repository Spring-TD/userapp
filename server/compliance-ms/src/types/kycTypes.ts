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
  MERCHANT = 'merchant'
}

// KYC document types
export enum DocumentType {
  IDENTITY = 'identity',
  ADDRESS = 'address',
  BUSINESS = 'business',
  TAX = 'tax',
  BANK = 'bank'
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

// KYC submission request
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

// KYC search filters
export interface KYCSearchFilters {
  userId?: string;
  userType?: UserType;
  status?: KYCStatus;
  startDate?: Date;
  endDate?: Date;
  merchantId?: string;
}