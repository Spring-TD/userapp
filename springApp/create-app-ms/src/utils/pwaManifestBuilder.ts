import { App } from '../types/app';
import { AppPwaTemplate } from '../types/pwaTemplate';
import { RuntimeManifest } from '../types/pwaPublish';
import { buildDefaultAppUrl } from '../config/environment';

function trimSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

export function resolvePwaBaseUrl(app: App, template: AppPwaTemplate): string | null {
  const dns = template.config.dns;
  const customDomain =
    dns.useCustomDomain &&
    dns.customDomain &&
    dns.customDomainVerificationStatus === 'verified'
      ? dns.customDomain.trim()
      : undefined;

  if (customDomain) {
    if (/^https?:\/\//i.test(customDomain)) {
      return trimSlash(customDomain);
    }
    return `https://${trimSlash(customDomain)}`;
  }
  if (dns.defaultAppUrl && /^https?:\/\//i.test(dns.defaultAppUrl)) {
    return trimSlash(dns.defaultAppUrl);
  }
  if (app.subdomain) {
    return trimSlash(buildDefaultAppUrl(app.subdomain));
  }
  return null;
}

export function buildRuntimeManifest(app: App, template: AppPwaTemplate): RuntimeManifest {
  const baseUrl = resolvePwaBaseUrl(app, template) || 'https://springtd.com';
  const shortName = (app.alias || app.name).slice(0, 12);
  const logo = template.config.asset.logoUrl || '';
  const icons = [
    {
      src: logo,
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any maskable'
    },
    {
      src: logo,
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable'
    }
  ];

  return {
    name: app.name,
    short_name: shortName || 'SpringTD',
    description: template.config.asset.siteDescription || undefined,
    start_url: `${baseUrl}/`,
    scope: `${baseUrl}/`,
    display: 'standalone',
    theme_color: template.config.splash.primaryColor || '#6B46C1',
    background_color: template.config.splash.secondaryColor || '#E5E7EB',
    icons
  };
}

