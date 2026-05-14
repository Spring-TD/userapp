import { App } from '../types/app';
import { AppPwaTemplate } from '../types/pwaTemplate';
import { RuntimeManifest } from '../types/pwaPublish';
import { buildDefaultAppUrl, config } from '../config/environment';

function trimSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function normalizeBaseUrl(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(withProtocol);
    if (!parsed.hostname) {
      return null;
    }
    if (config.nodeEnv === 'production' && parsed.protocol !== 'https:') {
      parsed.protocol = 'https:';
    }
    return trimSlash(parsed.toString());
  } catch {
    return null;
  }
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
    const normalized = normalizeBaseUrl(customDomain);
    if (normalized) return normalized;
  }
  if (dns.defaultAppUrl) {
    const normalized = normalizeBaseUrl(dns.defaultAppUrl);
    if (normalized) return normalized;
  }
  const fallbackSubdomain = app.subdomain || (app.alias ? toSlug(app.alias) : '');
  if (fallbackSubdomain) {
    const normalized = normalizeBaseUrl(buildDefaultAppUrl(fallbackSubdomain));
    if (normalized) return normalized;
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

