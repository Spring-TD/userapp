import { livenessService, LivenessService } from '../services/livenessService';
import { Shareholder, KYCStatus } from '../types/kycTypes';

describe('LivenessService', () => {
  describe('generateLivenessTest', () => {
    it('should generate a liveness test URL with proper structure', async () => {
      const result = await livenessService.generateLivenessTest('test-shareholder-123', 'https://example.com/callback');
      
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('expiresAt');
      expect(result).toHaveProperty('providerReference');
      expect(result.url).toContain('mock-liveness-provider.com');
      expect(result.providerReference).toContain('liveness_test-shareholder-123');
    });
  });

  describe('processLivenessResult', () => {
    it('should process liveness result with proper structure', async () => {
      const result = await livenessService.processLivenessResult('test-reference-123');
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('completedAt');
      expect(typeof result.success).toBe('boolean');
      expect(result.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('initializeShareholderLiveness', () => {
    it('should initialize a shareholder with liveness test information', async () => {
      const mockShareholder = {
        fullName: 'John Doe',
        ownershipPercentage: 25,
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        bvn: '12345678901',
        bankAccount: 'ACC123456789',
        bankStatement: {
          fileName: 'bank-statement.pdf',
          fileType: 'application/pdf',
          fileSize: 1024000,
          fileUrl: 'https://example.com/bank-statement.pdf',
          uploadDate: new Date()
        }
      };
      
      const result = await livenessService.initializeShareholderLiveness(
        mockShareholder,
        'https://example.com/callback'
      );
      
      expect(result).toHaveProperty('kyc');
      expect(result.kyc).toHaveProperty('url');
      expect(result.kyc).toHaveProperty('expiresAt');
      expect(result.kyc).toHaveProperty('status');
      expect(result.kyc).toHaveProperty('providerReference');
      expect(result.status).toBe(KYCStatus.PENDING);
    });
  });

  describe('updateShareholderWithLivenessResult', () => {
    it('should update a shareholder with liveness test results', async () => {
      const mockShareholder: Shareholder = {
        fullName: 'John Doe',
        ownershipPercentage: 25,
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        bvn: '12345678901',
        bankAccount: 'ACC123456789',
        bankStatement: {
          fileName: 'bank-statement.pdf',
          fileType: 'application/pdf',
          fileSize: 1024000,
          fileUrl: 'https://example.com/bank-statement.pdf',
          uploadDate: new Date()
        },
        status: KYCStatus.PENDING,
        kyc: {
          url: 'https://example.com/liveness-test',
          expiresAt: new Date(Date.now() + 86400000),
          status: KYCStatus.PENDING,
          providerReference: 'test-reference-123'
        }
      };
      
      const result = await livenessService.updateShareholderWithLivenessResult(
        mockShareholder,
        'test-reference-123'
      );
      
      expect(result).toHaveProperty('kyc');
      expect(result.kyc).toHaveProperty('result');
      expect(result.kyc.result).toHaveProperty('success');
      expect(result.kyc.result).toHaveProperty('completedAt');
    });
  });
});