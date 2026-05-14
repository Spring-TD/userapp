// src/services/kycService.ts
import { randomUUID } from 'crypto';
import { 
  KYCProfile, 
  KYCStatus, 
  KYCSubmissionRequest,
  IndividualKYCSubmissionRequest,
  BusinessKYCSubmissionRequest,
  RiskLevel,
  BusinessType,
  RiskIndicators,
  ComplianceWorkflowStatus,
  UserType,
  Shareholder
} from '../types/kycTypes';
import { logger } from '../utils/logger';
import { auditLogger } from '../utils/audit';
import axios from 'axios';
import { 
  KYC_NOTIFICATIONS_ENABLED,
  KYC_NOTIFICATIONS_CHANNELS,
  SERVICE_AUTH_URL,
  SERVICE_AUTH_INTERNAL_TOKEN,
  NOTIFICATIONS_SERVICE_URL,
  PREMBLY_DEFAULT_BANK_CODE
} from '../config/environment';
import { KYCProfileModelMongo as MockKYCProfileModel, KYCDocumentModelMongo as MockKYCDocumentModel } from '../utils/kycProfileMongo';
import { BusinessInfoModel } from '../models/BusinessInfoModel';
import { BusinessSurveyModel } from '../models/BusinessSurveyModel';
import { BusinessDocumentModel } from '../models/BusinessDocumentModel';
import { ShareholderModel } from '../models/ShareholderModel';
import {
  BusinessDocumentType,
  BUSINESS_DOCUMENT_DISPLAY_NAMES,
  BusinessDocumentData
} from '../types/kycTypes';

/** Map API shareholder shape to ShareholderModel document (document URLs stored in DO Spaces) */
function shareholderToDoc(userId: string, s: any): Record<string, unknown> {
  return {
    userId,
    fullName: s.fullName,
    email: s.email,
    phoneNumber: s.phoneNumber,
    bvn: s.bvn,
    bankAccount: s.bankAccount,
    bankCode: s.bankCode,
    documentType: s.documentType,
    ownershipPercentage: s.ownershipPercentage,
    uboDocumentUrl: s.uboDocument?.fileUrl,
    uboDocumentFileName: s.uboDocument?.fileName,
    uboDocumentFileSize: s.uboDocument?.fileSize,
    uboDocumentUploadedAt: s.uboDocument?.uploadDate,
    bankStatementDocumentUrl: s.bankStatement?.fileUrl,
    bankStatementDocumentFileName: s.bankStatement?.fileName,
    bankStatementDocumentFileSize: s.bankStatement?.fileSize,
    bankStatementDocumentUploadedAt: s.bankStatement?.uploadDate,
    status: s.status ?? KYCStatus.PENDING,
    submittedAt: s.submittedAt,
    kyc: s.kyc,
  };
}

/** Map ShareholderModel document to API Shareholder shape */
function docToShareholder(d: any): any {
  return {
    _id: d._id?.toString?.(),
    fullName: d.fullName,
    email: d.email,
    phoneNumber: d.phoneNumber,
    bvn: d.bvn,
    bankAccount: d.bankAccount,
    bankCode: d.bankCode,
    documentType: d.documentType,
    ownershipPercentage: d.ownershipPercentage,
    uboDocument: d.uboDocumentUrl
      ? {
          fileName: d.uboDocumentFileName ?? '',
          fileType: 'application/pdf',
          fileSize: d.uboDocumentFileSize ?? 0,
          fileUrl: d.uboDocumentUrl,
          uploadDate: d.uboDocumentUploadedAt ?? d.createdAt,
        }
      : undefined,
    bankStatement: {
      fileName: d.bankStatementDocumentFileName ?? '',
      fileType: 'application/pdf',
      fileSize: d.bankStatementDocumentFileSize ?? 0,
      fileUrl: d.bankStatementDocumentUrl ?? '',
      uploadDate: d.bankStatementDocumentUploadedAt ?? d.createdAt,
    },
    status: d.status,
    submittedAt: d.submittedAt,
    kyc: d.kyc,
  };
}
import { 
  validateKYCSubmission, 
  validateIndividualKYCSubmission,
  validateBusinessKYCSubmission,
  businessDocumentsUpsertSchema
} from '../utils/validation';
import { cacService, CACVerificationResult } from './cacService';
import {
  premblyService,
  PremblyIndividualKYCRequest,
  PremblyBusinessKYCRequest,
  IdentityPassVerificationResult
} from './premblyService';

// Service class for KYC operations
export class KYCService {
  private buildShareholderKycPublicBase(): string {
    return (
      process.env.KYC_PUBLIC_BASE_URL ||
      process.env.PUBLIC_BASE_URL ||
      process.env.COMPLIANCE_BASE_URL ||
      `http://localhost:${process.env.PORT || '4003'}`
    ).replace(/\/$/, '');
  }

  /** Fallback URL when Prembly does not return a redirect (still a valid absolute URL for clients). */
  private buildShareholderIdentityPassFallbackUrl(reference: string): string {
    const base = this.buildShareholderKycPublicBase();
    return `${base}/kyc/shareholder-identitypass?reference=${encodeURIComponent(reference)}`;
  }

  private mapIdentityPassToKycStatus(
    result: IdentityPassVerificationResult
  ): 'pending' | 'completed' | 'failed' {
    if (!result.ok) {
      return 'failed';
    }
    const s = (result.premlyStatus || '').toString().toLowerCase();
    if (['success', 'verified', 'completed'].includes(s)) {
      return 'completed';
    }
    if (['failed', 'fail', 'rejected', 'error'].includes(s)) {
      return 'failed';
    }
    return 'pending';
  }

  /**
   * Starts Prembly **IdentityPass** for the shareholder (BVN, bank account, or document).
   * Priority: BVN → bank account (+ bank code) → UBO / bank statement URL. Liveness is not used.
   */
  private async ensureShareholderKycLink(userId: string, shareholder: any): Promise<any> {
    if (shareholder?.kyc?.url) {
      return shareholder;
    }

    const bvnDigits =
      typeof shareholder.bvn === 'string' ? shareholder.bvn.replace(/\D/g, '') : '';
    const bankAccount =
      typeof shareholder.bankAccount === 'string' ? shareholder.bankAccount.trim() : '';
    const bankCodeRaw =
      typeof shareholder.bankCode === 'string' ? shareholder.bankCode.replace(/\D/g, '') : '';
    const bankCode = bankCodeRaw || (PREMBLY_DEFAULT_BANK_CODE || '').replace(/\D/g, '') || '';
    const uboUrl =
      typeof shareholder.uboDocument?.fileUrl === 'string'
        ? shareholder.uboDocument.fileUrl.trim()
        : '';
    const stmtUrl =
      shareholder.bankStatement &&
      typeof shareholder.bankStatement.fileUrl === 'string'
        ? shareholder.bankStatement.fileUrl.trim()
        : '';

    let verificationKind: 'bvn' | 'bank_account' | 'document';
    let result: IdentityPassVerificationResult;

    if (bvnDigits.length === 11) {
      verificationKind = 'bvn';
      if (premblyService.isIdentityPassConfigured()) {
        result = await premblyService.identityPassVerifyBvn(bvnDigits);
      } else {
        result = premblyService.mockIdentityPassResult('bvn');
      }
    } else if (bankAccount) {
      verificationKind = 'bank_account';
      if (!bankCode) {
        return {
          ...shareholder,
          kyc: {
            url: '',
            expiresAt: new Date(),
            status: 'failed' as const,
            flow: 'identitypass' as const,
            verificationKind: 'bank_account',
            message:
              'bankCode is required for bank account verification (or set PREMBLY_DEFAULT_BANK_CODE server-side).'
          }
        };
      }
      if (premblyService.isIdentityPassConfigured()) {
        result = await premblyService.identityPassVerifyBankAccount(bankAccount, bankCode);
      } else {
        result = premblyService.mockIdentityPassResult('bank_account');
      }
    } else if (uboUrl || stmtUrl) {
      verificationKind = 'document';
      const docUrl = uboUrl || stmtUrl;
      const extra: Record<string, string> = {};
      if (typeof shareholder.documentType === 'string' && shareholder.documentType.trim()) {
        extra.doc_type = shareholder.documentType.trim();
      }
      if (premblyService.isIdentityPassConfigured()) {
        result = await premblyService.identityPassVerifyDocument(docUrl, extra);
      } else {
        result = premblyService.mockIdentityPassResult('document');
      }
    } else {
      return {
        ...shareholder,
        kyc: {
          url: '',
          expiresAt: new Date(),
          status: 'failed' as const,
          flow: 'identitypass' as const,
          message:
            'Provide a valid 11-digit BVN, bank account with bank code, or upload a UBO or bank statement document for IdentityPass verification.'
        }
      };
    }

    const reference =
      result.reference || `local-${randomUUID()}`;
    const url =
      result.redirectUrl || this.buildShareholderIdentityPassFallbackUrl(reference);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const status = this.mapIdentityPassToKycStatus(result);

    return {
      ...shareholder,
      kyc: {
        url,
        expiresAt,
        status,
        providerReference: reference,
        flow: 'identitypass',
        verificationKind,
        premlyVerificationStatus: result.premlyStatus,
        message: result.message
      }
    };
  }

