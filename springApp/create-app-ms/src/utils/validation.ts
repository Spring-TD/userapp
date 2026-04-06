import { CreateAppRequest } from '../types/app';
import { validateSubdomain } from './subdomainUtils';

export const validateCreateAppRequest = (data: Partial<CreateAppRequest>): string | null => {
  // Check required fields
  if (!data.name) {
    return 'App name is required';
  }
  
  if (!data.websiteUrl) {
    return 'Website URL is required';
  }
  
  if (!data.alias) {
    return 'App alias is required';
  }
  
  if (!data.description) {
    return 'App description is required';
  }
  
  // Validate name length
  if (data.name.length < 3 || data.name.length > 100) {
    return 'App name must be between 3 and 100 characters';
  }
  
  // Validate website URL format
  const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
  if (!urlRegex.test(data.websiteUrl)) {
    return 'Invalid website URL format';
  }
  
  // Validate alias length
  if (data.alias.length < 2 || data.alias.length > 50) {
    return 'App alias must be between 2 and 50 characters';
  }
  
  // Validate description length
  if (data.description.length < 10 || data.description.length > 1000) {
    return 'App description must be between 10 and 1000 characters';
  }

  if (data.subdomain !== undefined && data.subdomain !== '') {
    const subErr = validateSubdomain(data.subdomain.trim().toLowerCase());
    if (subErr) {
      return subErr;
    }
  }

  return null; // No validation errors
};