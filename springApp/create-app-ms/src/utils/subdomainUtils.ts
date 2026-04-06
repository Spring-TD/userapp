/**
 * Subdomain generation and validation (RFC 1123–style labels for {slug}.{platformDomain}).
 */

export function sanitizeSubdomain(name: string): string {
  if (!name || typeof name !== 'string') {
    throw new Error('Name must be a non-empty string');
  }

  let sanitized = name.toLowerCase();
  sanitized = sanitized.replace(/[\s_]+/g, '-');
  sanitized = sanitized.replace(/[^a-z0-9-]/g, '');
  sanitized = sanitized.replace(/-+/g, '-');
  sanitized = sanitized.replace(/^-+|-+$/g, '');

  if (sanitized.length < 3) {
    const randomSuffix = Math.random().toString(36).substring(2, 5);
    sanitized = sanitized || 'app';
    sanitized = `${sanitized}-${randomSuffix}`;
  }

  if (sanitized.length > 63) {
    sanitized = sanitized.substring(0, 63);
    sanitized = sanitized.replace(/-+$/, '');
  }

  return sanitized;
}

export function validateSubdomain(subdomain: string): string | null {
  if (!subdomain || typeof subdomain !== 'string') {
    return 'Subdomain must be a non-empty string';
  }

  if (subdomain.length < 3) {
    return 'Subdomain must be at least 3 characters long';
  }

  if (subdomain.length > 63) {
    return 'Subdomain must be at most 63 characters long';
  }

  if (!/^[a-z0-9]/.test(subdomain)) {
    return 'Subdomain must start with a letter or number';
  }

  if (!/[a-z0-9]$/.test(subdomain)) {
    return 'Subdomain must end with a letter or number';
  }

  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    return 'Subdomain can only contain lowercase letters, numbers, and hyphens';
  }

  if (subdomain.includes('--')) {
    return 'Subdomain cannot contain consecutive hyphens';
  }

  return null;
}

export function generateUniqueSubdomain(
  baseSubdomain: string,
  existingSubdomains: string[]
): string {
  if (!baseSubdomain) {
    throw new Error('Base subdomain is required');
  }

  const validationError = validateSubdomain(baseSubdomain);
  if (validationError) {
    throw new Error(`Invalid base subdomain: ${validationError}`);
  }

  if (!existingSubdomains.includes(baseSubdomain)) {
    return baseSubdomain;
  }

  let counter = 2;
  let uniqueSubdomain = `${baseSubdomain}-${counter}`;

  while (existingSubdomains.includes(uniqueSubdomain)) {
    counter++;
    const candidate = `${baseSubdomain}-${counter}`;
    if (candidate.length > 63) {
      const maxBaseLength = 63 - (counter.toString().length + 1);
      const truncatedBase = baseSubdomain.substring(0, maxBaseLength).replace(/-+$/, '');
      uniqueSubdomain = `${truncatedBase}-${counter}`;
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
