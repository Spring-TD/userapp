import {
  UpdateConfigurationRequest,
  AppElementsConfig,
  AppProfileConfig,
  OnboardingConfig,
  SupportConfig,
  PolicyConfig,
  DnsConfig,
  CreateSupportComponentRequest
} from '../types/appConfiguration';

export class ConfigurationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationValidationError';
  }
}

/**
 * Validate hex color code
 */
export function validateColor(color: string): boolean {
  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
  return hexColorRegex.test(color);
}

/**
 * Validate URL
 */
export function validateUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate email
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (basic validation - accepts international format)
 */
export function validatePhone(phone: string): boolean {
  // Remove spaces, dashes, and parentheses
  const cleaned = phone.replace(/[\s\-()]/g, '');
  // Check if it starts with + and has 7-15 digits after
  const phoneRegex = /^\+?[1-9]\d{6,14}$/;
  return phoneRegex.test(cleaned);
}

/**
 * Validate template name
 */
export function validateTemplateName(name: string): boolean {
  return name.length >= 2 && name.length <= 100;
}

/**
 * Validate app elements configuration
 */
export function validateAppElements(elements: Partial<AppElementsConfig>): void {
  if (elements.logo?.url && !validateUrl(elements.logo.url)) {
    throw new ConfigurationValidationError('Invalid logo URL');
  }

  if (elements.splash?.url && !validateUrl(elements.splash.url)) {
    throw new ConfigurationValidationError('Invalid splash URL');
  }

  if (elements.buttons) {
    if (elements.buttons.primary) {
      if (elements.buttons.primary.textColor && !validateColor(elements.buttons.primary.textColor)) {
        throw new ConfigurationValidationError('Invalid primary button text color');
      }
      if (elements.buttons.primary.backgroundColor && !validateColor(elements.buttons.primary.backgroundColor)) {
        throw new ConfigurationValidationError('Invalid primary button background color');
      }
    }
    if (elements.buttons.secondary) {
      if (elements.buttons.secondary.textColor && !validateColor(elements.buttons.secondary.textColor)) {
        throw new ConfigurationValidationError('Invalid secondary button text color');
      }
      if (elements.buttons.secondary.backgroundColor && !validateColor(elements.buttons.secondary.backgroundColor)) {
        throw new ConfigurationValidationError('Invalid secondary button background color');
      }
    }
  }

  if (elements.header) {
    if (elements.header.backgroundColor && !validateColor(elements.header.backgroundColor)) {
      throw new ConfigurationValidationError('Invalid header background color');
    }
    if (elements.header.textColor && !validateColor(elements.header.textColor)) {
      throw new ConfigurationValidationError('Invalid header text color');
    }
  }

  if (elements.bodyText) {
    if (elements.bodyText.backgroundColor && !validateColor(elements.bodyText.backgroundColor)) {
      throw new ConfigurationValidationError('Invalid body text background color');
    }
    if (elements.bodyText.textColor && !validateColor(elements.bodyText.textColor)) {
      throw new ConfigurationValidationError('Invalid body text color');
    }
  }

  if (elements.form) {
    if (elements.form.primaryColor && !validateColor(elements.form.primaryColor)) {
      throw new ConfigurationValidationError('Invalid form primary color');
    }
    if (elements.form.secondaryColor && !validateColor(elements.form.secondaryColor)) {
      throw new ConfigurationValidationError('Invalid form secondary color');
    }
  }
}

/**
 * Validate onboarding configuration
 */