  private isKycEmailEnabled(): boolean {
    if (!KYC_NOTIFICATIONS_ENABLED) return false;
    const channels = (KYC_NOTIFICATIONS_CHANNELS || '')
      .split(',')
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean);
    return channels.includes('email');
  }

  private async getMerchantContact(userId: string): Promise<{ email: string; userName: string } | null> {
    try {
      const url = `${SERVICE_AUTH_URL}/internal/api/v1/users/${userId}/contact`;
      const response = await axios.get(url, {
        headers: { 'X-Internal-Token': SERVICE_AUTH_INTERNAL_TOKEN },
        timeout: 5000
      });

      type ServiceAuthContactResponse = {
        success: boolean;
        data?: {
          email?: string;
          userName?: string;
        };
      };

      const payload = response.data as ServiceAuthContactResponse;
      if (!payload?.success || !payload?.data?.email) return null;

      return {
        email: payload.data.email,
        userName: payload.data.userName || payload.data.email
      };
    } catch (error) {
      logger.error('Failed to fetch merchant contact for KYC email', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  private async sendKycStatusEmail(args: {
    userId: string;
    userType: UserType;
    previousStatus?: KYCStatus;
    newStatus: KYCStatus;
    reviewDate: Date;
    reviewReason?: string;
  }): Promise<void> {
    // Only email merchants.
    if (args.userType !== UserType.MERCHANT) return;

    // Only send on transitions (or initial create, where previousStatus is undefined).
    if (args.previousStatus !== undefined && args.previousStatus === args.newStatus) return;

    if (!this.isKycEmailEnabled()) return;

    const contact = await this.getMerchantContact(args.userId);
    if (!contact) return;

    const incompleteStatuses = new Set<KYCStatus>([
      KYCStatus.FAILED,
      KYCStatus.REJECTED,
      KYCStatus.IN_PROGRESS
    ]);

    if (incompleteStatuses.has(args.newStatus)) {
      try {
        await axios.post(
          `${NOTIFICATIONS_SERVICE_URL}/api/v1/notifications/send-dual`,
          {
            userId: args.userId,
            email: contact.email,
            template: 'compliance-incomplete',
            data: {
              merchantName: contact.userName,
              summary: args.reviewReason || `Compliance status: ${args.newStatus}`,
              detail: ''
            }
          },
          { timeout: 10000 }
        );
      } catch (error) {
        logger.error('Failed to send compliance-incomplete notification', {
          userId: args.userId,
          newStatus: args.newStatus,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      return;
    }

    const emailUrl = `${NOTIFICATIONS_SERVICE_URL}/api/v1/notifications/send`;
    try {
      await axios.post(
        emailUrl,
        {
          channel: 'email',
          recipient: contact.email,
          template: 'kyc-status-updated',
          data: {
            userName: contact.userName,
            status: args.newStatus,
            reviewDate: args.reviewDate.toISOString(),
            reviewReason: args.reviewReason ?? ''
          }
        },
        { timeout: 5000 }
      );
    } catch (error) {
      logger.error('Failed to send KYC status email', {
        userId: args.userId,
        newStatus: args.newStatus,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Submit individual KYC for verification
  async submitIndividualKYC(data: IndividualKYCSubmissionRequest, userId?: string): Promise<{
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
  }> {
    try {
      const { error } = validateIndividualKYCSubmission(data);
      
      if (error) {
        return {
          success: false,
          error: error.message || (error as any).details?.[0]?.message || 'Validation error'
        };
      }

      // Calculate risk level based on individual factors
      const riskLevel = this.calculateIndividualRiskLevel(data);
      
      const kycProfileData: any = {
        userId: data.userId,
        userType: data.userType,
        documents: data.documents.map((doc: any) => ({
          type: doc.type,
          fileName: doc.fileName,
          fileType: doc.fileType,
          fileSize: doc.fileSize,
          uploadDate: new Date(),
          status: KYCStatus.PENDING
        })),
        status: KYCStatus.PENDING,
        submittedAt: new Date(),
        personalInfo: data.personalInfo,
        riskAssessment: data.riskAssessment,
        riskLevel,
        workflowStatus: ComplianceWorkflowStatus.INITIAL_SCREENING
      };
      
      const result = await MockKYCProfileModel.save(kycProfileData);
      
      logger.info('Individual KYC submitted successfully', {
        userId: data.userId,
        riskLevel,
        documentCount: data.documents.length
      });
      
      auditLogger('INDIVIDUAL_KYC_SUBMISSION', data.userId, {
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
    } catch (error) {
      logger.error('Error submitting individual KYC', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: 'Error submitting individual KYC'
      };
    }
  }

  // Submit business KYC for verification
  async submitBusinessKYC(data: BusinessKYCSubmissionRequest, userId?: string): Promise<{
    success: boolean;
    message?: string;
    data?: {
      kycId: string;
      status: KYCStatus;
      riskLevel: RiskLevel;
      submittedAt: Date | undefined;
      documents: any[];
      shareholderCount: number;
      shareholders?: any[];
    };
    error?: any;
  }> {
    try {
      const validation = validateBusinessKYCSubmission(data);

      if (validation.error) {
        const err = validation.error as any;
        return {
          success: false,
          error: err.message || err.details?.[0]?.message || 'Validation error'
        };
      }

      const value = validation.value as BusinessKYCSubmissionRequest;
      const businessDocuments = value.businessDocuments ?? [];

      // Calculate risk level based on business factors
      const riskLevel = this.calculateBusinessRiskLevel(value);

      // Documents are submitted as PENDING and require admin approval before Prembly verification
      logger.info('Business KYC submitted - documents require admin approval before Prembly verification', {
        userId: value.userId,
        documentCount: businessDocuments.length
      });

      await this.upsertBusinessDocumentRows(value.userId, businessDocuments);

      const shareholdersWithKyc: any[] = [];
      for (const s of value.shareholders) {
        const shareholderWithKyc = await this.ensureShareholderKycLink(value.userId, s);
        shareholdersWithKyc.push(shareholderWithKyc);
        await ShareholderModel.create(shareholderToDoc(value.userId, shareholderWithKyc));
      }

      const kycProfileData: any = {
        userId: value.userId,
        userType: value.userType,
        documents: [],
        status: KYCStatus.PENDING,
        submittedAt: new Date(),
        shareholders: [], // Shareholders are stored in shareholders collection
        riskAssessment: value.riskAssessment,
        riskLevel,
        workflowStatus: ComplianceWorkflowStatus.INITIAL_SCREENING
      };

      await BusinessInfoModel.findOneAndUpdate(
        { userId: value.userId },
        { userId: value.userId, ...value.businessInfo },
        { upsert: true, new: true }
      );
      await BusinessSurveyModel.findOneAndUpdate(
        { userId: value.userId },
        { userId: value.userId, ...value.businessSurvey },
        { upsert: true, new: true }
      );

      // Upsert KYC profile: update if one exists for this userId (unique index), otherwise create
      const existingProfile = await MockKYCProfileModel.findOne({ userId: value.userId });
      const previousStatus = existingProfile?.status as KYCStatus | undefined;
      const result = existingProfile
        ? await MockKYCProfileModel.findByIdAndUpdate(existingProfile._id, kycProfileData, { new: true })
        : await MockKYCProfileModel.save(kycProfileData);
      if (!result) {
        return { success: false, error: 'Failed to save or update KYC profile.' };
      }

      await this.sendKycStatusEmail({
        userId: result.userId,
        userType: result.userType,
        previousStatus,
        newStatus: result.status as KYCStatus,
        reviewDate: result.submittedAt ?? new Date()
      });
      const savedBusinessDocs = await BusinessDocumentModel.find({ userId: value.userId }).lean();
      const documentsResponse = savedBusinessDocs.map((d: any) => ({
        _id: d._id?.toString?.(),
        type: d.documentType,
        fileName: d.fileName,
        fileType: d.fileType,
        fileSize: d.fileSize,
        uploadDate: d.uploadedAt,
        status: d.status,
        fileUrl: d.fileUrl
      }));

      logger.info('Business KYC submitted successfully', {
        userId: value.userId,
        industry: value.businessInfo?.industry,
        riskLevel,
        documentCount: businessDocuments.length,
        shareholderCount: value.shareholders?.length
      });

      auditLogger('BUSINESS_KYC_SUBMISSION', value.userId, {
        industry: value.businessInfo?.industry,
        riskLevel,
        documentCount: businessDocuments.length,
        shareholderCount: value.shareholders?.length,
        highRiskJurisdiction: value.riskAssessment?.highRiskJurisdiction
      });

      return {
        success: true,
        message: 'Business KYC submitted successfully for processing',
        data: {
          kycId: result._id,
          status: result.status,
          riskLevel,
          submittedAt: result.submittedAt,
          documents: documentsResponse,
          shareholderCount: value.shareholders?.length,
          shareholders: shareholdersWithKyc
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error submitting business KYC', { error: message });
      
      return {
        success: false,
        error: `Error submitting business KYC: ${message}`
      };
    }
  }

  /** Persist or replace business document rows (one per document type per user). */
  private async upsertBusinessDocumentRows(userId: string, businessDocuments: BusinessDocumentData[]): Promise<void> {
    for (const doc of businessDocuments) {
      const documentType = doc.type as BusinessDocumentType;
      await BusinessDocumentModel.findOneAndUpdate(
        { userId, documentType },
        {
          userId,
          documentType,
          displayName: BUSINESS_DOCUMENT_DISPLAY_NAMES[documentType] ?? documentType,
          fileUrl: doc.fileUrl,
          fileName: doc.fileName,
          fileType: doc.fileType,
          fileSize: doc.fileSize,
          uploadedAt: doc.uploadedAt ?? new Date(),
          status: KYCStatus.PENDING
        },
        { upsert: true, new: true }
      );
    }
  }

  /**
   * Add or replace uploaded business documents after initial submit (same upsert rules as submit).
   * Body: `{ "businessDocuments": [ { type, fileName, fileType, fileUrl, fileSize, uploadedAt, status }, ... ] }` (≥1 row).
   */
  async upsertBusinessDocumentsForMerchant(
    userId: string,
    body: { businessDocuments: BusinessDocumentData[] }
  ): Promise<{ success: boolean; error?: string; data?: { updated: number; documents: any[] } }> {
    try {
      if (!userId) {
        return { success: false, error: 'User ID is required' };
      }
      const { error, value } = businessDocumentsUpsertSchema.validate(body, { abortEarly: false });
      if (error) {
        return {
          success: false,
          error: error.details.map((d) => d.message).join(', ') || 'Validation error'
        };
      }
      await this.upsertBusinessDocumentRows(userId, value.businessDocuments);
      const saved = await BusinessDocumentModel.find({ userId }).lean();
      const documentsResponse = saved.map((d: any) => ({
        _id: d._id?.toString?.(),
        type: d.documentType,
        fileName: d.fileName,
        fileType: d.fileType,
        fileSize: d.fileSize,
        uploadDate: d.uploadedAt,
        status: d.status,
        fileUrl: d.fileUrl
      }));
      return {
        success: true,
        data: { updated: value.businessDocuments.length, documents: documentsResponse }
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      logger.error('Error upserting business documents', { error: message, userId });
      return { success: false, error: message };
    }
  }

  // Calculate risk level for individual customers
  /**
   * Map document type to Prembly document type
   */
  private mapDocumentTypeToPrembly(documentType: string): 'nin' | 'passport' | 'drivers_license' | 'voters_card' | null {
    const typeMap: Record<string, 'nin' | 'passport' | 'drivers_license' | 'voters_card'> = {
      'nin': 'nin',
      'national_id': 'nin',
      'passport': 'passport',
      'drivers_license': 'drivers_license',
      'driving_license': 'drivers_license',
      'voters_card': 'voters_card',
      'voter_card': 'voters_card'
    };

    const normalizedType = documentType?.toLowerCase().replace(/[_\s]/g, '');
    return typeMap[normalizedType] || null;
  }

  private calculateIndividualRiskLevel(data: IndividualKYCSubmissionRequest): RiskLevel {
    let riskScore = 0;
    
    // Base risk assessment
    if (data.riskAssessment?.politicallyExposed) riskScore += 3;
    if (data.riskAssessment?.sanctionListCheck) riskScore += 5;
    
    // Occupation-based risk
    const highRiskOccupations = ['politician', 'arms dealer', 'casino', 'money exchange'];
    if (highRiskOccupations.some(occ => 
      data.personalInfo.occupation.toLowerCase().includes(occ))) {
      riskScore += 2;
    }
    
    // High-risk nationalities (example)
    const highRiskCountries = ['AF', 'KP', 'IR', 'SY'];
    if (highRiskCountries.includes(data.personalInfo.nationality)) {
      riskScore += 2;
    }
    
    if (riskScore >= 7) return RiskLevel.VERY_HIGH;
    if (riskScore >= 5) return RiskLevel.HIGH;
    if (riskScore >= 2) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }
  
  // Calculate risk level for business customers
  private calculateBusinessRiskLevel(data: BusinessKYCSubmissionRequest): RiskLevel {
    let riskScore = 0;
    
    // Business risk assessment
    if (data.riskAssessment?.highRiskJurisdiction) riskScore += 3;
    if (data.riskAssessment?.adverseMediaCheck) riskScore += 2;
    if (data.riskAssessment?.sanctionListCheck) riskScore += 5;
    
    // High-risk business types
    const highRiskBusinessTypes = ['gambling', 'cryptocurrency', 'arms', 'precious metals'];
    if (data.businessSurvey?.businessType && highRiskBusinessTypes.some(type => 
      data.businessSurvey.businessType.toLowerCase().includes(type))) {
      riskScore += 3;
    }
    
    // Politically exposed shareholders (using a placeholder approach since Shareholder doesn't have isPoliticallyExposed property)
    // This would need to be updated if the Shareholder interface is extended with this property
    const pepOwners = [];
    if (pepOwners.length > 0) {
      riskScore += 2 + pepOwners.length;
    }
    
    // High transaction volume based on monthly processed volume
    if (data.businessSurvey?.monthlyProcessedVolume > 1000000) {
      riskScore += 2;
    }
    
    // High annual turnover (derived from monthly volume)
    if (data.businessSurvey?.monthlyProcessedVolume * 12 > 10000000) {
      riskScore += 2;
    }
    
    if (riskScore >= 10) return RiskLevel.VERY_HIGH;
    if (riskScore >= 6) return RiskLevel.HIGH;
    if (riskScore >= 3) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  // Generic submit KYC method (routes to specific implementations)
  async submitKYC(data: KYCSubmissionRequest | IndividualKYCSubmissionRequest | BusinessKYCSubmissionRequest, userId?: string) {
    if ((data as IndividualKYCSubmissionRequest).userType === UserType.INDIVIDUAL) {
      return this.submitIndividualKYC(data as IndividualKYCSubmissionRequest, userId);
    } else if ((data as BusinessKYCSubmissionRequest).userType === UserType.MERCHANT) {
      return this.submitBusinessKYC(data as BusinessKYCSubmissionRequest, userId);
    } else {
      // Fallback to original implementation for backward compatibility
      try {
        const { error } = validateKYCSubmission(data);
        
        if (error) {
          return {
            success: false,
            error: (error as any).details?.[0]?.message || 'Validation error'
          };
        }

        // Handle different document types based on the request type
        let documents: any[] = [];
        
        if ('documents' in data) {
          documents = (data as KYCSubmissionRequest).documents.map((doc: any) => ({
            type: doc.type,
            fileName: doc.fileName,
            fileType: doc.fileType,
            fileSize: doc.fileSize,
            uploadDate: new Date(),
            status: KYCStatus.PENDING
          }));
        } else if ('businessDocuments' in data) {
          documents = ((data as BusinessKYCSubmissionRequest).businessDocuments ?? []).map((doc: any) => ({
            type: doc.type as unknown as DocumentType,
            fileName: doc.fileName,
            fileType: doc.fileType,
            fileSize: doc.fileSize,
            uploadDate: new Date(),
            status: KYCStatus.PENDING
          }));
        }

        const kycProfileData: any = {
          userId: data.userId,
          userType: data.userType,
          documents,
          status: KYCStatus.PENDING,
          submittedAt: new Date()
        };

        const previousStatus = data.userType === UserType.MERCHANT
          ? (await MockKYCProfileModel.findOne({ userId: data.userId }))?.status as KYCStatus | undefined
          : undefined;
        
        const result = await MockKYCProfileModel.save(kycProfileData);

        await this.sendKycStatusEmail({
          userId: result.userId,
          userType: result.userType,
          previousStatus,
          newStatus: result.status as KYCStatus,
          reviewDate: result.submittedAt ?? new Date()
        });
        
        // Get document count safely
        let documentCount = 0;
        if ('documents' in data) {
          documentCount = (data as KYCSubmissionRequest).documents.length;
        } else if ('businessDocuments' in data) {
          documentCount = (data as BusinessKYCSubmissionRequest).businessDocuments?.length ?? 0;
        }
        
        logger.info('KYC submitted successfully', {
          userId: data.userId,
          userType: data.userType,
          documentCount
        });
        
        auditLogger('KYC_SUBMISSION', data.userId, {
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
      } catch (error) {
        logger.error('Error submitting KYC', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        return {
          success: false,
          error: 'Error submitting KYC'
        };
      }
    }
  }

  // Get KYC status for a user
  async getKYCStatus(userId: string, requesterId?: string): Promise<{
    success: boolean;
    data?: {
      userId: string;
      userType: any;
      status: any;
      documentCount: number;
      submittedAt: Date | undefined;
      completedAt: Date | undefined;
      riskLevel?: any;
    };
    error?: string;
  }> {
    try {
      const kycProfile: any = await MockKYCProfileModel.findOne({ userId });
      
      if (!kycProfile) {
        return {
          success: false,
          error: 'No KYC profile found for this user'
        };
      }
      
      return {
        success: true,
        data: {
          userId: kycProfile.userId,
          userType: kycProfile.userType,
          status: kycProfile.status,
          documentCount: kycProfile.documents?.length || 0,
          submittedAt: kycProfile.submittedAt,
          completedAt: kycProfile.completedAt,
          riskLevel: kycProfile.riskLevel
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error retrieving KYC status'
      };
    }
  }

  // Get full profile (for admin views; includes messages, businessInfo and businessSurvey from their collections)
  async getFullProfile(userId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const kycProfile: any = await MockKYCProfileModel.findOne({ userId });
      if (!kycProfile) {
        return { success: false, error: 'No KYC profile found for this user' };
      }
      const [businessInfoDoc, businessSurveyDoc, businessDocs, shareholderDocs] = await Promise.all([
        BusinessInfoModel.findOne({ userId }).lean(),
        BusinessSurveyModel.findOne({ userId }).lean(),
        (kycProfile as any).userType === UserType.MERCHANT
          ? BusinessDocumentModel.find({ userId }).lean()
          : Promise.resolve([]),
        (kycProfile as any).userType === UserType.MERCHANT
          ? ShareholderModel.find({ userId }).lean()
          : Promise.resolve([])
      ]);
      const businessInfo = businessInfoDoc
        ? (({ _id, userId: _u, createdAt, updatedAt, ...rest }) => rest)(businessInfoDoc as any)
        : (kycProfile as any).businessInfo;
      const businessSurvey = businessSurveyDoc
        ? (({ _id, userId: _u, createdAt, updatedAt, ...rest }) => rest)(businessSurveyDoc as any)
        : (kycProfile as any).businessSurvey;
      let documents = (kycProfile as any).documents ?? [];
      if ((kycProfile as any).userType === UserType.MERCHANT && Array.isArray(businessDocs) && businessDocs.length > 0) {
        documents = (businessDocs as any[]).map((d: any) => ({
          _id: d._id?.toString?.(),
          type: d.documentType,
          fileName: d.fileName,
          fileType: d.fileType,
          fileSize: d.fileSize,
          uploadDate: d.uploadedAt,
          status: d.status,
          rejectionReason: d.rejectionReason,
          fileUrl: d.fileUrl
        }));
      }
      let shareholders = (kycProfile as any).shareholders ?? [];
      if ((kycProfile as any).userType === UserType.MERCHANT && Array.isArray(shareholderDocs) && shareholderDocs.length > 0) {
        shareholders = (shareholderDocs as any[]).map((d: any) => docToShareholder(d));
      }
      return {
        success: true,
        data: { ...kycProfile, businessInfo, businessSurvey, documents, shareholders }
      };
    } catch (error) {
      return { success: false, error: 'Error retrieving profile' };
    }
  }

  // Get messages for a user (compliance thread between admin and merchant/individual)
  async getMessages(userId: string): Promise<{
    success: boolean;
    data?: Array<{ id: string; message: string; sentBy?: string; sentAt: Date; read: boolean }>;
    error?: string;
  }> {
    try {
      const kycProfile: any = await MockKYCProfileModel.findOne({ userId });
      if (!kycProfile) {
        return { success: false, error: 'No KYC profile found for this user' };
      }
      const messages = kycProfile.messages || [];
      return { success: true, data: messages };
    } catch (error) {
      return {
        success: false,
        error: 'Error retrieving messages'
      };
    }
  }

  // Get business information for a user (from business_infos collection)
  async getBusinessInfo(userId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const kycProfile: any = await MockKYCProfileModel.findOne({ userId });
      if (!kycProfile) {
        return { success: false, error: 'No KYC profile found for this user' };
      }
      if (kycProfile.userType !== UserType.MERCHANT) {
        return { success: false, error: 'User is not a business customer' };
      }
      let businessInfo = await BusinessInfoModel.findOne({ userId }).lean();
      if (!businessInfo && (kycProfile as any).businessInfo) {
        const legacy = (kycProfile as any).businessInfo;
        await BusinessInfoModel.findOneAndUpdate(
          { userId },
          { userId, ...legacy },
          { upsert: true, new: true }
        );
        businessInfo = await BusinessInfoModel.findOne({ userId }).lean();
      }
      if (!businessInfo) {
        return { success: false, error: 'No business information found for this user' };
      }
      const { _id, userId: _uid, createdAt, updatedAt, ...data } = businessInfo as any;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Error retrieving business information' };
    }
  }

  // Get business survey data for a user (from business_surveys collection)
  async getBusinessSurvey(userId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const kycProfile: any = await MockKYCProfileModel.findOne({ userId });
      if (!kycProfile) {
        return { success: false, error: 'No KYC profile found for this user' };
      }
      if (kycProfile.userType !== UserType.MERCHANT) {
        return { success: false, error: 'User is not a business customer' };
      }
      let businessSurvey = await BusinessSurveyModel.findOne({ userId }).lean();
      if (!businessSurvey && (kycProfile as any).businessSurvey) {
        const legacy = (kycProfile as any).businessSurvey;
        await BusinessSurveyModel.findOneAndUpdate(
          { userId },
          { userId, ...legacy },
          { upsert: true, new: true }
        );
        businessSurvey = await BusinessSurveyModel.findOne({ userId }).lean();
      }
      if (!businessSurvey) {
        return { success: false, error: 'No business survey found for this user' };
      }
      const { _id, userId: _uid, createdAt, updatedAt, ...data } = businessSurvey as any;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Error retrieving business survey data' };
    }
  }

  // Get shareholders (beneficial owners) for a user (from shareholders collection)
  async getShareholders(userId: string): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }> {
    try {
      const kycProfile: any = await MockKYCProfileModel.findOne({ userId });
      if (!kycProfile) {
        return { success: false, error: 'No KYC profile found for this user' };
      }
      if (kycProfile.userType !== UserType.MERCHANT) {
        return { success: false, error: 'User is not a business customer' };
      }
      const docs = await ShareholderModel.find({ userId }).lean();
      const data = (docs as any[]).map((d) => docToShareholder(d));
      if (data.length === 0 && Array.isArray(kycProfile.shareholders) && kycProfile.shareholders.length > 0) {
        return { success: true, data: kycProfile.shareholders };
      }
      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Error retrieving shareholders' };
    }
  }

  // Get business risk assessment for a user
  async getBusinessRiskAssessment(userId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const kycProfile: any = await MockKYCProfileModel.findOne({ userId });
      
      if (!kycProfile) {
        return {
          success: false,
          error: 'No KYC profile found for this user'
        };
      }
      
      if (kycProfile.userType !== UserType.MERCHANT) {
        return {
          success: false,
          error: 'User is not a business customer'
        };
      }
      
      return {
        success: true,
        data: kycProfile.riskAssessment
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error retrieving business risk assessment'
      };
    }
  }

  // Update personal information for individual user
  async updatePersonalInfo(userId: string, personalInfo: any): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      const kycProfile: any = await MockKYCProfileModel.findOne({ userId });
      
      if (!kycProfile) {
        return {
          success: false,
          error: 'No KYC profile found for this user'
        };
      }
      
      if (kycProfile.userType !== UserType.INDIVIDUAL) {
        return {
          success: false,
          error: 'User is not an individual customer'
        };
      }
      
      // Update the personal info
      const updatedProfile = await MockKYCProfileModel.findByIdAndUpdate(
        kycProfile._id,
        { personalInfo },
        { new: true }
      );
      
      if (!updatedProfile) {
        return {
          success: false,
          error: 'Failed to update personal information'
        };
      }
      
      return {
        success: true,
        message: 'Personal information updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error updating personal information'
      };
    }
  }

  // Update business information for a user (upsert in business_infos collection)
  async updateBusinessInfo(userId: string, businessInfo: any): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      const kycProfile: any = await MockKYCProfileModel.findOne({ userId });
      if (!kycProfile) {
        return { success: false, error: 'No KYC profile found for this user' };
      }
      if (kycProfile.userType !== UserType.MERCHANT) {
        return { success: false, error: 'User is not a business customer' };
      }
      await BusinessInfoModel.findOneAndUpdate(
        { userId },
        { userId, ...businessInfo },
        { upsert: true, new: true }
      );
      return { success: true, message: 'Business information updated successfully' };
    } catch (error) {
      return { success: false, error: 'Error updating business information' };
    }
  }

  // Update business survey data for a user (upsert in business_surveys collection)
  async updateBusinessSurvey(userId: string, businessSurvey: any): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      const kycProfile: any = await MockKYCProfileModel.findOne({ userId });
      if (!kycProfile) {
        return { success: false, error: 'No KYC profile found for this user' };
      }
      if (kycProfile.userType !== UserType.MERCHANT) {
        return { success: false, error: 'User is not a business customer' };
      }
      await BusinessSurveyModel.findOneAndUpdate(
        { userId },
        { userId, ...businessSurvey },
        { upsert: true, new: true }
      );
      return { success: true, message: 'Business survey updated successfully' };
    } catch (error) {
      return { success: false, error: 'Error updating business survey' };
    }
  }

  // Update shareholders (beneficial owners) for a user (replace in shareholders collection)
  async updateShareholders(userId: string, shareholders: any[]): Promise<{
    success: boolean;
    message?: string;
    data?: any[];
    error?: string;
  }> {
    try {
      if (!Array.isArray(shareholders)) {
        return { success: false, error: 'Shareholders must be an array' };
      }

      const kycProfile: any = await MockKYCProfileModel.findOne({ userId });
      if (!kycProfile) {
        return { success: false, error: 'No KYC profile found for this user' };
      }
      if (kycProfile.userType !== UserType.MERCHANT) {
        return { success: false, error: 'User is not a business customer' };
      }
      if (kycProfile.isBlocked === true) {
        return { success: false, error: 'Account is blocked; beneficial ownership cannot be updated' };
      }
      // Allowed at any KYC stage (e.g. approved/completed) so merchants can add or replace UBOs later.
      const shareholdersWithKyc: any[] = [];
      for (const shareholder of shareholders) {
        shareholdersWithKyc.push(await this.ensureShareholderKycLink(userId, shareholder));
      }

      await ShareholderModel.deleteMany({ userId });
      if (shareholders.length > 0) {
        await ShareholderModel.insertMany(shareholdersWithKyc.map((s) => shareholderToDoc(userId, s)));
      }
      return {
        success: true,
        message: 'Shareholders updated successfully',
        data: shareholdersWithKyc
      };
    } catch (error) {
      return { success: false, error: 'Error updating shareholders' };
    }
  }

  // Get enhanced due diligence data for high-risk businesses
  async getEnhancedDueDiligence(userId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const kycProfile: any = await MockKYCProfileModel.findOne({ userId });
      
      if (!kycProfile) {
        return {
          success: false,
          error: 'No KYC profile found for this user'
        };
      }
      
      if (kycProfile.userType !== UserType.MERCHANT) {
        return {
          success: false,
          error: 'User is not a business customer'
        };
      }
      
      const [businessInfoDoc, businessSurveyDoc, businessDocs, shareholderDocs] = await Promise.all([
        BusinessInfoModel.findOne({ userId }).lean(),
        BusinessSurveyModel.findOne({ userId }).lean(),
        BusinessDocumentModel.find({ userId }).lean(),
        ShareholderModel.find({ userId }).lean()
      ]);
      const businessInfo = businessInfoDoc
        ? (({ _id, userId: _u, createdAt, updatedAt, ...rest }) => rest)(businessInfoDoc as any)
        : undefined;
      const businessSurvey = businessSurveyDoc
        ? (({ _id, userId: _u, createdAt, updatedAt, ...rest }) => rest)(businessSurveyDoc as any)
        : undefined;
      const documents = (businessDocs as any[]).map((d: any) => ({
        _id: d._id?.toString?.(),
        type: d.documentType,
        fileName: d.fileName,
        fileType: d.fileType,
        fileSize: d.fileSize,
        uploadDate: d.uploadedAt,
        status: d.status,
        rejectionReason: d.rejectionReason,
        fileUrl: d.fileUrl
      }));
      const shareholders = (shareholderDocs as any[]).map((d: any) => docToShareholder(d));
      return {
        success: true,
        data: {
          businessInfo,
          businessSurvey,
          shareholders: shareholders.length > 0 ? shareholders : (kycProfile.shareholders ?? []),
          riskAssessment: kycProfile.riskAssessment,
          documents
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error retrieving enhanced due diligence data'
      };
    }
  }

  // Get corporate structure information for corporations and LLCs
  async getCorporateStructure(userId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const kycProfile: any = await MockKYCProfileModel.findOne({ userId });
      
      if (!kycProfile) {
        return {
          success: false,
          error: 'No KYC profile found for this user'
        };
      }
      
      if (kycProfile.userType !== UserType.MERCHANT) {
        return {
          success: false,
          error: 'User is not a business customer'
        };
      }
      
      const [businessInfoDoc, businessDocs, shareholderDocs] = await Promise.all([
        BusinessInfoModel.findOne({ userId }).lean(),
        BusinessDocumentModel.find({ userId }).lean(),
        ShareholderModel.find({ userId }).lean()
      ]);
      const businessInfo = businessInfoDoc
        ? (({ _id, userId: _u, createdAt, updatedAt, ...rest }) => rest)(businessInfoDoc as any)
        : undefined;
      const allDocs = (businessDocs as any[]).map((d: any) => ({
        _id: d._id?.toString?.(),
        type: d.documentType,
        fileName: d.fileName,
        fileUrl: d.fileUrl,
        status: d.status
      }));
      const corporateDocuments = allDocs.filter(
        (doc: any) =>
          doc.type === 'corporate_structure' ||
          doc.type === 'articles_of_incorporation' ||
          doc.type === BusinessDocumentType.ARTICLES_OF_ASSOCIATION ||
          doc.type === BusinessDocumentType.CERTIFICATE_OF_INCORPORATION
      );
      const shareholders = (shareholderDocs as any[]).map((d: any) => docToShareholder(d));
      return {
        success: true,
        data: {
          businessInfo,
          shareholders: shareholders.length > 0 ? shareholders : (kycProfile.shareholders ?? []),
          documents: corporateDocuments.length > 0 ? corporateDocuments : allDocs
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error retrieving corporate structure information'
      };
    }
  }

  // Get non-profit verification information
  async getNonProfitVerification(userId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const kycProfile: any = await MockKYCProfileModel.findOne({ userId });
      
      if (!kycProfile) {
        return {
          success: false,
          error: 'No KYC profile found for this user'
        };
      }
      
      if (kycProfile.userType !== UserType.MERCHANT) {
        return {
          success: false,
          error: 'User is not a business customer'
        };
      }
      
      const [businessInfoDoc, businessSurveyDoc, businessDocs] = await Promise.all([
        BusinessInfoModel.findOne({ userId }).lean(),
        BusinessSurveyModel.findOne({ userId }).lean(),
        BusinessDocumentModel.find({ userId }).lean()
      ]);
      const businessInfo = businessInfoDoc
        ? (({ _id, userId: _u, createdAt, updatedAt, ...rest }) => rest)(businessInfoDoc as any)
        : undefined;
      const businessSurvey = businessSurveyDoc
        ? (({ _id, userId: _u, createdAt, updatedAt, ...rest }) => rest)(businessSurveyDoc as any)
        : undefined;
      const documents = (businessDocs as any[]).map((d: any) => ({
        _id: d._id?.toString?.(),
        type: d.documentType,
        fileName: d.fileName,
        fileUrl: d.fileUrl,
        status: d.status
      })).filter(
        (doc: any) =>
          doc.type === BusinessDocumentType.CERTIFICATE_OF_INCORPORATION || doc.type === 'tax_certificate'
      );
      return {
        success: true,
        data: { businessInfo, businessSurvey, documents }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error retrieving non-profit verification information'
      };
    }
  }

  // Get government verification information
  async getGovernmentVerification(userId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const kycProfile: any = await MockKYCProfileModel.findOne({ userId });
      
      if (!kycProfile) {
        return {
          success: false,
          error: 'No KYC profile found for this user'
        };
      }
      
      if (kycProfile.userType !== UserType.MERCHANT) {
        return {
          success: false,
          error: 'User is not a business customer'
        };
      }
      
      const [businessInfoDoc, businessSurveyDoc, businessDocs] = await Promise.all([
        BusinessInfoModel.findOne({ userId }).lean(),
        BusinessSurveyModel.findOne({ userId }).lean(),
        BusinessDocumentModel.find({ userId }).lean()
      ]);
      const businessInfo = businessInfoDoc
        ? (({ _id, userId: _u, createdAt, updatedAt, ...rest }) => rest)(businessInfoDoc as any)
        : undefined;
      const businessSurvey = businessSurveyDoc
        ? (({ _id, userId: _u, createdAt, updatedAt, ...rest }) => rest)(businessSurveyDoc as any)
        : undefined;
      const documents = (businessDocs as any[])
        .map((d: any) => ({
          _id: d._id?.toString?.(),
          type: d.documentType,
          fileName: d.fileName,
          fileUrl: d.fileUrl,
          status: d.status
        }))
        .filter((doc: any) => doc.type === BusinessDocumentType.CERTIFICATE_OF_INCORPORATION);
      return {
        success: true,
        data: { businessInfo, businessSurvey, documents }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error retrieving government verification information'
      };
    }
  }

  // Create a minimal KYC profile for a user
  async createMinimalKYCProfile(userId: string, userType: UserType, createdBy?: string): Promise<{
    success: boolean;
    message?: string;
    data?: {
      userId: string;
      userType: UserType;
      status: any;
      createdAt: Date;
    };
    error?: string;
  }> {
    try {
      // Check if profile already exists
      const existingProfile: any = await MockKYCProfileModel.findOne({ userId });
      
      if (existingProfile) {
        return {
          success: false,
          error: 'KYC profile already exists for this user'
        };
      }
      
      // Create minimal profile
      const profileData: any = {
        userId,
        userType,
        documents: [],
        status: KYCStatus.PENDING,
        submittedAt: new Date()
      };
      
      const result = await MockKYCProfileModel.save(profileData);

      await this.sendKycStatusEmail({
        userId: result.userId,
        userType: result.userType,
        previousStatus: undefined,
        newStatus: result.status as KYCStatus,
        reviewDate: result.submittedAt ?? new Date()
      });
      
      return {
        success: true,
        message: 'Minimal KYC profile created successfully',
        data: {
          userId: result.userId,
          userType: result.userType,
          status: result.status,
          createdAt: result.submittedAt!
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error creating minimal KYC profile'
      };
    }
  }

  // Validate KYC submission
  async validateKYC(data: KYCSubmissionRequest, userId?: string) {
    try {
      const { error, value } = validateKYCSubmission(data);
      
      if (error) {
        return { error: { message: (error as any).details?.[0]?.message || 'Validation error' } };
      }
      
      return { 
        success: true,
        data: {
          ...value,
          validationDate: new Date()
        }
      };
    } catch (error) {
      return { error: { message: 'Error validating KYC submission' } };
    }
  }

  // Update workflow status
  async updateWorkflowStatus(kycId: string, workflowStatus: ComplianceWorkflowStatus, updatedBy?: string) {
    try {
      // Update the workflow status in the database
      const updatedProfile: any = await MockKYCProfileModel.findByIdAndUpdate(
        kycId,
        {
          workflowStatus,
          lastUpdatedBy: updatedBy,
          lastUpdated: new Date()
        },
        { new: true }
      );
      
      if (!updatedProfile) {
        return {
          success: false,
          error: 'KYC profile not found'
        };
      }

      logger.info('Workflow status updated', {
        kycId,
        workflowStatus,
        updatedBy
      });

      auditLogger('WORKFLOW_STATUS_UPDATE', updatedBy || 'system', {
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
    } catch (error) {
      logger.error('Error updating workflow status', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: 'Error updating workflow status'
      };
    }
  }

  // Get pending workflows
  async getPendingWorkflows() {
    try {
      // Query the database for pending workflows
      const pendingWorkflows: any = await MockKYCProfileModel.find({
        workflowStatus: {
          $in: [
            ComplianceWorkflowStatus.INITIAL_SCREENING,
            ComplianceWorkflowStatus.DOCUMENT_REVIEW,
            ComplianceWorkflowStatus.ENHANCED_DUE_DILIGENCE,
            ComplianceWorkflowStatus.RISK_ASSESSMENT
          ]
        }
      });

      logger.info('Retrieved pending workflows', {
        count: pendingWorkflows.length
      });

      return {
        success: true,
        data: pendingWorkflows.map((profile: any) => ({
          kycId: profile._id,
          userId: profile.userId,
          userType: profile.userType,
          workflowStatus: profile.workflowStatus,
          riskLevel: profile.riskLevel,
          submittedAt: profile.submittedAt
        }))
      };
    } catch (error) {
      logger.error('Error retrieving pending workflows', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: 'Error retrieving pending workflows'
      };
    }
  }

  // Get pending reviews
  async getPendingReviews() {
    try {
      // Query the database for profiles pending review
      const pendingReviews: any = await MockKYCProfileModel.find({
        status: KYCStatus.REVIEW
      });

      logger.info('Retrieved pending reviews', {
        count: pendingReviews.length
      });

      return {
        success: true,
        data: pendingReviews.map((profile: any) => ({
          kycId: profile._id,
          userId: profile.userId,
          userType: profile.userType,
          riskLevel: profile.riskLevel,
          submittedAt: profile.submittedAt,
          documents: profile.documents
        }))
      };
    } catch (error) {
      logger.error('Error retrieving pending reviews', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: 'Error retrieving pending reviews'
      };
    }
  }

  // Get high risk profiles (businessType from business_surveys collection)
  async getHighRiskProfiles() {
    try {
      const highRiskProfiles: any = await MockKYCProfileModel.find({
        riskLevel: { $in: [RiskLevel.HIGH, RiskLevel.VERY_HIGH] }
      });
      const userIds = highRiskProfiles.map((p: any) => p.userId).filter(Boolean);
      const surveys = await BusinessSurveyModel.find({ userId: { $in: userIds } }).lean();
      const businessTypeByUserId: Record<string, string> = {};
      for (const s of surveys as any[]) {
        if (s.userId) businessTypeByUserId[s.userId] = s.businessType;
      }

      logger.info('Retrieved high risk profiles', { count: highRiskProfiles.length });

      return {
        success: true,
        data: highRiskProfiles.map((profile: any) => ({
          kycId: profile._id,
          userId: profile.userId,
          userType: profile.userType,
          riskLevel: profile.riskLevel,
          businessType: businessTypeByUserId[profile.userId],
          submittedAt: profile.submittedAt,
          lastReviewDate: profile.lastReviewDate
        }))
      };
    } catch (error) {
      logger.error('Error retrieving high risk profiles', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: 'Error retrieving high risk profiles'
      };
    }
  }

  // Get risk summary report
  async getRiskSummaryReport() {
    try {
      // Query the database for all profiles to generate risk summary
      const allProfiles: any = await MockKYCProfileModel.find({});
      
      // Calculate risk distribution
      const riskDistribution: Record<string, number> = {};
      const userTypeDistribution: Record<string, number> = {};
      let highRiskProfiles = 0;
      
      allProfiles.forEach((profile: any) => {
        // Count risk levels
        const riskLevel = profile.riskLevel || RiskLevel.LOW;
        riskDistribution[riskLevel] = (riskDistribution[riskLevel] || 0) + 1;
        
        // Count user types
        userTypeDistribution[profile.userType] = (userTypeDistribution[profile.userType] || 0) + 1;
        
        // Count high-risk profiles
        if (profile.riskLevel === RiskLevel.HIGH || profile.riskLevel === RiskLevel.VERY_HIGH) {
          highRiskProfiles++;
        }
      });

      const report = {
        totalProfiles: allProfiles.length,
        riskDistribution,
        userTypeDistribution,
        highRiskProfiles
      };

      logger.info('Generated risk summary report', report);

      return {
        success: true,
        data: report
      };
    } catch (error) {
      logger.error('Error generating risk summary report', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: 'Error generating risk summary report'
      };
    }
  }

  // Get compliance metrics
  async getComplianceMetrics() {
    try {
      const allProfiles: any = await MockKYCProfileModel.find({});
      const statusDistribution: Record<string, number> = {};
      const userTypeDistribution: Record<string, number> = {};
      let totalDocuments = 0;
      let approvedDocuments = 0;

      for (const profile of allProfiles) {
        statusDistribution[profile.status] = (statusDistribution[profile.status] || 0) + 1;
        userTypeDistribution[profile.userType] = (userTypeDistribution[profile.userType] || 0) + 1;
        if (profile.userType === UserType.MERCHANT) {
          const businessDocs = await BusinessDocumentModel.find({ userId: profile.userId }).lean();
          totalDocuments += businessDocs.length;
          approvedDocuments += (businessDocs as any[]).filter((d: any) => d.status === KYCStatus.APPROVED).length;
        } else {
          const docs = profile.documents || [];
          totalDocuments += docs.length;
          approvedDocuments += docs.filter((doc: any) => doc.status === KYCStatus.APPROVED).length;
        }
      }
      
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

      logger.info('Generated compliance metrics', metrics);

      return {
        success: true,
        data: metrics
      };
    } catch (error) {
      logger.error('Error generating compliance metrics', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: 'Error generating compliance metrics'
      };
    }
  }

  // Get document status report (includes business docs from business_documents collection)
  async getDocumentStatusReport() {
    try {
      const allProfiles: any = await MockKYCProfileModel.find({});
      let totalDocuments = 0;
      const documentStatusDistribution: Record<string, number> = {};
      const documentTypeDistribution: Record<string, number> = {};

      for (const profile of allProfiles) {
        if (profile.userType === UserType.MERCHANT) {
          const businessDocs = await BusinessDocumentModel.find({ userId: profile.userId }).lean();
          for (const doc of businessDocs as any[]) {
            totalDocuments++;
            documentStatusDistribution[doc.status] = (documentStatusDistribution[doc.status] || 0) + 1;
            documentTypeDistribution[doc.documentType] = (documentTypeDistribution[doc.documentType] || 0) + 1;
          }
        } else {
          for (const doc of profile.documents || []) {
            totalDocuments++;
            documentStatusDistribution[doc.status] = (documentStatusDistribution[doc.status] || 0) + 1;
            documentTypeDistribution[doc.type] = (documentTypeDistribution[doc.type] || 0) + 1;
          }
        }
      }

      const report = {
        totalDocuments,
        documentStatusDistribution,
        documentTypeDistribution
      };

      logger.info('Generated document status report', report);

      return {
        success: true,
        data: report
      };
    } catch (error) {
      logger.error('Error generating document status report', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: 'Error generating document status report'
      };
    }
  }

  // Get all registered users (new admin function)
  async getAllUsers() {
    try {
      // Query the database for all profiles
      const allProfiles: any = await MockKYCProfileModel.find({});
      
      const users = allProfiles.map((profile: any) => ({
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

      logger.info('Retrieved all users', { count: users.length });

      return {
        success: true,
        data: users
      };
    } catch (error) {
      logger.error('Error retrieving all users', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: 'Error retrieving all users'
      };
    }
  }

  // Get all compliance documents (business docs from business_documents collection)
  async getAllComplianceDocuments() {
    try {
      const allProfiles: any = await MockKYCProfileModel.find({});
      const allDocuments: any[] = [];

      for (const profile of allProfiles) {
        if (profile.userType === UserType.MERCHANT) {
          const businessDocs = await BusinessDocumentModel.find({ userId: profile.userId }).lean();
          for (const doc of businessDocs as any[]) {
            allDocuments.push({
              documentId: doc._id?.toString?.(),
              userId: profile.userId,
              userType: profile.userType,
              type: doc.documentType,
              displayName: doc.displayName,
              fileName: doc.fileName,
              fileType: doc.fileType,
              fileSize: doc.fileSize,
              fileUrl: doc.fileUrl,
              uploadDate: doc.uploadedAt,
              status: doc.status,
              rejectionReason: doc.rejectionReason
            });
          }
        } else {
          for (const doc of profile.documents || []) {
            allDocuments.push({
              documentId: doc._id?.toString?.() ?? doc._id,
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
          }
        }
      }

      logger.info('Retrieved all compliance documents', { count: allDocuments.length });
      return { success: true, data: allDocuments };
    } catch (error) {
      logger.error('Error retrieving all compliance documents', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return { success: false, error: 'Error retrieving all compliance documents' };
    }
  }

  // Approve/Disapprove with note (new admin function)
  async approveDisapproveUser(userId: string, status: 'approved' | 'rejected', note?: string, updatedBy?: string) {
    try {
      // Find the user's KYC profile
      const userProfile: any = await MockKYCProfileModel.findOne({ userId });
      
      if (!userProfile) {
        return {
          success: false,
          error: 'User profile not found'
        };
      }

      const previousStatus = userProfile.status as KYCStatus;

      // Update the profile status
      const updatedProfile = await MockKYCProfileModel.findByIdAndUpdate(
        userProfile._id,
        {
          status: status === 'approved' ? KYCStatus.APPROVED : KYCStatus.REJECTED,
          reviewedBy: updatedBy,
          reviewDate: new Date(),
          ...(status === 'approved' && { completedAt: new Date() }),
          ...(status === 'rejected' && { rejectionReason: note }),
          approvalNotes: note
        },
        { new: true }
      );
      
      if (!updatedProfile) {
        return {
          success: false,
          error: 'Failed to update user profile'
        };
      }

      await this.sendKycStatusEmail({
        userId: updatedProfile.userId,
        userType: updatedProfile.userType,
        previousStatus,
        newStatus: updatedProfile.status as KYCStatus,
        reviewDate: updatedProfile.reviewDate ?? new Date(),
        reviewReason: updatedProfile.rejectionReason ?? note ?? ''
      });

      // Log the action
      logger.info('User profile reviewed', {
        userId,
        status,
        reviewedBy: updatedBy,
        note
      });

      auditLogger('USER_PROFILE_REVIEW', updatedBy || 'system', {
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
    } catch (error) {
      logger.error('Error reviewing user profile', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: 'Error reviewing user profile'
      };
    }
  }

  // Send message to user (new admin function)
  async sendMessageToUser(userId: string, message: string, sentBy?: string) {
    try {
      // Find the user's KYC profile
      const userProfile: any = await MockKYCProfileModel.findOne({ userId });
      
      if (!userProfile) {
        return {
          success: false,
          error: 'User profile not found'
        };
      }

      // In a real implementation, this would send an actual message to the user
      // For now, we'll just log it and store it in the profile
      const userMessage = {
        id: randomUUID(),
        message,
        sentBy,
        sentAt: new Date(),
        read: false
      };

      // Update the profile with the new message
      const updatedProfile = await MockKYCProfileModel.findByIdAndUpdate(
        userProfile._id,
        {
          $push: {
            messages: userMessage
          }
        },
        { new: true }
      );
      
      if (!updatedProfile) {
        return {
          success: false,
          error: 'Failed to send message to user'
        };
      }

      // Log the action
      logger.info('Message sent to user', {
        userId,
        sentBy,
        message: message.substring(0, 50) + (message.length > 50 ? '...' : '')
      });

      auditLogger('MESSAGE_SENT_TO_USER', sentBy || 'system', {
        userId,
        message: message.substring(0, 50) + (message.length > 50 ? '...' : '')
      });

      return {
        success: true,
        message: 'Message sent to user successfully',
        data: userMessage
      };
    } catch (error) {
      logger.error('Error sending message to user', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: 'Error sending message to user'
      };
    }
  }

  // Block user (new admin function)
  async blockUser(userId: string, reason?: string, blockedBy?: string) {
    try {
      // Find the user's KYC profile
      const userProfile: any = await MockKYCProfileModel.findOne({ userId });
      
      if (!userProfile) {
        return {
          success: false,
          error: 'User profile not found'
        };
      }

      // Update the profile to mark user as blocked
      const updatedProfile = await MockKYCProfileModel.findByIdAndUpdate(
        userProfile._id,
        {
          isBlocked: true,
          blockedReason: reason,
          blockedBy,
          blockedAt: new Date()
        },
        { new: true }
      );
      
      if (!updatedProfile) {
        return {
          success: false,
          error: 'Failed to block user'
        };
      }

      // Log the action
      logger.info('User blocked', {
        userId,
        blockedBy,
        reason
      });

      auditLogger('USER_BLOCKED', blockedBy || 'system', {
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
    } catch (error) {
      logger.error('Error blocking user', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: 'Error blocking user'
      };
    }
  }

  // Unblock user (new admin function)
  async unblockUser(userId: string, unblockedBy?: string) {
    try {
      // Find the user's KYC profile
      const userProfile: any = await MockKYCProfileModel.findOne({ userId });
      
      if (!userProfile) {
        return {
          success: false,
          error: 'User profile not found'
        };
      }

      // Update the profile to mark user as unblocked
      const updatedProfile = await MockKYCProfileModel.findByIdAndUpdate(
        userProfile._id,
        {
          isBlocked: false,
          blockedReason: undefined,
          unblockedBy,
          unblockedAt: new Date()
        },
        { new: true }
      );
      
      if (!updatedProfile) {
        return {
          success: false,
          error: 'Failed to unblock user'
        };
      }

      // Log the action
      logger.info('User unblocked', {
        userId,
        unblockedBy
      });

      auditLogger('USER_UNBLOCKED', unblockedBy || 'system', {
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
    } catch (error) {
      logger.error('Error unblocking user', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: 'Error unblocking user'
      };
    }
  }

  // Verify Certificate of Incorporation with CAC (new admin function)
  async verifyCertificateWithCAC(userId: string, registrationNumber: string, companyName: string, verifiedBy?: string): Promise<{
    success: boolean;
    message?: string;
    data?: {
      verificationResult: CACVerificationResult;
      userId: string;
      verifiedBy?: string;
      verifiedAt: Date;
    };
    error?: string;
  }> {
    try {
      // Find the user's KYC profile
      const userProfile: any = await MockKYCProfileModel.findOne({ userId });
      
      if (!userProfile) {
        return {
          success: false,
          error: 'User profile not found'
        };
      }

      if (userProfile.userType !== UserType.MERCHANT) {
        return {
          success: false,
          error: 'User is not a business customer'
        };
      }

      const businessDocuments = await BusinessDocumentModel.find({ userId }).lean();
      const certificateDocument = (businessDocuments as any[]).find(
        (doc: any) =>
          doc.documentType === BusinessDocumentType.CERTIFICATE_OF_INCORPORATION ||
          doc.documentType === 'business_registration'
      );

      if (certificateDocument && certificateDocument.status !== KYCStatus.ADMIN_APPROVED) {
        return {
          success: false,
          error: `Certificate document must be approved by admin before Prembly verification. Current status: ${certificateDocument.status}. Please approve the document first.`
        };
      }

      if (!certificateDocument && businessDocuments.length > 0) {
        const hasAdminApproved = (businessDocuments as any[]).some(
          (doc: any) => doc.status === KYCStatus.ADMIN_APPROVED
        );
        if (!hasAdminApproved) {
          return {
            success: false,
            error: 'At least one business document must be approved by admin before Prembly verification. Please approve the documents first.'
          };
        }
      }

      // Perform CAC verification
      const verificationResult = await cacService.verifyCertificateOfIncorporation(
        registrationNumber,
        companyName
      );

      // Log the verification attempt
      logger.info('CAC Certificate verification attempted', {
        userId,
        registrationNumber,
        companyName,
        verifiedBy,
        success: verificationResult.success,
        valid: verificationResult.valid
      });

      auditLogger('CAC_CERTIFICATE_VERIFICATION', verifiedBy || 'system', {
        userId,
        registrationNumber,
        companyName,
        success: verificationResult.success,
        valid: verificationResult.valid
      });

      return {
        success: true,
        message: 'Certificate verification completed',
        data: {
          verificationResult,
          userId,
          verifiedBy,
          verifiedAt: new Date()
        }
      };
    } catch (error) {
      logger.error('Error verifying Certificate with CAC', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        registrationNumber,
        companyName
      });
      
      return {
        success: false,
        error: 'Error verifying Certificate with CAC'
      };
    }
  }

  // Review KYC submission
  async reviewKYC(kycId: string, status: KYCStatus, rejectionReason?: string, reviewedBy?: string): Promise<{
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
  }> {
    try {
      // Load previous status so we only send on actual transitions.
      const existingProfile: any = await MockKYCProfileModel.findById(kycId);
      const previousStatus = existingProfile?.status as KYCStatus | undefined;

      const updatedProfile = await MockKYCProfileModel.findByIdAndUpdate(
        kycId,
        {
          status,
          reviewedBy,
          reviewDate: new Date(),
          ...(status === KYCStatus.COMPLETED && { completedAt: new Date() }),
          ...(rejectionReason && { rejectionReason })
        },
        { new: true }
      );
      
      if (!updatedProfile) {
        return {
          success: false,
          error: 'KYC profile not found'
        };
      }

      await this.sendKycStatusEmail({
        userId: updatedProfile.userId,
        userType: updatedProfile.userType,
        previousStatus,
        newStatus: updatedProfile.status as KYCStatus,
        reviewDate: updatedProfile.reviewDate ?? new Date(),
        reviewReason: updatedProfile.rejectionReason ?? rejectionReason
      });
      
      auditLogger('KYC_REVIEW', reviewedBy || 'anonymous', {
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
    } catch (error) {
      return {
        success: false,
        error: 'Error reviewing KYC submission'
      };
    }
  }

  // Update KYC document status
  async updateKYCDocumentStatus(
    documentId: string, 
    status: KYCStatus, 
    rejectionReason?: string,
    updatedBy?: string,
    notes?: string
  ): Promise<{
    success: boolean;
    message?: string;
    data?: {
      documentId: string;
      status: KYCStatus;
      rejectionReason: string | undefined;
      updatedBy?: string;
      notes?: string;
    };
    error?: string;
  }> {
    try {
      const updateData: any = {
        status,
        ...(rejectionReason !== undefined && { rejectionReason }),
      };
      let updatedDocument: any = await BusinessDocumentModel.findByIdAndUpdate(
        documentId,
        updateData,
        { new: true }
      ).lean();
      if (updatedDocument) {
        auditLogger('DOCUMENT_STATUS_UPDATE', updatedBy || 'system', {
          documentId,
          newStatus: status,
          rejectionReason,
          notes
        });
        return {
          success: true,
          message: 'Document status updated successfully',
          data: {
            documentId: updatedDocument._id?.toString?.(),
            status: updatedDocument.status,
            rejectionReason: updatedDocument.rejectionReason,
            ...(updatedBy && { updatedBy }),
            ...(notes && { notes })
          }
        };
      }
      const document = await MockKYCDocumentModel.findById(documentId);
      if (!document) {
        return { success: false, error: 'Document not found' };
      }
      const updateDataLegacy: any = {
        status,
        ...(rejectionReason && { rejectionReason }),
        ...(updatedBy && { updatedBy }),
        ...(notes && { notes })
      };
      updatedDocument = await MockKYCDocumentModel.findByIdAndUpdate(
        documentId,
        updateDataLegacy,
        { new: true }
      );
      if (!updatedDocument) {
        return { success: false, error: 'Failed to update document status' };
      }
      auditLogger('DOCUMENT_STATUS_UPDATE', updatedBy || 'system', {
        documentId,
        newStatus: status,
        rejectionReason,
        notes
      });
      return {
        success: true,
        message: 'Document status updated successfully',
        data: {
          documentId: updatedDocument._id,
          status: updatedDocument.status,
          rejectionReason: updatedDocument.rejectionReason,
          ...(updatedBy && { updatedBy }),
          ...(notes && { notes })
        }
      };
    } catch (error) {
      logger.error('Error updating KYC document status', {
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: 'Error updating document status'
      };
    }
  }

  // Get KYC document by ID (business docs from business_documents collection first)
  async getKYCDocument(documentId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const businessDoc = await BusinessDocumentModel.findById(documentId).lean();
      if (businessDoc) {
        const d = businessDoc as any;
        return {
          success: true,
          data: {
            _id: d._id?.toString?.(),
            type: d.documentType,
            fileName: d.fileName,
            fileType: d.fileType,
            fileSize: d.fileSize,
            uploadDate: d.uploadedAt,
            status: d.status,
            rejectionReason: d.rejectionReason,
            fileUrl: d.fileUrl,
            displayName: d.displayName,
            userId: d.userId
          }
        };
      }
      const document = await MockKYCDocumentModel.findById(documentId);
      if (!document) {
        return { success: false, error: 'Document not found' };
      }
      return { success: true, data: document };
    } catch (error) {
      logger.error('Error retrieving KYC document', {
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: 'Error retrieving document'
      };
    }
  }

  // Get all KYC documents for a user (business docs from business_documents collection)
  async getAllKYCDocuments(userId: string): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }> {
    try {
      const profile: any = await MockKYCProfileModel.findOne({ userId });
      if (!profile) {
        return { success: false, error: 'No KYC profile found for this user' };
      }
      if (profile.userType === UserType.MERCHANT) {
        const docs = await BusinessDocumentModel.find({ userId }).lean();
        const data = docs.map((d: any) => ({
          _id: d._id?.toString?.(),
          type: d.documentType,
          fileName: d.fileName,
          fileType: d.fileType,
          fileSize: d.fileSize,
          uploadDate: d.uploadedAt,
          status: d.status,
          rejectionReason: d.rejectionReason,
          fileUrl: d.fileUrl,
          displayName: d.displayName
        }));
        return { success: true, data };
      }
      return { success: true, data: profile.documents ?? [] };
    } catch (error) {
      logger.error('Error retrieving KYC documents', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return { success: false, error: 'Error retrieving documents' };
    }
  }

  // Search KYC profiles
  async searchKYCProfiles(filters: any): Promise<{
    success: boolean;
    data?: (KYCProfile & { _id: string })[];
    error?: string;
  }> {
    try {
      const query: any = {};
      
      if (filters.userId) query.userId = filters.userId;
      if (filters.userType) query.userType = filters.userType;
      if (filters.status) query.status = filters.status;
      if (filters.riskLevel) query.riskLevel = filters.riskLevel;
      
      if (filters.startDate || filters.endDate) {
        query.submittedAt = {};
        if (filters.startDate) query.submittedAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.submittedAt.$lte = new Date(filters.endDate);
      }

      const profiles = await MockKYCProfileModel.find(query);

      return {
        success: true,
        data: profiles
      };
    } catch (error) {
      logger.error('Error searching KYC profiles', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: 'Error searching KYC profiles'
      };
    }
  }
}

// Export both the class and a singleton instance
export const kycService = new KYCService();