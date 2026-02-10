// src/services/cacService.ts
import axios from 'axios';
import { logger } from '../utils/logger';
import { CAC_API_URL, CAC_API_KEY } from '../config/environment';
import { premblyService, PremblyCACRequest } from './premblyService';

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
   * Uses Prembly API if configured, otherwise falls back to direct CAC API or mock
   * @param registrationNumber The company registration number
   * @param companyName The company name
   * @returns Verification result
   */
  async verifyCertificateOfIncorporation(
    registrationNumber: string,
    companyName: string
  ): Promise<CACVerificationResult> {
    try {
      // Try Prembly API first if configured
      if (premblyService.isConfigured()) {
        logger.info('Using Prembly API for CAC verification', {
          registrationNumber,
          companyName
        });

        const premblyRequest: PremblyCACRequest = {
          registrationNumber,
          companyName
        };

        const premblyResponse = await premblyService.verifyCAC(premblyRequest);

        if (premblyResponse.status && premblyResponse.data) {
          return {
            success: true,
            valid: premblyResponse.data.verified,
            message: premblyResponse.message || 'CAC verification completed',
            data: {
              companyName: premblyResponse.data.companyName,
              registrationNumber: premblyResponse.data.registrationNumber,
              registrationDate: premblyResponse.data.registrationDate,
              status: premblyResponse.data.status,
              address: premblyResponse.data.address,
              directors: premblyResponse.data.directors
            }
          };
        } else {
          logger.warn('Prembly CAC verification failed, falling back to alternative method', {
            message: premblyResponse.message
          });
        }
      }

      // Fallback to direct CAC API if configured
      if (CAC_API_URL && CAC_API_KEY) {
        logger.info('Using direct CAC API for verification', {
          registrationNumber,
          companyName
        });

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
      }

      // Fallback to mock if no API is configured
      logger.warn('No CAC API configured, using mock verification', {
        registrationNumber,
        companyName
      });

      return this.mockVerifyCertificateOfIncorporation(registrationNumber, companyName);
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