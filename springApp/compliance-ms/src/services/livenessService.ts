import { Shareholder, KYCStatus } from '../types/kycTypes';
import { logger } from '../utils/logger';

// Third-party liveness provider interface
interface LivenessProvider {
  generateLivenessUrl(shareholderId: string, callbackUrl: string): Promise<{
    url: string;
    expiresAt: Date;
    providerReference: string;
  }>;
  getLivenessResult(providerReference: string): Promise<{
    success: boolean;
    score?: number;
    details?: string;
    completedAt: Date;
  }>;
}

// Mock implementation of a liveness provider
// In a real implementation, this would call the actual third-party API
class MockLivenessProvider implements LivenessProvider {
  async generateLivenessUrl(shareholderId: string, callbackUrl: string): Promise<{
    url: string;
    expiresAt: Date;
    providerReference: string;
  }> {
    // In a real implementation, this would call the third-party API
    const providerReference = `liveness_${shareholderId}_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    // Mock URL that would redirect to the third-party provider
    const url = `https://mock-liveness-provider.com/test/${providerReference}?callback=${encodeURIComponent(callbackUrl)}`;
    
    logger.info('Generated liveness test URL', {
      shareholderId,
      providerReference,
      expiresAt,
      url
    });
    
    return { url, expiresAt, providerReference };
  }
  
  async getLivenessResult(providerReference: string): Promise<{
    success: boolean;
    score?: number;
    details?: string;
    completedAt: Date;
  }> {
    // In a real implementation, this would call the third-party API to get results
    // For mocking purposes, we'll simulate a successful result
    const success = Math.random() > 0.2; // 80% success rate for mock
    const score = success ? Math.floor(Math.random() * 41) + 60 : Math.floor(Math.random() * 30); // 60-100 for success, 0-29 for failure
    const completedAt = new Date();
    
    const result = {
      success,
      score,
      details: success 
        ? 'Liveness test passed successfully with clear facial recognition' 
        : 'Liveness test failed - unable to verify facial movements',
      completedAt
    };
    
    logger.info('Retrieved liveness test result', {
      providerReference,
      ...result
    });
    
    return result;
  }
}

// Liveness service class
export class LivenessService {
  private livenessProvider: LivenessProvider;
  
  constructor() {
    // In a real implementation, you might inject the provider based on configuration
    this.livenessProvider = new MockLivenessProvider();
  }
  
  /**
   * Generate a liveness test URL for a shareholder
   * @param shareholderId - Unique identifier for the shareholder
   * @param callbackUrl - URL where the provider should send results
   * @returns Liveness test information
   */
  async generateLivenessTest(shareholderId: string, callbackUrl: string): Promise<{
    url: string;
    expiresAt: Date;
    providerReference: string;
  }> {
    try {
      const result = await this.livenessProvider.generateLivenessUrl(shareholderId, callbackUrl);
      
      logger.info('Liveness test generated successfully', {
        shareholderId,
        providerReference: result.providerReference
      });
      
      return result;
    } catch (error) {
      logger.error('Failed to generate liveness test', {
        shareholderId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw new Error('Failed to generate liveness test');
    }
  }
  
  /**
   * Process the result of a liveness test
   * @param providerReference - Reference ID from the liveness provider
   * @returns Processed liveness result
   */
  async processLivenessResult(providerReference: string): Promise<{
    success: boolean;
    score?: number;
    details?: string;
    completedAt: Date;
  }> {
    try {
      const result = await this.livenessProvider.getLivenessResult(providerReference);
      
      logger.info('Liveness result processed successfully', {
        providerReference,
        success: result.success
      });
      
      return result;
    } catch (error) {
      logger.error('Failed to process liveness result', {
        providerReference,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw new Error('Failed to process liveness result');
    }
  }
  
  /**
   * Initialize shareholder with liveness test information
   * @param shareholder - The shareholder to initialize
   * @param callbackUrl - URL where the provider should send results
   * @returns Initialized shareholder with liveness test information
   */
  async initializeShareholderLiveness(shareholder: any, callbackUrl: string): Promise<Shareholder> {
    try {
      const livenessInfo = await this.generateLivenessTest(
        `${shareholder.fullName}_${shareholder.ownershipPercentage}`, 
        callbackUrl
      );
      
      // Create a proper Shareholder object with liveness test information
      const initializedShareholder: Shareholder = {
        fullName: shareholder.fullName,
        email: shareholder.email,
        phoneNumber: shareholder.phoneNumber,
        bvn: shareholder.bvn,
        bankAccount: shareholder.bankAccount,
        ownershipPercentage: shareholder.ownershipPercentage,
        submittedAt: shareholder.submittedAt,
        uboDocument: shareholder.uboDocument,
        bankStatement: shareholder.bankStatement,
        status: KYCStatus.PENDING,
        kyc: {
          url: livenessInfo.url,
          expiresAt: livenessInfo.expiresAt,
          status: KYCStatus.PENDING,
          providerReference: livenessInfo.providerReference
        }
      };
      
      logger.info('Shareholder liveness test initialized', {
        shareholderId: `${shareholder.fullName}_${shareholder.ownershipPercentage}`,
        providerReference: livenessInfo.providerReference
      });
      
      return initializedShareholder;
    } catch (error) {
      logger.error('Failed to initialize shareholder liveness test', {
        shareholder: shareholder.fullName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw new Error('Failed to initialize shareholder liveness test');
    }
  }
  
  /**
   * Update shareholder with liveness test results
   * @param shareholder - The shareholder to update
   * @param providerReference - Reference ID from the liveness provider
   * @returns Updated shareholder with liveness test results
   */
  async updateShareholderWithLivenessResult(
    shareholder: Shareholder, 
    providerReference: string
  ): Promise<Shareholder> {
    try {
      const result = await this.processLivenessResult(providerReference);
      
      // Update the shareholder with liveness test results
      const updatedShareholder: Shareholder = {
        ...shareholder,
        kyc: {
          ...shareholder.kyc,
          status: result.success ? 'completed' : 'failed',
          result: {
            ...result
          }
        },
        status: result.success ? KYCStatus.APPROVED : KYCStatus.REJECTED
      };
      
      logger.info('Shareholder updated with liveness test result', {
        shareholderId: `${shareholder.fullName}_${shareholder.ownershipPercentage}`,
        providerReference,
        success: result.success
      });
      
      return updatedShareholder;
    } catch (error) {
      logger.error('Failed to update shareholder with liveness result', {
        shareholder: shareholder.fullName,
        providerReference,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw new Error('Failed to update shareholder with liveness result');
    }
  }
}

// Export singleton instance
export const livenessService = new LivenessService();