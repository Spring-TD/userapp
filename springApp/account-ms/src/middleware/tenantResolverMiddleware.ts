import axios from 'axios';
import { NextFunction, Request, Response } from 'express';
import { config } from '../config/environment';
import { TenantContext, TenantRequest } from '../types/tenant';

type ResolvedAppResponse = {
  success: boolean;
  data?: {
    id: string;
    merchantId: string;
    subdomain: string;
    status: string;
  };
  error?: string;
};

function normalizeHost(host: string): string {
  const value = host.split(',')[0].trim().toLowerCase();
  return value.split(':')[0];
}

function extractHost(req: Request): string {
  const forwardedHost = req.headers['x-forwarded-host'];
  const rawHost = Array.isArray(forwardedHost)
    ? forwardedHost[0]
    : forwardedHost || req.headers.host || '';
  return normalizeHost(rawHost);
}

function isIpAddress(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

function extractTenantSubdomain(host: string): string | null {
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

  let label = host.slice(0, -suffix.length);
  if (!label) {
    return null;
  }

  const expectedPrefix = config.platformSubdomainPrefix.trim().toLowerCase();
  if (expectedPrefix) {
    const prefixWithDot = `${expectedPrefix}.`;
    if (!label.startsWith(prefixWithDot)) {
      return null;
    }
    label = label.slice(prefixWithDot.length);
  }

  if (!label || label.includes('.')) {
    return null;
  }

  if (config.reservedSubdomains.includes(label)) {
    return null;
  }

  return label;
}

export const tenantResolverMiddleware = async (
  req: Request & TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const host = extractHost(req);
    const subdomain = extractTenantSubdomain(host);

    if (!subdomain) {
      return next();
    }

    const response = await axios.get<ResolvedAppResponse>(
      `${config.createAppServiceUrl}/api/v1/apps/resolve/${encodeURIComponent(subdomain)}`,
      { timeout: config.tenantResolverTimeoutMs }
    );

    if (!response.data?.success || !response.data?.data) {
      res.status(502).json({ error: 'Failed to resolve tenant context' });
      return;
    }

    const app = response.data.data;
    const tenant: TenantContext = {
      appId: app.id,
      merchantId: app.merchantId,
      subdomain: app.subdomain
    };
    req.tenant = tenant;
    next();
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 404) {
        res.status(404).json({ error: 'Unknown tenant subdomain' });
        return;
      }
      if (status === 410) {
        res.status(410).json({ error: 'Tenant app is suspended' });
        return;
      }
    }

    res.status(502).json({ error: 'Tenant resolution service unavailable' });
  }
};
