import type { Request, Response } from 'express';
import axios from 'axios';
import { config } from '../config/environment';
import type { TenantContext, TenantRequest } from '../types/tenant';

const manifestUpstreamTimeoutMs = Math.max(config.tenantResolverTimeoutMs, 15000);

/**
 * Proxies create-app-ms published runtime manifest for a resolved tenant.
 * Used for both `/manifest.webmanifest` and tenant `GET /` (same JSON body).
 */
async function proxyTenantManifestToResponse(tenant: TenantContext, res: Response): Promise<void> {
  const url = `${config.createAppServiceUrl}/api/v1/apps/${encodeURIComponent(tenant.appId)}/pwa/manifest.webmanifest`;
  try {
    const response = await axios.get(url, {
      timeout: manifestUpstreamTimeoutMs,
      validateStatus: () => true,
      headers: { Accept: 'application/manifest+json, application/json, */*' }
    });

    if (response.status === 404) {
      res
        .status(404)
        .json(
          typeof response.data === 'object' && response.data !== null
            ? response.data
            : { error: 'Manifest not published for this app' }
        );
      return;
    }

    if (response.status >= 400) {
      res
        .status(response.status)
        .json(
          typeof response.data === 'object' && response.data !== null
            ? response.data
            : { error: 'Failed to load manifest' }
        );
      return;
    }

    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.status(200).json(response.data);
  } catch (err) {
    console.error('proxyTenantManifestToResponse upstream error', err);
    res.status(502).json({ error: 'Failed to load manifest' });
  }
}

/**
 * Same-origin manifest for tenant hosts (e.g. www.{subdomain}.{platform}).
 * Proxies create-app-ms published runtime manifest so the browser can load
 * `/manifest.webmanifest` without knowing the internal app id.
 */
export async function tenantManifestWebmanifest(req: Request & TenantRequest, res: Response): Promise<void> {
  const tenant = req.tenant;
  if (!tenant) {
    res.status(404).json({ error: 'Route not found' });
    return;
  }

  await proxyTenantManifestToResponse(tenant, res);
}

/**
 * Gateway root: JSON status on non-tenant hosts.
 * On tenant hosts (after tenantResolverMiddleware), serves the published PWA manifest JSON
 * immediately—same body as `/manifest.webmanifest`.
 */
export async function tenantRootOrGatewayStatus(req: Request & TenantRequest, res: Response): Promise<void> {
  const tenant = req.tenant;
  if (!tenant) {
    res.status(200).json({
      service: 'Account Management Microservice',
      status: 'Running',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/health',
        api: '/api/v1',
        apiDocs: '/api-docs'
      }
    });
    return;
  }

  await proxyTenantManifestToResponse(tenant, res);
}
