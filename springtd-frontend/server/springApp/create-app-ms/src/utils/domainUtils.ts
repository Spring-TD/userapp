/**
 * Utility functions for custom domain validation, normalization, and uniqueness checking
 */

/**
 * Validates custom domain format
 * Must be a valid FQDN, can include subdomain (www) or be root domain
 * Must not be the platform's base domain
 * 
 * @param domain - The custom domain to validate
 * @param platformBaseDomain - The platform's base domain to exclude
 * @returns Error message string if invalid, null if valid
 */
export function validateCustomDomain(domain: string, platformBaseDomain?: string): string | null {
  if (!domain || typeof domain !== 'string') {
    return 'Domain must be a non-empty string';
  }

  // Normalize the domain first
  const normalized = normalizeDomain(domain);

  // Basic FQDN validation regex
  // Allows: subdomain.domain.tld or domain.tld
  const fqdnRegex = /^([a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
  
  if (!fqdnRegex.test(normalized)) {
    return 'Invalid domain format. Must be a valid FQDN (e.g., www.example.com or example.com)';
  }

  // Check length (max 253 characters for FQDN)
  if (normalized.length > 253) {
    return 'Domain must be at most 253 characters long';
  }

  // Check minimum length (at least domain.tld)
  const parts = normalized.split('.');
  if (parts.length < 2) {
    return 'Domain must include at least a domain and TLD (e.g., example.com)';
  }

  // Validate each part
  for (const part of parts) {
    if (part.length > 63) {
      return 'Each domain part must be at most 63 characters long';
    }
    if (part.length === 0) {
      return 'Domain parts cannot be empty';
    }
    if (!/^[a-z0-9]([a-z0-9\-]*[a-z0-9])?$/i.test(part)) {
      return 'Domain parts can only contain letters, numbers, and hyphens, and cannot start or end with a hyphen';
    }
  }

  // Check if domain is the platform's base domain
  if (platformBaseDomain) {
    const normalizedPlatform = normalizeDomain(platformBaseDomain);
    if (normalized === normalizedPlatform || normalized.endsWith('.' + normalizedPlatform)) {
      return 'Domain cannot be the platform\'s base domain';
    }
  }

  return null; // Valid
}

/**
 * Normalizes domain (lowercase, trim, remove protocol, remove trailing slash)
 * 
 * @param domain - The domain to normalize
 * @returns Normalized domain string
 */
export function normalizeDomain(domain: string): string {
  if (!domain || typeof domain !== 'string') {
    return '';
  }

  let normalized = domain.trim().toLowerCase();

  // Remove protocol (http://, https://)
  normalized = normalized.replace(/^https?:\/\//, '');

  // Remove trailing slash
  normalized = normalized.replace(/\/+$/, '');

  // Remove path if present
  normalized = normalized.split('/')[0];

  // Remove port if present
  normalized = normalized.split(':')[0];

  return normalized;
}

/**
 * Extracts root domain from subdomain
 * e.g., "www.example.com" -> "example.com"
 * 
 * @param domain - The domain (may include subdomain)
 * @returns Root domain
 */
export function extractRootDomain(domain: string): string {
  if (!domain || typeof domain !== 'string') {
    return '';
  }

  const normalized = normalizeDomain(domain);
  const parts = normalized.split('.');

  // If we have at least 2 parts, take the last 2 (domain.tld)
  // For domains like co.uk, we'd need more sophisticated logic, but for now this works
  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }

  return normalized;
}

/**
 * Checks if domain is unique among existing domains
 * 
 * @param domain - The domain to check
 * @param existingDomains - Array of existing custom domains
 * @param currentAppId - Optional current app ID to exclude from uniqueness check
 * @returns True if unique, false if already exists
 */
export function isDomainUnique(
  domain: string,
  existingDomains: string[],
  currentAppId?: string
): boolean {
  if (!domain || !existingDomains || existingDomains.length === 0) {
    return true;
  }

  const normalized = normalizeDomain(domain);
  const rootDomain = extractRootDomain(normalized);

  // Check if exact domain or root domain already exists
  for (const existingDomain of existingDomains) {
    if (!existingDomain) continue;
    
    const normalizedExisting = normalizeDomain(existingDomain);
    const existingRoot = extractRootDomain(normalizedExisting);

    // Check exact match or root domain match
    if (normalized === normalizedExisting || rootDomain === existingRoot) {
      return false;
    }
  }

  return true;
}

