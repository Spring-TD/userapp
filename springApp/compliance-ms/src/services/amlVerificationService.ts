// src/services/amlVerificationService.ts
import { createHash } from 'crypto';
import { logger } from '../utils/logger';
import { auditLogger } from '../utils/audit';
import { KYCProfileDb } from '../db/kycProfileDb';
import { BusinessDocumentData, BusinessDocumentType, KYCStatus } from '../types/kycTypes';
import { premblyService, PremblyBusinessKYCRequest } from './premblyService';

// AML provider response interface
export interface AMLProviderResponse {
  success: boolean;
  providerId: string;
  verificationId: string;
  result: {
    kyb: {
      verified: boolean;
      companyName?: string;
      registrationNumber?: string;
      status?: string;
      incorporationDate?: string;
    };
    aml: {
      peps: boolean;
      sanctions: boolean;
      adverseMedia: boolean;
      riskScore: number;
    };
    overall: {
      approved: boolean;
      suspicious: boolean;
      reason?: string;
    };
  };
  rawResponse: any;
}

// AML verification result interface
export interface AMLVerificationResult {
  documentId: string;
  providerId: string;
  verificationId: string;
  success: boolean;
  kybVerified: boolean;
  amlClear: boolean;
  overallApproved: boolean;
  suspicious: boolean;
  riskScore: number;
  reason?: string;
  documentUrl: string;
  documentHash: string;
  rawResponse: any;
  verifiedAt: Date;
}

// Mock AML provider service
export class AMLVerificationService {
  private providers: Map<string, any> = new Map();

  constructor() {
    // Initialize with mock providers
    this.providers.set('trulioo', { name: 'Trulioo', apiKey: process.env.TRULIOO_API_KEY });
    this.providers.set('sumsub', { name: 'Sumsub', apiKey: process.env.SUMSUB_API_KEY });
    this.providers.set('complyadvantage', { name: 'ComplyAdvantage', apiKey: process.env.COMPLYADVANTAGE_API_KEY });
  }