export function validateOnboarding(onboarding: Partial<OnboardingConfig>): void {
  if (onboarding.appComponent) {
    if (onboarding.appComponent.backgroundColor && !validateColor(onboarding.appComponent.backgroundColor)) {
      throw new ConfigurationValidationError('Invalid app component background color');
    }
    if (onboarding.appComponent.textColor && !validateColor(onboarding.appComponent.textColor)) {
      throw new ConfigurationValidationError('Invalid app component text color');
    }
  }

  ['splash1', 'splash2', 'splash3'].forEach(splashKey => {
    const splash = onboarding[splashKey as keyof OnboardingConfig] as any;
    if (splash) {
      if (splash.logo?.url && !validateUrl(splash.logo.url)) {
        throw new ConfigurationValidationError(`Invalid ${splashKey} logo URL`);
      }
      if (splash.image?.url && !validateUrl(splash.image.url)) {
        throw new ConfigurationValidationError(`Invalid ${splashKey} image URL`);
      }
      if (splash.fontFamily && typeof splash.fontFamily !== 'string') {
        throw new ConfigurationValidationError(`Invalid ${splashKey} font family`);
      }
      if (splash.textColors) {
        if (splash.textColors.primary && !validateColor(splash.textColors.primary)) {
          throw new ConfigurationValidationError(`Invalid ${splashKey} text primary color`);
        }
        if (splash.textColors.secondary && !validateColor(splash.textColors.secondary)) {
          throw new ConfigurationValidationError(`Invalid ${splashKey} text secondary color`);
        }
      }
      if (splash.backgroundColors) {
        if (splash.backgroundColors.primary && !validateColor(splash.backgroundColors.primary)) {
          throw new ConfigurationValidationError(`Invalid ${splashKey} background primary color`);
        }
        if (splash.backgroundColors.secondary && !validateColor(splash.backgroundColors.secondary)) {
          throw new ConfigurationValidationError(`Invalid ${splashKey} background secondary color`);
        }
      }
      if (splash.primaryColor && !validateColor(splash.primaryColor)) {
        throw new ConfigurationValidationError(`Invalid ${splashKey} primary color`);
      }
      if (splash.secondaryColor && !validateColor(splash.secondaryColor)) {
        throw new ConfigurationValidationError(`Invalid ${splashKey} secondary color`);
      }
      if (splash.backgroundColor && !validateColor(splash.backgroundColor)) {
        throw new ConfigurationValidationError(`Invalid ${splashKey} background color`);
      }
      if (splash.textColor && !validateColor(splash.textColor)) {
        throw new ConfigurationValidationError(`Invalid ${splashKey} text color`);
      }
    }
  });
}

/**
 * Validate app profile configuration
 */
export function validateAppProfile(profile: Partial<AppProfileConfig>): void {
  if (profile.textColors) {
    if (profile.textColors.primary && !validateColor(profile.textColors.primary)) {
      throw new ConfigurationValidationError('Invalid text primary color');
    }
    if (profile.textColors.secondary && !validateColor(profile.textColors.secondary)) {
      throw new ConfigurationValidationError('Invalid text secondary color');
    }
    if (profile.textColors.aux && !validateColor(profile.textColors.aux)) {
      throw new ConfigurationValidationError('Invalid text aux color');
    }
  }

  if (profile.elementColors) {
    if (profile.elementColors.primary && !validateColor(profile.elementColors.primary)) {
      throw new ConfigurationValidationError('Invalid element primary color');
    }
    if (profile.elementColors.secondary && !validateColor(profile.elementColors.secondary)) {
      throw new ConfigurationValidationError('Invalid element secondary color');
    }
  }

  if (profile.menuColors) {
    if (profile.menuColors.primary && !validateColor(profile.menuColors.primary)) {
      throw new ConfigurationValidationError('Invalid menu primary color');
    }
    if (profile.menuColors.secondary && !validateColor(profile.menuColors.secondary)) {
      throw new ConfigurationValidationError('Invalid menu secondary color');
    }
    if (profile.menuColors.aux && !validateColor(profile.menuColors.aux)) {
      throw new ConfigurationValidationError('Invalid menu aux color');
    }
  }

  if (profile.auxiliaryElementColors) {
    if (profile.auxiliaryElementColors.primary && !validateColor(profile.auxiliaryElementColors.primary)) {
      throw new ConfigurationValidationError('Invalid auxiliary element primary color');
    }
    if (profile.auxiliaryElementColors.secondary && !validateColor(profile.auxiliaryElementColors.secondary)) {
      throw new ConfigurationValidationError('Invalid auxiliary element secondary color');
    }
  }

  if (profile.backgroundColors) {
    if (profile.backgroundColors.primary && !validateColor(profile.backgroundColors.primary)) {
      throw new ConfigurationValidationError('Invalid background primary color');
    }
    if (profile.backgroundColors.secondary && !validateColor(profile.backgroundColors.secondary)) {
      throw new ConfigurationValidationError('Invalid background secondary color');
    }
  }
}

