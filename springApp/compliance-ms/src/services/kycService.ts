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
import { MockKYCProfileModel, MockKYCDocumentModel } from '../utils/mockDb';
import { 
  validateKYCSubmission, 
  validateIndividualKYCSubmission,
  validateBusinessKYCSubmission
} from '../utils/validation';
import { cacService, CACVerificationResult } from './cacService';
import { premblyService, PremblyIndividualKYCRequest, PremblyBusinessKYCRequest } from './premblyService';

// Service class for KYC operations
export class KYCService {
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
    };
    error?: any;
  }> {
    try {
      const { error } = validateBusinessKYCSubmission(data);
      
      if (error) {
        return {
          success: false,
          error: error.message || (error as any).details?.[0]?.message || 'Validation error'
        };
      }

      // Calculate risk level based on business factors
      const riskLevel = this.calculateBusinessRiskLevel(data);
      
      // Try Prembly Business KYC verification if configured
      let premblyVerificationId: string | undefined;
      let premblyStatus: KYCStatus | undefined;
      
      if (premblyService.isConfigured() && data.businessInfo) {
        try {
          // Extract document information for Prembly
          const document = data.businessDocuments?.[0]; // Use first document
          
          const premblyRequest: PremblyBusinessKYCRequest = {
            companyName: data.businessInfo.companyName,
            registrationNumber: data.businessInfo.companyRegId || '',
            country: data.businessInfo.countryOfIncorporation,
            documentImage: document?.fileUrl || document?.fileData
          };

          const premblyResponse = await premblyService.verifyBusinessKYC(premblyRequest);
          
          if (premblyResponse.status && premblyResponse.data) {
            premblyVerificationId = premblyResponse.data.verificationId;
            premblyStatus = premblyResponse.data.status === 'verified' 
              ? KYCStatus.APPROVED 
              : premblyResponse.data.status === 'failed' 
                ? KYCStatus.REJECTED 
                : KYCStatus.PENDING;
            
            logger.info('Prembly business KYC verification completed', {
              verificationId: premblyVerificationId,
              status: premblyStatus
            });
          }
        } catch (error: any) {
          logger.warn('Prembly business KYC verification failed, continuing with manual review', {
            error: error.message
          });
        }
      }
      
      const kycProfileData: any = {
        userId: data.userId,
        userType: data.userType,
        documents: data.businessDocuments.map(doc => ({
          type: doc.type as unknown as DocumentType,
          fileName: doc.fileName,
          fileType: doc.fileType,
          fileSize: doc.fileSize,
          uploadDate: new Date(),
          status: KYCStatus.PENDING
        })),
        status: premblyStatus || KYCStatus.PENDING,
        submittedAt: new Date(),
        businessInfo: data.businessInfo,
        businessSurvey: data.businessSurvey,
        // Changed from beneficialOwners to shareholders
        shareholders: data.shareholders,
        riskAssessment: data.riskAssessment,
        riskLevel,
        workflowStatus: ComplianceWorkflowStatus.INITIAL_SCREENING,
        premblyVerificationId // Store Prembly verification ID for reference
      };
      
      const result = await MockKYCProfileModel.save(kycProfileData);
      
      logger.info('Business KYC submitted successfully', {
        userId: data.userId,
        industry: data.businessInfo?.industry,
        riskLevel,
        documentCount: data.businessDocuments?.length,
        // Changed from beneficialOwnerCount to shareholderCount
        shareholderCount: data.shareholders?.length
      });
      
      auditLogger('BUSINESS_KYC_SUBMISSION', data.userId, {
        industry: data.businessInfo?.industry,
        riskLevel,
        documentCount: data.businessDocuments?.length,
        // Changed from beneficialOwnerCount to shareholderCount
        shareholderCount: data.shareholders?.length,
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
          shareholderCount: data.shareholders?.length
        }
      };
    } catch (error) {
      logger.error('Error submitting business KYC', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: 'Error submitting business KYC'
      };
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
          documents = (data as BusinessKYCSubmissionRequest).businessDocuments.map((doc: any) => ({
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
        
        const result = await MockKYCProfileModel.save(kycProfileData);
        
        // Get document count safely
        let documentCount = 0;
        if ('documents' in data) {
          documentCount = (data as KYCSubmissionRequest).documents.length;
        } else if ('businessDocuments' in data) {
          documentCount = (data as BusinessKYCSubmissionRequest).businessDocuments.length;
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

  // Get business information for a user
  async getBusinessInfo(userId: string): Promise<{
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
        data: kycProfile.businessInfo
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error retrieving business information'
      };
    }
  }

  // Get business survey data for a user
  async getBusinessSurvey(userId: string): Promise<{
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
        data: kycProfile.businessSurvey
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error retrieving business survey data'
      };
    }
  }

  // Get shareholders (beneficial owners) for a user
  async getShareholders(userId: string): Promise<{
    success: boolean;
    data?: any[];
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
        data: kycProfile.shareholders || []
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error retrieving shareholders'
      };
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

  // Update business information for a user
  async updateBusinessInfo(userId: string, businessInfo: any): Promise<{
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
      
      if (kycProfile.userType !== UserType.MERCHANT) {
        return {
          success: false,
          error: 'User is not a business customer'
        };
      }
      
      // Update the business info
      const updatedProfile = await MockKYCProfileModel.findByIdAndUpdate(
        kycProfile._id,
        { businessInfo },
        { new: true }
      );
      
      if (!updatedProfile) {
        return {
          success: false,
          error: 'Failed to update business information'
        };
      }
      
      return {
        success: true,
        message: 'Business information updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error updating business information'
      };
    }
  }

  // Update business survey data for a user
  async updateBusinessSurvey(userId: string, businessSurvey: any): Promise<{
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
      
      if (kycProfile.userType !== UserType.MERCHANT) {
        return {
          success: false,
          error: 'User is not a business customer'
        };
      }
      
      // Update the business survey
      const updatedProfile = await MockKYCProfileModel.findByIdAndUpdate(
        kycProfile._id,
        { businessSurvey },
        { new: true }
      );
      
      if (!updatedProfile) {
        return {
          success: false,
          error: 'Failed to update business survey'
        };
      }
      
      return {
        success: true,
        message: 'Business survey updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error updating business survey'
      };
    }
  }

  // Update shareholders (beneficial owners) for a user
  async updateShareholders(userId: string, shareholders: any[]): Promise<{
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
      
      if (kycProfile.userType !== UserType.MERCHANT) {
        return {
          success: false,
          error: 'User is not a business customer'
        };
      }
      
      // Update the shareholders
      const updatedProfile = await MockKYCProfileModel.findByIdAndUpdate(
        kycProfile._id,
        { shareholders },
        { new: true }
      );
      
      if (!updatedProfile) {
        return {
          success: false,
          error: 'Failed to update shareholders'
        };
      }
      
      return {
        success: true,
        message: 'Shareholders updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error updating shareholders'
      };
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
      
      // For enhanced due diligence, we might return additional information
      // This is a simplified implementation
      return {
        success: true,
        data: {
          businessInfo: kycProfile.businessInfo,
          businessSurvey: kycProfile.businessSurvey,
          shareholders: kycProfile.shareholders,
          riskAssessment: kycProfile.riskAssessment,
          documents: kycProfile.documents
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
      
      // Return corporate structure information
      return {
        success: true,
        data: {
          businessInfo: kycProfile.businessInfo,
          shareholders: kycProfile.shareholders,
          documents: kycProfile.documents.filter((doc: any) => 
            doc.type === 'corporate_structure' || doc.type === 'articles_of_incorporation'
          )
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
      
      // Return non-profit verification information
      return {
        success: true,
        data: {
          businessInfo: kycProfile.businessInfo,
          businessSurvey: kycProfile.businessSurvey,
          documents: kycProfile.documents.filter((doc: any) => 
            doc.type === 'business_registration' || doc.type === 'tax_certificate'
          )
        }
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
      
      // Return government verification information
      return {
        success: true,
        data: {
          businessInfo: kycProfile.businessInfo,
          businessSurvey: kycProfile.businessSurvey,
          documents: kycProfile.documents.filter((doc: any) => 
            doc.type === 'business_registration'
          )
        }
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

  // Get high risk profiles
  async getHighRiskProfiles() {
    try {
      // Query the database for high-risk profiles
      const highRiskProfiles: any = await MockKYCProfileModel.find({
        riskLevel: {
          $in: [RiskLevel.HIGH, RiskLevel.VERY_HIGH]
        }
      });

      logger.info('Retrieved high risk profiles', {
        count: highRiskProfiles.length
      });

      return {
        success: true,
        data: highRiskProfiles.map((profile: any) => ({
          kycId: profile._id,
          userId: profile.userId,
          userType: profile.userType,
          riskLevel: profile.riskLevel,
          businessType: profile.businessInfo?.businessType,
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
      // Query the database for all profiles and documents
      const allProfiles: any = await MockKYCProfileModel.find({});
      
      // Calculate metrics
      const statusDistribution: Record<string, number> = {};
      const userTypeDistribution: Record<string, number> = {};
      let totalDocuments = 0;
      let approvedDocuments = 0;
      
      allProfiles.forEach((profile: any) => {
        // Count statuses
        statusDistribution[profile.status] = (statusDistribution[profile.status] || 0) + 1;
        
        // Count user types
        userTypeDistribution[profile.userType] = (userTypeDistribution[profile.userType] || 0) + 1;
        
        // Count documents
        totalDocuments += profile.documents.length;
        approvedDocuments += profile.documents.filter((doc: any) => doc.status === KYCStatus.APPROVED).length;
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

  // Get document status report
  async getDocumentStatusReport() {
    try {
      // Query the database for all profiles to analyze documents
      const allProfiles: any = await MockKYCProfileModel.find({});
      
      // Calculate document metrics
      let totalDocuments = 0;
      const documentStatusDistribution: Record<string, number> = {};
      const documentTypeDistribution: Record<string, number> = {};
      
      allProfiles.forEach((profile: any) => {
        profile.documents.forEach((doc: any) => {
          totalDocuments++;
          
          // Count document statuses
          documentStatusDistribution[doc.status] = (documentStatusDistribution[doc.status] || 0) + 1;
          
          // Count document types
          documentTypeDistribution[doc.type] = (documentTypeDistribution[doc.type] || 0) + 1;
        });
      });

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

  // Get all compliance documents (new admin function)
  async getAllComplianceDocuments() {
    try {
      // Query the database for all profiles to get all documents
      const allProfiles: any = await MockKYCProfileModel.find({});
      
      const allDocuments: any[] = [];
      
      allProfiles.forEach((profile: any) => {
        profile.documents.forEach((doc: any) => {
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

      logger.info('Retrieved all compliance documents', { count: allDocuments.length });

      return {
        success: true,
        data: allDocuments
      };
    } catch (error) {
      logger.error('Error retrieving all compliance documents', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: 'Error retrieving all compliance documents'
      };
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
  async updateKYCDocumentStatus(documentId: string, status: KYCStatus, rejectionReason?: string): Promise<{
    success: boolean;
    message?: string;
    data?: {
      documentId: string;
      status: KYCStatus;
      rejectionReason: string | undefined;
    };
    error?: string;
  }> {
    try {
      // Find the document by ID
      const document = await MockKYCDocumentModel.findById(documentId);
      
      if (!document) {
        return {
          success: false,
          error: 'Document not found'
        };
      }
      
      // Update the document status
      const updatedDocument = await MockKYCDocumentModel.findByIdAndUpdate(
        documentId,
        {
          status,
          ...(rejectionReason && { rejectionReason })
        },
        { new: true }
      );
      
      if (!updatedDocument) {
        return {
          success: false,
          error: 'Failed to update document status'
        };
      }
      
      auditLogger('DOCUMENT_STATUS_UPDATE', 'system', {
        documentId,
        newStatus: status,
        rejectionReason
      });
      
      return {
        success: true,
        message: 'Document status updated successfully',
        data: {
          documentId: updatedDocument._id,
          status: updatedDocument.status,
          rejectionReason: updatedDocument.rejectionReason
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

  // Get KYC document by ID
  async getKYCDocument(documentId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const document = await MockKYCDocumentModel.findById(documentId);
      
      if (!document) {
        return {
          success: false,
          error: 'Document not found'
        };
      }
      
      return {
        success: true,
        data: document
      };
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

  // Get all KYC documents for a user
  async getAllKYCDocuments(userId: string): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }> {
    try {
      // Find the KYC profile for the user
      const profile: any = await MockKYCProfileModel.findOne({ userId });
      
      if (!profile) {
        return {
          success: false,
          error: 'No KYC profile found for this user'
        };
      }
      
      return {
        success: true,
        data: profile.documents
      };
    } catch (error) {
      logger.error('Error retrieving KYC documents', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: 'Error retrieving documents'
      };
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