/**
 * Utility functions for subdomain generation, validation, and uniqueness checking
 */

/**
 * Sanitizes a string to be used as a subdomain
 * Converts app name to URL-safe subdomain following DNS subdomain rules (RFC 1123)
 * 
 * @param name - The app name to sanitize
 * @returns A sanitized subdomain string
 */
export function sanitizeSubdomain(name: string): string {
  if (!name || typeof name !== 'string') {
    throw new Error('Name must be a non-empty string');
  }

  // Convert to lowercase
  let sanitized = name.toLowerCase();

  // Replace spaces and underscores with hyphens
  sanitized = sanitized.replace(/[\s_]+/g, '-');

  // Remove all characters except alphanumeric and hyphens
  sanitized = sanitized.replace(/[^a-z0-9-]/g, '');

  // Remove consecutive hyphens
  sanitized = sanitized.replace(/-+/g, '-');

  // Trim hyphens from start and end
  sanitized = sanitized.replace(/^-+|-+$/g, '');

  // Enforce minimum length (3 characters) - pad with random if too short
  if (sanitized.length < 3) {
    const randomSuffix = Math.random().toString(36).substring(2, 5);
    sanitized = sanitized || 'app';
    sanitized = `${sanitized}-${randomSuffix}`;
  }

  // Enforce maximum length (63 characters for DNS subdomain)
  if (sanitized.length > 63) {
    sanitized = sanitized.substring(0, 63);
    // Remove trailing hyphen if truncated
    sanitized = sanitized.replace(/-+$/, '');
  }

  return sanitized;
}

/**
 * Validates a subdomain format according to DNS subdomain rules (RFC 1123)
 * 
 * @param subdomain - The subdomain to validate
 * @returns Error message string if invalid, null if valid
 */
export function validateSubdomain(subdomain: string): string | null {
  if (!subdomain || typeof subdomain !== 'string') {
    return 'Subdomain must be a non-empty string';
  }

  // Check length (3-63 characters)
  if (subdomain.length < 3) {
    return 'Subdomain must be at least 3 characters long';
  }

  if (subdomain.length > 63) {
    return 'Subdomain must be at most 63 characters long';
  }

  // Check format: must start and end with alphanumeric character
  if (!/^[a-z0-9]/.test(subdomain)) {
    return 'Subdomain must start with a letter or number';
  }

  if (!/[a-z0-9]$/.test(subdomain)) {
    return 'Subdomain must end with a letter or number';
  }

  // Check characters: only lowercase letters, numbers, and hyphens
  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    return 'Subdomain can only contain lowercase letters, numbers, and hyphens';
  }

  // Check for consecutive hyphens
  if (subdomain.includes('--')) {
    return 'Subdomain cannot contain consecutive hyphens';
  }

  return null; // Valid
}

/**
 * Generates a unique subdomain by checking against existing subdomains
 * If the base subdomain exists, appends a numeric suffix (e.g., -2, -3)
 * 
 * @param baseSubdomain - The base subdomain to make unique
 * @param existingSubdomains - Array of existing subdomains to check against
 * @returns A unique subdomain
 */
export function generateUniqueSubdomain(
  baseSubdomain: string,
  existingSubdomains: string[]
): string {
  if (!baseSubdomain) {
    throw new Error('Base subdomain is required');
  }

  // Validate the base subdomain first
  const validationError = validateSubdomain(baseSubdomain);
  if (validationError) {
    throw new Error(`Invalid base subdomain: ${validationError}`);
  }

  // If subdomain doesn't exist, return it as-is
  if (!existingSubdomains.includes(baseSubdomain)) {
    return baseSubdomain;
  }

  // Find a unique variant by appending numbers
  let counter = 2;
  let uniqueSubdomain = `${baseSubdomain}-${counter}`;

  // Keep incrementing until we find a unique one
  while (existingSubdomains.includes(uniqueSubdomain)) {
    counter++;
    
    // Check if adding the counter would exceed 63 characters
    const candidate = `${baseSubdomain}-${counter}`;
    if (candidate.length > 63) {
      // Truncate base subdomain to make room for suffix
      const maxBaseLength = 63 - (counter.toString().length + 1); // +1 for hyphen
      const truncatedBase = baseSubdomain.substring(0, maxBaseLength).replace(/-+$/, '');
      uniqueSubdomain = `${truncatedBase}-${counter}`;
      
      // If still exists, try with random suffix as last resort
      if (existingSubdomains.includes(uniqueSubdomain)) {
        const randomSuffix = Math.random().toString(36).substring(2, 6);
        uniqueSubdomain = `${truncatedBase}-${randomSuffix}`;
      }
      break;
    }
    
    uniqueSubdomain = candidate;
  }

  return uniqueSubdomain;
}

