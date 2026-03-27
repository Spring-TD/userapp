/**
 * Sanitization Utility
 * 
 * Provides functions to sanitize user input to prevent XSS attacks.
 * Uses DOMPurify for HTML sanitization.
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content - removes dangerous tags and attributes
 * Use this when you need to render user-provided HTML
 */
export function sanitizeHtml(dirty: string): string {
  if (typeof window === 'undefined') {
    // Server-side: strip all HTML tags
    return dirty.replace(/<[^>]*>/g, '');
  }
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

/**
 * Sanitize text - removes all HTML, keeps plain text only
 * Use this for form inputs, names, descriptions, etc.
 */
export function sanitizeText(dirty: string): string {
  if (typeof window === 'undefined') {
    // Server-side: strip all HTML tags
    return dirty.replace(/<[^>]*>/g, '').trim();
  }
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] }).trim();
}

/**
 * Sanitize URL - ensures URL is safe (no javascript:, data:, etc.)
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  
  const trimmed = url.trim().toLowerCase();
  
  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  for (const protocol of dangerousProtocols) {
    if (trimmed.startsWith(protocol)) {
      return '';
    }
  }
  
  // Allow http, https, mailto, tel
  if (trimmed.startsWith('http://') || 
      trimmed.startsWith('https://') || 
      trimmed.startsWith('mailto:') || 
      trimmed.startsWith('tel:') ||
      trimmed.startsWith('/')) {
    return url.trim();
  }
  
  // For other URLs, prefix with https:// if no protocol
  if (!trimmed.includes('://')) {
    return `https://${url.trim()}`;
  }
  
  return url.trim();
}

/**
 * Sanitize email - validates and sanitizes email addresses
 */
export function sanitizeEmail(email: string): string {
  const sanitized = sanitizeText(email).toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(sanitized) ? sanitized : '';
}

/**
 * Sanitize phone number - removes non-numeric characters except + at start
 */
export function sanitizePhone(phone: string): string {
  const cleaned = phone.replace(/[^\d+\-\s()]/g, '');
  return cleaned.trim();
}

/**
 * Sanitize number input - ensures only numeric values
 */
export function sanitizeNumber(value: string): string {
  return value.replace(/[^\d.-]/g, '');
}

/**
 * Sanitize alphanumeric - keeps only letters and numbers
 */
export function sanitizeAlphanumeric(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Escape HTML entities - use when displaying user content in HTML
 */
export function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return text.replace(/[&<>"'/]/g, (char) => htmlEntities[char] || char);
}

/**
 * Sanitize object - recursively sanitize all string values in an object
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeText(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = sanitizeObject(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map(item => 
        typeof item === 'string' ? sanitizeText(item) : 
        typeof item === 'object' ? sanitizeObject(item) : item
      );
    } else {
      result[key] = value;
    }
  }
  
  return result as T;
}

export default {
  sanitizeHtml,
  sanitizeText,
  sanitizeUrl,
  sanitizeEmail,
  sanitizePhone,
  sanitizeNumber,
  sanitizeAlphanumeric,
  escapeHtml,
  sanitizeObject,
};
