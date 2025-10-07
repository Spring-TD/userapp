// src/services/cacService.ts
import axios from 'axios';
import { logger } from '../utils/logger';
import { CAC_API_URL, CAC_API_KEY } from '../config/environment';

// Define the response structure from the CAC API
interface CACApiResponse {
  valid?: boolean;
  message?: string;
  data?: {
    companyName?: string;
    registrationNumber?: string;
    registrationDate?: string;
    status?: string;
    address?: string;
    directors?: Array<{
      name: string;
      position: string;
    }>;
  };
}

export interface CACVerificationResult {
  success: boolean;
  valid: boolean;
  message: string;
  data?: {
    companyName?: string;
    registrationNumber?: string;
    registrationDate?: string;
    status?: string;
    address?: string;
    directors?: Array<{
      name: string;
      position: string;
    }>;
  };
  error?: string;
}

export class CACService {
  /**
   * Verify a Certificate of Incorporation with the Nigerian Corporate Affairs Commission
   * @param registrationNumber The company registration number
   * @param companyName The company name
   * @returns Verification result
   */
  async verifyCertificateOfIncorporation(
    registrationNumber: string,
    companyName: string
  ): Promise<CACVerificationResult> {
    try {
      // Check if CAC API is configured
      if (!CAC_API_URL || !CAC_API_KEY) {
        logger.warn('CAC API not configured', {
          CAC_API_URL: CAC_API_URL ? 'configured' : 'missing',
          CAC_API_KEY: CAC_API_KEY ? 'configured' : 'missing'
        });
        
        return {
          success: false,
          valid: false,
          message: 'CAC verification service not configured',
          error: 'CAC API not configured'
        };
      }

      // Make API call to CAC service
      const response = await axios.post<CACApiResponse>(
        `${CAC_API_URL}/verify-certificate`,
        {
          registrationNumber,
          companyName
        },
        {
          headers: {
            'Authorization': `Bearer ${CAC_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );

      logger.info('CAC verification completed', {
        registrationNumber,
        companyName,
        status: response.status,
        valid: response.data?.valid
      });

      return {
        success: true,
        valid: response.data?.valid || false,
        message: response.data?.message || 'Verification completed',
        data: response.data?.data
      };
    } catch (error: any) {
      logger.error('Error verifying Certificate of Incorporation with CAC', {
        registrationNumber,
        companyName,
        error: error.message,
        status: error.response?.status,
        response: error.response?.data
      });

      // Handle specific error cases
      if (error.response?.status === 404) {
        return {
          success: true,
          valid: false,
          message: 'Company not found in CAC records',
          error: 'Company not found'
        };
      }

      if (error.response?.status === 401 || error.response?.status === 403) {
        return {
          success: false,
          valid: false,
          message: 'Authentication failed with CAC API',
          error: 'Authentication error'
        };
      }

      return {
        success: false,
        valid: false,
        message: 'Failed to verify Certificate of Incorporation',
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Mock verification for development/testing
   * @param registrationNumber The company registration number
   * @param companyName The company name
   * @returns Mock verification result
   */
  async mockVerifyCertificateOfIncorporation(
    registrationNumber: string,
    companyName: string
  ): Promise<CACVerificationResult> {
    logger.info('Using mock CAC verification', {
      registrationNumber,
      companyName
    });

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock verification logic
    const isValid = registrationNumber.length >= 5 && companyName.length >= 2;
    
    return {
      success: true,
      valid: isValid,
      message: isValid ? 'Mock verification successful' : 'Mock verification failed',
      data: isValid ? {
        companyName,
        registrationNumber,
        registrationDate: '2020-01-15',
        status: 'Active',
        address: '123 Business Street, Lagos, Nigeria',
        directors: [
          { name: 'John Doe', position: 'Managing Director' },
          { name: 'Jane Smith', position: 'Company Secretary' }
        ]
      } : undefined
    };
  }
}

export const cacService = new CACService();