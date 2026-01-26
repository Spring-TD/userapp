// src/services/sanctionsService.ts
import axios from 'axios';
import { logger } from '../utils/logger';
import { auditLogger } from '../utils/audit';
import { OPENSANCTIONS_API_KEY } from '../config/environment';

// Interface for sanctions check request
export interface SanctionsCheckRequest {
  name: string;
  companyId?: string;
  country?: string;
}

// Interface for sanctions check response
export interface SanctionsCheckResponse {
  flagged: boolean;
  matches: any[];
  message?: string;
}

// Interface for OpenSanctions API response
interface OpenSanctionsResponse {
  results: Array<{
    id: string;
    caption: string;
    schema: string;
    properties: {
      name?: string[];
      country?: string[];
      address?: string[];
      birthDate?: string[];
      deathDate?: string[];
      position?: string[];
      topics?: string[];
    };
    datasets: string[];
    referents: string[];
  }>;
}

export class SanctionsService {
  private readonly API_BASE_URL = 'https://api.opensanctions.org';
  private readonly API_KEY: string | undefined;

  constructor() {
    this.API_KEY = OPENSANCTIONS_API_KEY;
  }

  /**
   * Check if an individual or business is listed on any sanctions list
   * @param request The sanctions check request
   * @returns Sanctions check response
   */
  async checkSanctions(request: SanctionsCheckRequest): Promise<SanctionsCheckResponse> {
    try {
      // Log the request
      logger.info('Sanctions check requested', { 
        name: request.name,
        companyId: request.companyId,
        country: request.country
      });

      auditLogger('SANCTIONS_CHECK_REQUEST', 'system', {
        request
      });

      // Validate input
      if (!request.name) {
        const error = 'Name is required for sanctions check';
        logger.warn('Sanctions check validation failed', { error });
        return {
          flagged: false,
          matches: [],
          message: error
        };
      }

      // Prepare search query for OpenSanctions API
      const searchParams = new URLSearchParams();
      searchParams.append('q', request.name);
      
      if (request.country) {
        searchParams.append('countries', request.country);
      }

      // Build the API URL
      const apiUrl = `${this.API_BASE_URL}/search/${searchParams.toString()}`;
      
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Add API key if available
      if (this.API_KEY) {
        headers['Authorization'] = `Bearer ${this.API_KEY}`;
      }

      // Call OpenSanctions API
      logger.info('Calling OpenSanctions API', { apiUrl });
      
      const response = await axios.get<OpenSanctionsResponse>(apiUrl, { headers });
      
      // Log the response
      logger.info('OpenSanctions API response received', { 
        status: response.status,
        resultCount: response.data.results?.length || 0
      });

      auditLogger('SANCTIONS_CHECK_RESPONSE', 'system', {
        response: response.data
      });

      // Process the results
      if (!response.data.results || response.data.results.length === 0) {
        return {
          flagged: false,
          matches: [],
          message: 'No matches found on sanctions lists'
        };
      }

      // Filter for actual sanctions matches (topics include sanction-related topics)
      const sanctionsMatches = response.data.results.filter(result => {
        if (!result.properties.topics) return false;
        return result.properties.topics.some(topic => 
          topic.includes('sanction') || 
          topic.includes('poi') || 
          topic.includes('crime') ||
          topic.includes('wanted')
        );
      });

      // Return the result
      const result: SanctionsCheckResponse = {
        flagged: sanctionsMatches.length > 0,
        matches: sanctionsMatches,
        message: sanctionsMatches.length > 0 
          ? `Found ${sanctionsMatches.length} potential matches on sanctions lists` 
          : 'No sanctions matches found'
      };

      logger.info('Sanctions check completed', { 
        flagged: result.flagged,
        matchCount: result.matches.length
      });

      return result;
    } catch (error) {
      logger.error('Error during sanctions check', {
        error: error instanceof Error ? error.message : 'Unknown error',
        name: request.name,
        companyId: request.companyId
      });

      // Return error response
      return {
        flagged: false,
        matches: [],
        message: 'Error occurred during sanctions check'
      };
    }
  }
}

// Export singleton instance
export const sanctionsService = new SanctionsService();