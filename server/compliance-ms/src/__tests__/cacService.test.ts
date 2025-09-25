// src/__tests__/cacService.test.ts
import { cacService } from '../services/cacService';

// Mock the environment variables
jest.mock('../config/environment', () => ({
  CAC_API_URL: 'https://api.cac.gov.ng',
  CAC_API_KEY: 'test-api-key'
}));

describe('CACService', () => {
  describe('mockVerifyCertificateOfIncorporation', () => {
    it('should return valid for a valid registration number and company name', async () => {
      const result = await cacService.mockVerifyCertificateOfIncorporation(
        'RC123456',
        'Test Company Limited'
      );

      expect(result.success).toBe(true);
      expect(result.valid).toBe(true);
      expect(result.message).toBe('Mock verification successful');
      expect(result.data).toBeDefined();
      expect(result.data?.companyName).toBe('Test Company Limited');
      expect(result.data?.registrationNumber).toBe('RC123456');
    });

    it('should return invalid for an invalid registration number', async () => {
      const result = await cacService.mockVerifyCertificateOfIncorporation(
        'RC',
        'Test Company Limited'
      );

      expect(result.success).toBe(true);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Mock verification failed');
    });

    it('should return invalid for an invalid company name', async () => {
      const result = await cacService.mockVerifyCertificateOfIncorporation(
        'RC123456',
        'T'
      );

      expect(result.success).toBe(true);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Mock verification failed');
    });
  });
});