import axios from 'axios';
import { Request } from 'express';
import { config } from '../config/environment';

export type ResolvedTenantContext = {
  appId: string;
  merchantId: string;
  subdomain: string;
};

type ResolvedAppResponse = {
  success: boolean;
  data?: {
    id: string;
    merchantId: string;
    subdomain: string;
    status: string;
  };
};

function normalizeHost(host: string): string {
  const value = host.split(',')[0].trim().toLowerCase();
  return value.split(':')[0];
}

function hostFromUrl(value: string): string | null {
  try {
    const url = value.startsWith('http') ? value : `https://${value}`;
    return normalizeHost(new URL(url).hostname);
  } catch {
    return null;
  }
}

/** Prefer forwarded / browser host headers (Vercel, Cloudflare, account-ms gateway). */
export function extractRequestHost(req: Request): string | null {
  const headerCandidates = [
    req.headers['x-forwarded-host'],
    req.headers['x-original-host'],
    req.headers['x-tenant-host'],
    req.headers.host
  ];

  for (const raw of headerCandidates) {
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (typeof value === 'string' && value.trim()) {
      return normalizeHost(value);
    }
  }

  const urlCandidates = [req.headers.origin, req.headers.referer];
  for (const raw of urlCandidates) {
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (typeof value === 'string' && value.trim()) {
      const host = hostFromUrl(value.trim());
      if (host) {
        return host;
      }
    }
  }

  return null;
}

function isIpAddress(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

/** Same rules as account-ms tenantResolverMiddleware (incl. bare crbc.tryspring.io). */
export function extractTenantSubdomainFromHost(host: string): string | null {
  if (!host || host === 'localhost' || isIpAddress(host)) {
    return null;
  }

  const base = config.platformBaseDomain.toLowerCase();
  if (!base || host === base) {
    return null;
  }

  const suffix = `.${base}`;
  if (!host.endsWith(suffix)) {
    return null;
  }

  const hostLabel = host.slice(0, -suffix.length);
  if (!hostLabel) {
    return null;
  }

  const expectedPrefix = config.platformSubdomainPrefix.trim().toLowerCase();
  let subdomain: string;

  if (expectedPrefix) {
    const prefixWithDot = `${expectedPrefix}.`;
    if (hostLabel.startsWith(prefixWithDot)) {
      subdomain = hostLabel.slice(prefixWithDot.length);
    } else if (!hostLabel.includes('.')) {
      subdomain = hostLabel;
    } else {
      return null;
    }
  } else if (hostLabel.includes('.')) {
    return null;
  } else {
    subdomain = hostLabel;
  }

  if (!subdomain || subdomain.includes('.')) {
    return null;
  }

  if (config.reservedSubdomains.includes(subdomain)) {
    return null;
  }

  return subdomain;
}

function explicitSubdomainFromHeaders(req: Request): string | null {
  const raw =
    req.headers['x-tenant-subdomain'] ||
    req.headers['x-app-subdomain'] ||
    req.headers['x-subdomain'];
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim().toLowerCase();
  if (!value || config.reservedSubdomains.includes(value)) {
    return null;
  }
  return value;
}

function subdomainFromBody(req: Request): string | null {
  const body = req.body as Record<string, unknown> | undefined;
  if (!body || typeof body !== 'object') {
    return null;
  }
  const raw = body.subdomain ?? body.tenant_subdomain ?? body.app_subdomain;
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!value || config.reservedSubdomains.includes(value)) {
    return null;
  }
  return value;
}

export async function resolveTenantFromRequest(req: Request): Promise<ResolvedTenantContext | null> {
  const explicit = explicitSubdomainFromHeaders(req);
  const fromBody = subdomainFromBody(req);
  const host = extractRequestHost(req);
  const subdomain =
    explicit || fromBody || (host ? extractTenantSubdomainFromHost(host) : null);

  if (!subdomain || !config.createAppServiceUrl) {
    return null;
  }

  try {
    const response = await axios.get<ResolvedAppResponse>(
      `${config.createAppServiceUrl}/api/v1/apps/resolve/${encodeURIComponent(subdomain)}`,
      { timeout: config.tenantResolverTimeoutMs, validateStatus: () => true }
    );

    if (response.status !== 200 || !response.data?.success || !response.data.data) {
      return null;
    }

    const app = response.data.data;
    return {
      appId: app.id,
      merchantId: app.merchantId,
      subdomain: app.subdomain
    };
  } catch {
    return null;
  }
}