/**
 * Validate support configuration
 */
export function validateSupport(support: Partial<SupportConfig>): void {
  if (support.supportEmail && !validateEmail(support.supportEmail)) {
    throw new ConfigurationValidationError('Invalid support email');
  }

  if (support.supportPhone && !validatePhone(support.supportPhone)) {
    throw new ConfigurationValidationError('Invalid support phone number');
  }

  if (support.supportWhatsapp && !validatePhone(support.supportWhatsapp)) {
    throw new ConfigurationValidationError('Invalid WhatsApp number');
  }

  if (support.website && !validateUrl(support.website)) {
    throw new ConfigurationValidationError('Invalid website URL');
  }

  if (support.linkedinPage && !validateUrl(support.linkedinPage)) {
    throw new ConfigurationValidationError('Invalid LinkedIn page URL');
  }

  if (support.privacyPolicyLink && !validateUrl(support.privacyPolicyLink)) {
    throw new ConfigurationValidationError('Invalid privacy policy link URL');
  }

  if (support.termsAndConditionsLink && !validateUrl(support.termsAndConditionsLink)) {
    throw new ConfigurationValidationError('Invalid terms and conditions link URL');
  }

  if (support.socials) {
    Object.entries(support.socials).forEach(([key, url]) => {
      if (url && !validateUrl(url)) {
        throw new ConfigurationValidationError(`Invalid ${key} URL`);
      }
    });
  }
}

/**
 * Validate policy configuration
 */
export function validatePolicy(policy: Partial<PolicyConfig>): void {
  // Validate new policy section structure
  if (policy.policy) {
    if (policy.policy.title !== undefined && typeof policy.policy.title !== 'string') {
      throw new ConfigurationValidationError('Policy title must be a string');
    }
    if (policy.policy.content !== undefined && typeof policy.policy.content !== 'string') {
      throw new ConfigurationValidationError('Policy content must be a string');
    }
  }

  if (policy.terms) {
    if (policy.terms.title !== undefined && typeof policy.terms.title !== 'string') {
      throw new ConfigurationValidationError('Terms title must be a string');
    }
    if (policy.terms.content !== undefined && typeof policy.terms.content !== 'string') {
      throw new ConfigurationValidationError('Terms content must be a string');
    }
  }

  // Validate legacy URL fields (only if they look like URLs)
  if (policy.termsAndConditions) {
    // If it starts with http:// or https://, validate as URL, otherwise treat as content
    if (policy.termsAndConditions.startsWith('http://') || policy.termsAndConditions.startsWith('https://')) {
      if (!validateUrl(policy.termsAndConditions)) {
        throw new ConfigurationValidationError('Invalid terms and conditions URL');
      }
    }
  }

  if (policy.privacyPolicy) {
    if (policy.privacyPolicy.startsWith('http://') || policy.privacyPolicy.startsWith('https://')) {
      if (!validateUrl(policy.privacyPolicy)) {
        throw new ConfigurationValidationError('Invalid privacy policy URL');
      }
    }
  }

  if (policy.indemnity) {
    if (policy.indemnity.startsWith('http://') || policy.indemnity.startsWith('https://')) {
      if (!validateUrl(policy.indemnity)) {
        throw new ConfigurationValidationError('Invalid indemnity URL');
      }
    }
  }
}

/**
 * Validate support component
 */
export function validateSupportComponent(component: CreateSupportComponentRequest): void {
  if (!component.name || component.name.trim().length === 0) {
    throw new ConfigurationValidationError('Component name is required');
  }

  if (component.name.length > 100) {
    throw new ConfigurationValidationError('Component name must be 100 characters or less');
  }

  if (!['link', 'button', 'text'].includes(component.type)) {
    throw new ConfigurationValidationError('Invalid component type');
  }

  if (!component.content || component.content.trim().length === 0) {
    throw new ConfigurationValidationError('Component content is required');
  }

  if (component.type === 'link' && !validateUrl(component.content)) {
    throw new ConfigurationValidationError('Invalid link URL');
  }

  if (component.color && !validateColor(component.color)) {
    throw new ConfigurationValidationError('Invalid component color');
  }

  if (component.order !== undefined && component.order < 0) {
    throw new ConfigurationValidationError('Component order must be non-negative');
  }
}

