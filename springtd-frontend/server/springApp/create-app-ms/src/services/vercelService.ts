import axios, { AxiosInstance } from 'axios';
import { config } from '../config/environment';
import { ApiError } from '../middleware/errorHandler';

/**
 * Vercel API Response Types
 */
export interface VercelDomain {
  name: string;
  apexName: string;
  projectId: string;
  redirect?: string | null;
  redirectStatusCode?: number | null;
  gitBranch?: string | null;
  updatedAt?: number;
  createdAt?: number;
  verified?: boolean;
  verification?: {
    type: string;
    domain: string;
    value: string;
    reason: string;
  }[];
  cname?: string[];
  dns?: {
    slug: string;
    type: string;
    name: string;
    value: string;
  }[];
}

export interface VercelDomainResponse {
  name: string;
  apexName: string;
  projectId: string;
  redirect?: string | null;
  redirectStatusCode?: number | null;
  gitBranch?: string | null;
  updatedAt?: number;
  createdAt?: number;
  verified?: boolean;
  verification?: Array<{
    type: string;
    domain: string;
    value: string;
    reason: string;
  }>;
  cname?: string[];
  dns?: Array<{
    slug: string;
    type: string;
    name: string;
    value: string;
  }>;
}

export interface VercelDnsRecord {
  type: 'A' | 'CNAME' | 'TXT' | 'MX' | 'SRV';
  name: string;
  value: string;
  ttl?: number;
}

export interface VercelDomainConfig {
  aRecords?: string[];
  cnameRecords?: string[];
  txtRecords?: Array<{ name: string; value: string }>;
  verificationRecords?: Array<{ name: string; value: string }>;
}

/**
 * Vercel Service for API Integration
 */
export class VercelService {
  private apiClient: AxiosInstance;
  private baseUrl = 'https://api.vercel.com';

  constructor() {
    if (!config.vercelApiToken) {
      console.warn('Vercel API token not configured. Vercel integration will not work.');
    }

    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${config.vercelApiToken || ''}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  /**
   * Check if Vercel is configured
   */
  isConfigured(): boolean {
    return !!config.vercelApiToken;
  }

  /**
   * Add a domain to a Vercel project
   * @param domain The domain to add (e.g., "example.com" or "www.example.com")
   * @param projectId Optional project ID (uses default if not provided)
   * @param teamId Optional team ID
   */
  async addDomain(
    domain: string,
    projectId?: string,
    teamId?: string
  ): Promise<VercelDomainResponse> {
    if (!this.isConfigured()) {
      throw new ApiError(500, 'Vercel API is not configured. Please set VERCEL_API_TOKEN.');
    }

    const project = projectId || config.vercelDefaultProjectId;
    if (!project) {
      throw new ApiError(400, 'Vercel project ID is required. Set VERCEL_DEFAULT_PROJECT_ID or provide projectId.');
    }

    try {
      const params = new URLSearchParams();
      if (teamId || config.vercelTeamId) {
        params.append('teamId', teamId || config.vercelTeamId!);
      }

      const url = `/v10/projects/${project}/domains${params.toString() ? `?${params.toString()}` : ''}`;
      
      const response = await this.apiClient.post<VercelDomainResponse>(url, {
        name: domain
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.error?.message || error.message;
        
        if (status === 400) {
          throw new ApiError(400, `Invalid domain request: ${message}`);
        } else if (status === 401) {
          throw new ApiError(401, 'Vercel API authentication failed. Check your VERCEL_API_TOKEN.');
        } else if (status === 403) {
          throw new ApiError(403, 'Vercel API access forbidden. Check your permissions.');
        } else if (status === 409) {
          throw new ApiError(409, `Domain already exists in Vercel: ${message}`);
        } else {
          throw new ApiError(500, `Vercel API error: ${message}`);
        }
      }
      throw new ApiError(500, `Failed to add domain to Vercel: ${error.message}`);
    }
  }

  /**
   * Get domain information from Vercel
   * @param domain The domain to query
   * @param projectId Optional project ID
   * @param teamId Optional team ID
   */
  async getDomain(
    domain: string,
    projectId?: string,
    teamId?: string
  ): Promise<VercelDomainResponse | null> {
    if (!this.isConfigured()) {
      return null;
    }

    const project = projectId || config.vercelDefaultProjectId;
    if (!project) {
      return null;
    }

    try {
      const params = new URLSearchParams();
      if (teamId || config.vercelTeamId) {
        params.append('teamId', teamId || config.vercelTeamId!);
      }

      const url = `/v10/projects/${project}/domains/${domain}${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await this.apiClient.get<VercelDomainResponse>(url);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Error fetching Vercel domain:', error.message);
      return null;
    }
  }

  /**
   * Remove a domain from a Vercel project
   * @param domain The domain to remove
   * @param projectId Optional project ID
   * @param teamId Optional team ID
   */
  async removeDomain(
    domain: string,
    projectId?: string,
    teamId?: string
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      throw new ApiError(500, 'Vercel API is not configured.');
    }

    const project = projectId || config.vercelDefaultProjectId;
    if (!project) {
      throw new ApiError(400, 'Vercel project ID is required.');
    }

    try {
      const params = new URLSearchParams();
      if (teamId || config.vercelTeamId) {
        params.append('teamId', teamId || config.vercelTeamId!);
      }

      const url = `/v10/projects/${project}/domains/${domain}${params.toString() ? `?${params.toString()}` : ''}`;
      await this.apiClient.delete(url);
      return true;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return false; // Domain doesn't exist, consider it removed
      }
      throw new ApiError(500, `Failed to remove domain from Vercel: ${error.message}`);
    }
  }

  /**
   * Extract DNS configuration from Vercel domain response
   * @param domainResponse Vercel domain response
   * @returns DNS configuration with A records, CNAME records, and verification records
   */
  extractDnsConfiguration(domainResponse: VercelDomainResponse): VercelDomainConfig {
    const config: VercelDomainConfig = {
      aRecords: [],
      cnameRecords: [],
      txtRecords: [],
      verificationRecords: []
    };

    // Extract DNS records from Vercel response
    if (domainResponse.dns && Array.isArray(domainResponse.dns)) {
      domainResponse.dns.forEach(record => {
        if (record.type === 'A') {
          config.aRecords?.push(record.value);
        } else if (record.type === 'CNAME') {
          config.cnameRecords?.push(record.value);
        }
      });
    }

    // Extract CNAME from cname array if available
    if (domainResponse.cname && Array.isArray(domainResponse.cname)) {
      domainResponse.cname.forEach(cname => {
        if (!config.cnameRecords?.includes(cname)) {
          config.cnameRecords?.push(cname);
        }
      });
    }

    // Extract verification records
    if (domainResponse.verification && Array.isArray(domainResponse.verification)) {
      domainResponse.verification.forEach(verification => {
        if (verification.type === 'dns' || verification.type === 'txt') {
          config.verificationRecords?.push({
            name: verification.domain,
            value: verification.value
          });
        }
      });
    }

    return config;
  }

  /**
   * Verify domain status in Vercel
   * @param domain The domain to verify
   * @param projectId Optional project ID
   * @param teamId Optional team ID
   */
  async verifyDomain(
    domain: string,
    projectId?: string,
    teamId?: string
  ): Promise<{ verified: boolean; domain: VercelDomainResponse | null }> {
    const domainInfo = await this.getDomain(domain, projectId, teamId);
    
    if (!domainInfo) {
      return { verified: false, domain: null };
    }

    return {
      verified: domainInfo.verified === true,
      domain: domainInfo
    };
  }
}

