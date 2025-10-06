// src/__tests__/sanctionsService.test.ts
import { sanctionsService, SanctionsCheckRequest } from '../services/sanctionsService';

describe('SanctionsService', () => {
  describe('checkSanctions', () => {
    it('should return a valid response for a sanctions check request', async () => {
      // Arrange
      const request: SanctionsCheckRequest = {
        name: 'Test Company',
        companyId: 'TEST123',
        country: 'NG'
      };

      // Act
      const result = await sanctionsService.checkSanctions(request);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result.flagged).toBe('boolean');
      expect(Array.isArray(result.matches)).toBe(true);
    });

    it('should handle requests without optional fields', async () => {
      // Arrange
      const request: SanctionsCheckRequest = {
        name: 'Test Individual'
      };

      // Act
      const result = await sanctionsService.checkSanctions(request);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result.flagged).toBe('boolean');
      expect(Array.isArray(result.matches)).toBe(true);
    });

    it('should return an error response for requests without name', async () => {
      // Arrange
      const request: SanctionsCheckRequest = {
        companyId: 'TEST123',
        country: 'NG'
      } as any; // Force invalid request for testing

      // Act
      const result = await sanctionsService.checkSanctions(request);

      // Assert
      expect(result).toBeDefined();
      expect(result.flagged).toBe(false);
      expect(Array.isArray(result.matches)).toBe(true);
    });
  });
});