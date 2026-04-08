import { config } from '../config/environment';
import { App } from '../types/app';
import { AppPwaTemplate } from '../types/pwaTemplate';
import { resolvePwaBaseUrl } from './pwaManifestBuilder';

const HEX_COLOR_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

export interface PwaReadinessResult {
  manifestReady: boolean;
  serviceWorkerReady: boolean;
  iconsReady: boolean;
  httpsReady: boolean;
  customDomainReady: boolean;
  warnings: string[];
  errors: string[];
}

export function validatePwaPublishReadiness(
  app: App,
  template: AppPwaTemplate | null
): PwaReadinessResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!template) {
    errors.push('No PWA template resolved for publish');
    return {
      manifestReady: false,
      serviceWorkerReady: false,
      iconsReady: false,
      httpsReady: false,
      customDomainReady: false,
      warnings,
      errors
    };
  }

  const logo = template.config.asset.logoUrl;
  const iconsReady = !!logo;
  if (!iconsReady) {
    errors.push('logoUrl is required');
  }

  const primary = template.config.splash.primaryColor;
  const secondary = template.config.splash.secondaryColor;
  if (!primary || !HEX_COLOR_RE.test(primary)) {
    errors.push('primaryColor must be a valid hex color');
  }
  if (!secondary || !HEX_COLOR_RE.test(secondary)) {
    errors.push('secondaryColor must be a valid hex color');
  }

  const baseUrl = resolvePwaBaseUrl(app, template);
  if (!baseUrl) {
    errors.push('No valid URL base for start_url and scope');
  }

  const httpsReady = !!baseUrl && /^https:\/\//i.test(baseUrl);
  if (config.nodeEnv === 'production' && !httpsReady) {
    errors.push('PWA base URL must be HTTPS in production');
  } else if (!httpsReady) {
    warnings.push('PWA base URL is not HTTPS');
  }

  const customDomainReady =
    template.config.dns.useCustomDomain === true &&
    template.config.dns.customDomainVerificationStatus === 'verified';
  if (template.config.dns.useCustomDomain && !customDomainReady) {
    warnings.push('Custom domain enabled but not verified');
  }

  return {
    manifestReady: errors.length === 0,
    serviceWorkerReady: true,
    iconsReady,
    httpsReady,
    customDomainReady,
    warnings,
    errors
  };
}

