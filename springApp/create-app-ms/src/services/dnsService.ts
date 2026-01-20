import { DnsConfiguration } from '../types/app';
import { extractRootDomain, normalizeDomain } from '../utils/domainUtils';
import dns from 'dns';
import { promisify } from 'util';

const resolve4 = promisify(dns.resolve4);
const resolveCname = promisify(dns.resolveCname);

/**
 * DNS Service for generating DNS configurations and verifying DNS records
 */
export class DnsService {
  /**
   * Generates DNS configuration for a custom domain
   * Creates A record and CNAME records pointing to platform domain
   * 
   * @param customDomain - The custom domain (e.g., "www.customdomain.com")
   * @param platformDomain - The platform domain for CNAME records (e.g., "domain.useinclude.com")
   * @param serverIp - The server IP address for A record
   * @returns DNS configuration object
   */
  static generateDnsConfiguration(
    customDomain: string,
    platformDomain: string,
    serverIp: string
  ): DnsConfiguration {
    const normalizedDomain = normalizeDomain(customDomain);
    const rootDomain = extractRootDomain(normalizedDomain);

    // Generate base URL
    const baseUrl = `https://${normalizedDomain}/`;

    // A Record for root domain
    const aRecord = {
      type: 'A' as const,
      name: '@', // DNS convention for root domain
      value: serverIp
    };

    // CNAME Records
    const cnameRecords = [
      {
        type: 'CNAME' as const,
        name: 'www',
        value: platformDomain
      },
      {
        type: 'CNAME' as const,
        name: rootDomain,
        value: platformDomain
      }
    ];

    return {
      aRecord,
      cnameRecords,
      baseUrl
    };
  }

  /**
   * Verifies DNS configuration by performing DNS lookups
   * Checks A record and CNAME records
   * 
   * @param domain - The custom domain to verify
   * @param dnsConfig - The expected DNS configuration
   * @returns Verification result with status and errors
   */
  static async verifyDnsConfiguration(
    domain: string,
    dnsConfig: DnsConfiguration
  ): Promise<{ verified: boolean; errors: string[] }> {
    const errors: string[] = [];
    const normalizedDomain = normalizeDomain(domain);
    const rootDomain = extractRootDomain(normalizedDomain);

    try {
      // Verify A record for root domain
      if (dnsConfig.aRecord && dnsConfig.aRecord.value) {
        try {
          const aRecords = await resolve4(rootDomain);
          if (!aRecords.includes(dnsConfig.aRecord.value)) {
            errors.push(`A record for ${rootDomain} does not point to ${dnsConfig.aRecord.value}. Found: ${aRecords.join(', ')}`);
          }
        } catch (error: any) {
          errors.push(`A record verification failed for ${rootDomain}: ${error.message}`);
        }
      }

      // Verify CNAME records
      if (dnsConfig.cnameRecords && dnsConfig.cnameRecords.length > 0) {
        for (const cnameRecord of dnsConfig.cnameRecords) {
          try {
            const cnameTarget = `${cnameRecord.name}.${rootDomain}`;
            const cnames = await resolveCname(cnameTarget);
            
            // Check if any CNAME points to the expected platform domain
            const normalizedPlatform = normalizeDomain(dnsConfig.cnameRecords[0].value);
            const found = cnames.some(cname => 
              normalizeDomain(cname) === normalizedPlatform
            );

            if (!found) {
              errors.push(`CNAME record for ${cnameTarget} does not point to ${normalizedPlatform}. Found: ${cnames.join(', ')}`);
            }
          } catch (error: any) {
            // CNAME resolution can fail if record doesn't exist or is A record
            // This is not necessarily an error, but we'll note it
            if (error.code !== 'ENOTFOUND' && error.code !== 'ENODATA') {
              errors.push(`CNAME verification failed for ${cnameRecord.name}: ${error.message}`);
            } else {
              errors.push(`CNAME record for ${cnameRecord.name}.${rootDomain} not found or not configured`);
            }
          }
        }
      }

      // Also verify www subdomain if it's different from root
      if (normalizedDomain !== rootDomain && normalizedDomain.startsWith('www.')) {
        try {
          const wwwCnames = await resolveCname(normalizedDomain);
          const normalizedPlatform = normalizeDomain(dnsConfig.cnameRecords[0].value);
          const found = wwwCnames.some(cname => 
            normalizeDomain(cname) === normalizedPlatform
          );

          if (!found) {
            errors.push(`CNAME record for ${normalizedDomain} does not point to ${normalizedPlatform}`);
          }
        } catch (error: any) {
          if (error.code !== 'ENOTFOUND' && error.code !== 'ENODATA') {
            errors.push(`CNAME verification failed for ${normalizedDomain}: ${error.message}`);
          }
        }
      }

      return {
        verified: errors.length === 0,
        errors
      };
    } catch (error: any) {
      return {
        verified: false,
        errors: [`DNS verification failed: ${error.message}`]
      };
    }
  }

  /**
   * Helper to query DNS records for a domain
   * 
   * @param domain - The domain to query
   * @returns Array of DNS records
   */
  static async getDnsRecords(domain: string): Promise<{
    aRecords?: string[];
    cnameRecords?: string[];
  }> {
    const normalizedDomain = normalizeDomain(domain);
    const rootDomain = extractRootDomain(normalizedDomain);

    const result: {
      aRecords?: string[];
      cnameRecords?: string[];
    } = {};

    try {
      // Get A records
      try {
        result.aRecords = await resolve4(rootDomain);
      } catch (error) {
        // A records not found, that's okay
      }

      // Get CNAME records
      try {
        result.cnameRecords = await resolveCname(normalizedDomain);
      } catch (error) {
        // CNAME records not found, that's okay
      }
    } catch (error) {
      // General error
    }

    return result;
  }
}