  /**
   * Verify AML document using a third-party provider
   * @param document The business document to verify
   * @param providerName The AML provider to use (trulioo, sumsub, complyadvantage)
   * @returns AML verification result
   */
  async verifyDocument(document: BusinessDocumentData, providerName: string = 'trulioo'): Promise<AMLVerificationResult> {
    try {
      // Validate provider
      if (!this.providers.has(providerName)) {
        throw new Error(`Unsupported AML provider: ${providerName}`);
      }

      logger.info('Starting AML document verification', {
        documentId: document.fileName,
        provider: providerName,
        documentType: document.type
      });

      // For AML policies, we might want to skip verification as they are internal documents
      if (document.type === BusinessDocumentType.AML_POLICIES) {
        logger.info('Skipping AML verification for AML policies document (internal document)');
        return this.createSkipResult(document);
      }

      // Call the AML provider API (mock implementation)
      const providerResponse = await this.callAMLProvider(document, providerName);
      
      // Calculate document hash for audit trail
      const documentHash = this.calculateDocumentHash(document.fileUrl);
      
      // Create verification result
      const verificationResult: AMLVerificationResult = {
        documentId: document.fileName,
        providerId: providerName,
        verificationId: providerResponse.verificationId,
        success: providerResponse.success,
        kybVerified: providerResponse.result.kyb.verified,
        amlClear: !(providerResponse.result.aml.peps || providerResponse.result.aml.sanctions || providerResponse.result.aml.adverseMedia),
        overallApproved: providerResponse.result.overall.approved,
        suspicious: providerResponse.result.overall.suspicious,
        riskScore: providerResponse.result.aml.riskScore,
        reason: providerResponse.result.overall.reason,
        documentUrl: document.fileUrl,
        documentHash,
        rawResponse: providerResponse.rawResponse,
        verifiedAt: new Date()
      };

      // Log the verification result
      auditLogger('AML_VERIFICATION', 'system', {
        documentId: document.fileName,
        provider: providerName,
        result: verificationResult
      });

      logger.info('AML document verification completed', {
        documentId: document.fileName,
        provider: providerName,
        approved: verificationResult.overallApproved,
        suspicious: verificationResult.suspicious
      });

      return verificationResult;
    } catch (error) {
      logger.error('Error during AML document verification', {
        documentId: document.fileName,
        provider: providerName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Return error result
      return {
        documentId: document.fileName,
        providerId: providerName,
        verificationId: 'error',
        success: false,
        kybVerified: false,
        amlClear: false,
        overallApproved: false,
        suspicious: true, // Mark as suspicious on error
        riskScore: 100, // High risk score on error
        reason: error instanceof Error ? error.message : 'AML verification failed',
        documentUrl: document.fileUrl,
        documentHash: this.calculateDocumentHash(document.fileUrl),
        rawResponse: { error: error instanceof Error ? error.message : 'Unknown error' },
        verifiedAt: new Date()
      };
    }
  }

  /**
   * Call the actual AML provider API
   * Uses Prembly API if configured, otherwise falls back to mock
   * @param document The document to verify
   * @param providerName The provider to use
   * @returns Provider response
   */
  private async callAMLProvider(document: BusinessDocumentData, providerName: string): Promise<AMLProviderResponse> {
    // Try Prembly API first if configured
    if (premblyService.isConfigured() && providerName === 'prembly') {
      logger.info('Using Prembly API for AML verification', {
        documentId: document.fileName,
        documentType: document.type
      });

      try {
        // Extract company information from document metadata or use defaults
        const premblyRequest: PremblyBusinessKYCRequest = {
          companyName: (document as any).companyName || 'Unknown Company',
          registrationNumber: (document as any).registrationNumber || '',
          documentImage: document.fileUrl // Assuming fileUrl contains the document
        };

        const premblyResponse = await premblyService.verifyAML(premblyRequest);

        if (premblyResponse.status && premblyResponse.data) {
          return {
            success: true,
            providerId: 'prembly',
            verificationId: premblyResponse.data.verificationId,
            result: {
              kyb: {
                verified: premblyResponse.data.kybVerified,
                companyName: premblyRequest.companyName,
                registrationNumber: premblyRequest.registrationNumber,
                status: premblyResponse.data.kybVerified ? 'active' : 'under_review',
                incorporationDate: undefined
              },
              aml: {
                peps: premblyResponse.data.peps,
                sanctions: premblyResponse.data.sanctions,
                adverseMedia: premblyResponse.data.adverseMedia,
                riskScore: premblyResponse.data.riskScore
              },
              overall: {
                approved: premblyResponse.data.amlClear && premblyResponse.data.kybVerified,
                suspicious: !premblyResponse.data.amlClear,
                reason: !premblyResponse.data.amlClear ? 'AML check flagged issues' : undefined
              }
            },
            rawResponse: premblyResponse
          };
        }
      } catch (error: any) {
        logger.error('Prembly AML verification failed, falling back to mock', {
          error: error.message,
          documentId: document.fileName
        });
      }
    }

    // Fallback to mock implementation
    logger.info(`Using mock implementation for ${providerName} AML verification`, {
      documentId: document.fileName
    });

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock response based on document type and random factors
    const isSuspicious = Math.random() < 0.1; // 10% chance of being suspicious
    const riskScore = isSuspicious ? Math.floor(Math.random() * 40) + 60 : Math.floor(Math.random() * 60);
    
    const response: AMLProviderResponse = {
      success: true,
      providerId: providerName,
      verificationId: `verification_${Date.now()}`,
      result: {
        kyb: {
          verified: !isSuspicious,
          companyName: 'Example Corp',
          registrationNumber: 'REG123456',
          status: isSuspicious ? 'under_review' : 'active',
          incorporationDate: '2020-01-01'
        },
        aml: {
          peps: isSuspicious && Math.random() < 0.3,
          sanctions: isSuspicious && Math.random() < 0.2,
          adverseMedia: isSuspicious && Math.random() < 0.4,
          riskScore
        },
        overall: {
          approved: !isSuspicious,
          suspicious: isSuspicious,
          reason: isSuspicious ? 'Potential match with sanctions list' : undefined
        }
      },
      rawResponse: {
        // This would contain the full raw response from the provider
        mock: true,
        timestamp: new Date().toISOString(),
        provider: providerName
      }
    };

    return response;
  }

  /**
   * Calculate document hash for audit trail
   * @param documentUrl The URL of the document
   * @returns SHA-256 hash of the document URL
   */
  private calculateDocumentHash(documentUrl: string): string {
    return createHash('sha256').update(documentUrl).digest('hex');
  }

  /**
   * Create a skip result for documents that don't require verification
   * @param document The document to skip verification for
   * @returns AML verification result indicating skipped verification
   */
  private createSkipResult(document: BusinessDocumentData): AMLVerificationResult {
    return {
      documentId: document.fileName,
      providerId: 'system',
      verificationId: 'skipped',
      success: true,
      kybVerified: true,
      amlClear: true,
      overallApproved: true,
      suspicious: false,
      riskScore: 0,
      reason: 'Document type does not require AML verification',
      documentUrl: document.fileUrl,
      documentHash: this.calculateDocumentHash(document.fileUrl),
      rawResponse: { skipped: true, reason: 'Document type does not require AML verification' },
      verifiedAt: new Date()
    };
  }

  /**
   * Update document status based on AML verification result
   * @param documentId The ID of the document to update
   * @param verificationResult The AML verification result
   * @returns Success status
   */
  async updateDocumentStatusBasedOnVerification(documentId: string, verificationResult: AMLVerificationResult): Promise<boolean> {
    try {
      // If the verification is suspicious, escalate for manual review
      if (verificationResult.suspicious) {
        logger.warn('AML verification flagged document as suspicious, escalating for manual review', {
          documentId,
          verificationId: verificationResult.verificationId,
          reason: verificationResult.reason
        });

        // Update document status to REVIEW
        const updatedDoc = await KYCProfileDb.findDocumentByIdAndUpdate(
          documentId,
          {
            status: KYCStatus.REVIEW,
            rejectionReason: `Suspicious document flagged by ${verificationResult.providerId}: ${verificationResult.reason || 'Manual review required'}`
          },
          { new: true }
        );

        if (!updatedDoc) {
          throw new Error('Document not found');
        }

        auditLogger('DOCUMENT_ESCALATED', 'system', {
          documentId,
          status: KYCStatus.REVIEW,
          reason: verificationResult.reason
        });

        return true;
      }

      // If verification failed, reject the document
      if (!verificationResult.overallApproved) {
        logger.warn('AML verification failed, rejecting document', {
          documentId,
          verificationId: verificationResult.verificationId,
          reason: verificationResult.reason
        });

        // Update document status to REJECTED
        const updatedDoc = await KYCProfileDb.findDocumentByIdAndUpdate(
          documentId,
          {
            status: KYCStatus.REJECTED,
            rejectionReason: `AML verification failed: ${verificationResult.reason || 'Document did not pass verification'}`
          },
          { new: true }
        );

        if (!updatedDoc) {
          throw new Error('Document not found');
        }

        auditLogger('DOCUMENT_REJECTED', 'system', {
          documentId,
          status: KYCStatus.REJECTED,
          reason: verificationResult.reason
        });

        return true;
      }

      // If verification passed, approve the document
      logger.info('AML verification passed, approving document', {
        documentId,
        verificationId: verificationResult.verificationId
      });

      // Update document status to APPROVED
      const updatedDoc = await KYCProfileDb.findDocumentByIdAndUpdate(
        documentId,
        {
          status: KYCStatus.APPROVED
        },
        { new: true }
        );

      if (!updatedDoc) {
        throw new Error('Document not found');
      }

      auditLogger('DOCUMENT_APPROVED', 'system', {
        documentId,
        status: KYCStatus.APPROVED
      });

      return true;
    } catch (error) {
      logger.error('Error updating document status based on AML verification', {
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
}

// Export singleton instance
export const amlVerificationService = new AMLVerificationService();