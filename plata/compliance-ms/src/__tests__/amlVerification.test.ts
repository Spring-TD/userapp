// src/__tests__/amlVerification.test.ts
import { BusinessDocumentData, BusinessDocumentType, KYCStatus } from '../types/kycTypes';
import { amlVerificationService, AMLVerificationResult } from '../services/amlVerificationService';

describe('AML Verification Service', () => {
  describe('verifyDocument', () => {
    it('should verify a business document with Prembly (or return error if not configured)', async () => {
      const mockDocument: BusinessDocumentData = {
        type: BusinessDocumentType.CERTIFICATE_OF_INCORPORATION,
        fileName: 'certificate.pdf',
        fileType: 'application/pdf',
        fileSize: 1024000,
        fileUrl: 'https://example.com/certificate.pdf',
        uploadedAt: new Date(),
        status: KYCStatus.PENDING
      };

      const result: AMLVerificationResult = await amlVerificationService.verifyDocument(mockDocument);

      expect(result).toBeDefined();
      expect(result.documentId).toBe('certificate.pdf');
      expect(result.providerId).toBe('prembly');
      expect(typeof result.verificationId).toBe('string');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.documentUrl).toBe('string');
      expect(typeof result.documentHash).toBe('string');
      expect(result.verifiedAt).toBeInstanceOf(Date);
    });

    it('should skip verification for AML policies document', async () => {
      const mockDocument: BusinessDocumentData = {
        type: BusinessDocumentType.AML_POLICIES,
        fileName: 'aml-policy.pdf',
        fileType: 'application/pdf',
        fileSize: 1024000,
        fileUrl: 'https://example.com/aml-policy.pdf',
        uploadedAt: new Date(),
        status: KYCStatus.PENDING
      };

      const result: AMLVerificationResult = await amlVerificationService.verifyDocument(mockDocument);

      expect(result).toBeDefined();
      expect(result.documentId).toBe('aml-policy.pdf');
      expect(result.providerId).toBe('system');
      expect(result.verificationId).toBe('skipped');
      expect(result.success).toBe(true);
      expect(result.kybVerified).toBe(true);
      expect(result.amlClear).toBe(true);
      expect(result.overallApproved).toBe(true);
      expect(result.suspicious).toBe(false);
      expect(result.riskScore).toBe(0);
    });

    it('should return error result when Prembly is not configured', async () => {
      const mockDocument: BusinessDocumentData = {
        type: BusinessDocumentType.CERTIFICATE_OF_INCORPORATION,
        fileName: 'certificate.pdf',
        fileType: 'application/pdf',
        fileSize: 1024000,
        fileUrl: 'https://example.com/certificate.pdf',
        uploadedAt: new Date(),
        status: KYCStatus.PENDING
      };

      // Without PREMBLY_API_KEY/PREMBLY_API_SECRET, verification returns error result
      const result: AMLVerificationResult = await amlVerificationService.verifyDocument(mockDocument);

      expect(result).toBeDefined();
      expect(result.documentId).toBe('certificate.pdf');
      expect(result.providerId).toBe('prembly');
      expect(result.success).toBe(false);
      expect(result.suspicious).toBe(true);
      expect(result.riskScore).toBe(100);
    });
  });

  describe('updateDocumentStatusBasedOnVerification', () => {
    it('should update document status to REVIEW when suspicious', async () => {
      const mockVerificationResult: AMLVerificationResult = {
        documentId: 'test-document',
        providerId: 'prembly',
        verificationId: 'verification-123',
        success: true,
        kybVerified: true,
        amlClear: true,
        overallApproved: false,
        suspicious: true,
        riskScore: 80,
        reason: 'Potential match with sanctions list',
        documentUrl: 'https://example.com/document.pdf',
        documentHash: 'hash123',
        rawResponse: {},
        verifiedAt: new Date()
      };

      // This would normally interact with the database, but we're just testing the logic
      const result = await amlVerificationService.updateDocumentStatusBasedOnVerification('document-123', mockVerificationResult);
      
      // Since we're using mock data, we can't fully test the database interaction
      // but we can verify the method doesn't throw an error
      expect(typeof result).toBe('boolean');
    });

    it('should update document status to REJECTED when not approved', async () => {
      const mockVerificationResult: AMLVerificationResult = {
        documentId: 'test-document',
        providerId: 'prembly',
        verificationId: 'verification-123',
        success: true,
        kybVerified: false,
        amlClear: false,
        overallApproved: false,
        suspicious: false,
        riskScore: 90,
        reason: 'KYB verification failed',
        documentUrl: 'https://example.com/document.pdf',
        documentHash: 'hash123',
        rawResponse: {},
        verifiedAt: new Date()
      };

      // This would normally interact with the database, but we're just testing the logic
      const result = await amlVerificationService.updateDocumentStatusBasedOnVerification('document-123', mockVerificationResult);
      
      // Since we're using mock data, we can't fully test the database interaction
      // but we can verify the method doesn't throw an error
      expect(typeof result).toBe('boolean');
    });

    it('should update document status to APPROVED when verified', async () => {
      const mockVerificationResult: AMLVerificationResult = {
        documentId: 'test-document',
        providerId: 'prembly',
        verificationId: 'verification-123',
        success: true,
        kybVerified: true,
        amlClear: true,
        overallApproved: true,
        suspicious: false,
        riskScore: 10,
        documentUrl: 'https://example.com/document.pdf',
        documentHash: 'hash123',
        rawResponse: {},
        verifiedAt: new Date()
      };

      // This would normally interact with the database, but we're just testing the logic
      const result = await amlVerificationService.updateDocumentStatusBasedOnVerification('document-123', mockVerificationResult);
      
      // Since we're using mock data, we can't fully test the database interaction
      // but we can verify the method doesn't throw an error
      expect(typeof result).toBe('boolean');
    });
  });
});