/**
 * Validate DNS configuration
 */
export function validateDnsConfig(dns: Partial<DnsConfig>): void {
  if (dns.customDomain !== undefined) {
    if (typeof dns.customDomain !== 'string' && dns.customDomain !== null) {
      throw new ConfigurationValidationError('Custom domain must be a string or null');
    }
    // Domain format validation is handled at the service level with domainUtils
  }

  if (dns.customDomainActive !== undefined && typeof dns.customDomainActive !== 'boolean') {
    throw new ConfigurationValidationError('Custom domain active must be a boolean');
  }

  if (dns.customDomainVerified !== undefined && typeof dns.customDomainVerified !== 'boolean') {
    throw new ConfigurationValidationError('Custom domain verified must be a boolean');
  }

  if (dns.vercelProjectId !== undefined && typeof dns.vercelProjectId !== 'string') {
    throw new ConfigurationValidationError('Vercel project ID must be a string');
  }

  if (dns.vercelTeamId !== undefined && typeof dns.vercelTeamId !== 'string') {
    throw new ConfigurationValidationError('Vercel team ID must be a string');
  }

  if (dns.dnsConfiguration) {
    if (dns.dnsConfiguration.aRecord) {
      if (dns.dnsConfiguration.aRecord.type !== 'A') {
        throw new ConfigurationValidationError('A record type must be "A"');
      }
      if (!dns.dnsConfiguration.aRecord.name || typeof dns.dnsConfiguration.aRecord.name !== 'string') {
        throw new ConfigurationValidationError('A record name is required');
      }
      if (!dns.dnsConfiguration.aRecord.value || typeof dns.dnsConfiguration.aRecord.value !== 'string') {
        throw new ConfigurationValidationError('A record value (IP address) is required');
      }
    }

    if (dns.dnsConfiguration.cnameRecords) {
      if (!Array.isArray(dns.dnsConfiguration.cnameRecords)) {
        throw new ConfigurationValidationError('CNAME records must be an array');
      }
      dns.dnsConfiguration.cnameRecords.forEach((record, index) => {
        if (record.type !== 'CNAME') {
          throw new ConfigurationValidationError(`CNAME record ${index} type must be "CNAME"`);
        }
        if (!record.name || typeof record.name !== 'string') {
          throw new ConfigurationValidationError(`CNAME record ${index} name is required`);
        }
        if (!record.value || typeof record.value !== 'string') {
          throw new ConfigurationValidationError(`CNAME record ${index} value is required`);
        }
      });
    }

    if (dns.dnsConfiguration.baseUrl && typeof dns.dnsConfiguration.baseUrl !== 'string') {
      throw new ConfigurationValidationError('Base URL must be a string');
    }

    if (dns.dnsConfiguration.txtRecords) {
      if (!Array.isArray(dns.dnsConfiguration.txtRecords)) {
        throw new ConfigurationValidationError('TXT records must be an array');
      }
      dns.dnsConfiguration.txtRecords.forEach((record, index) => {
        if (record.type !== 'TXT') {
          throw new ConfigurationValidationError(`TXT record ${index} type must be "TXT"`);
        }
        if (!record.name || typeof record.name !== 'string') {
          throw new ConfigurationValidationError(`TXT record ${index} name is required`);
        }
        if (!record.value || typeof record.value !== 'string') {
          throw new ConfigurationValidationError(`TXT record ${index} value is required`);
        }
      });
    }
  }
}

/**
 * Validate complete configuration update request
 */
export function validateConfigurationUpdate(config: UpdateConfigurationRequest): void {
  if (config.appElements) {
    validateAppElements(config.appElements);
  }

  if (config.appProfile) {
    validateAppProfile(config.appProfile);
  }

  if (config.onboarding) {
    validateOnboarding(config.onboarding);
  }

  if (config.support) {
    validateSupport(config.support);
  }

  if (config.policy) {
    validatePolicy(config.policy);
  }

  if (config.dnsConfig) {
    validateDnsConfig(config.dnsConfig);
  }
}

