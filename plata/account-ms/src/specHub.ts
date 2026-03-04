/**
 * Spec hub: serves aggregated OpenAPI specs for the gateway Swagger UI dropdown.
 * GET /api-docs/specs/gateway -> gateway's own spec
 * GET /api-docs/specs/:serviceId -> fetches from that microservice's /api-docs.json
 */

import { Request, Response } from 'express';
import axios from 'axios';
import { config } from './config/environment';
import swaggerSpec from './config/swagger';

const SPEC_PATH = '/api-docs.json';

/** Map serviceId (used in URL) to backend base URL */
const SERVICE_URLS: Record<string, string> = {
  'wallet-ms': config.walletServiceUrl,
  'billing-ms': config.billingServiceUrl,
  'client-auth-ms': config.clientAuthServiceUrl,
  'compliance-ms': config.complianceServiceUrl,
  'service-auth-ms': config.serviceAuthUrl,
  'product-ms': config.productServiceUrl,
  'payment-ms': config.paymentServiceUrl,
  'notifications-ms': config.notificationsServiceUrl,
  'create-app-ms': config.createAppServiceUrl,
};

/** Display names for the Swagger UI dropdown */
const SPEC_NAMES: Record<string, string> = {
  'gateway': 'Gateway (API Overview)',
  'wallet-ms': 'Wallet API',
  'billing-ms': 'Billing API',
  'client-auth-ms': 'Client Auth API',
  'compliance-ms': 'Compliance API',
  'service-auth-ms': 'Service Auth API',
  'product-ms': 'Product API',
  'payment-ms': 'Payment API',
  'notifications-ms': 'Notifications API',
  'create-app-ms': 'Create App API',
};

/**
 * Build the list of { url, name } for Swagger UI urls option.
 * Each url is relative to the gateway so the browser loads from same origin.
 */
export function getSpecUrls(basePath: string): { url: string; name: string }[] {
  const entries: { url: string; name: string }[] = [
    { url: `${basePath}/gateway`, name: SPEC_NAMES['gateway'] },
  ];
  Object.keys(SERVICE_URLS).forEach((id) => {
    entries.push({ url: `${basePath}/${id}`, name: SPEC_NAMES[id] || id });
  });
  return entries;
}

/**
 * Handle GET /api-docs/specs/:serviceId
 * Returns gateway spec for "gateway", otherwise fetches from the microservice.
 */
export async function handleSpecRequest(req: Request, res: Response): Promise<void> {
  const serviceId = req.params.serviceId;
  if (!serviceId) {
    res.status(400).json({ error: 'Missing serviceId' });
    return;
  }

  if (serviceId === 'gateway') {
    res.json(swaggerSpec);
    return;
  }

  const baseUrl = SERVICE_URLS[serviceId];
  if (!baseUrl) {
    res.status(404).json({ error: `Unknown service: ${serviceId}` });
    return;
  }

  try {
    const url = `${baseUrl.replace(/\/$/, '')}${SPEC_PATH}`;
    const { data } = await axios.get(url, { timeout: 5000 });
    res.json(data);
  } catch (err: any) {
    const status = err.response?.status || 502;
    const message = err.response?.data?.message || err.message || 'Failed to fetch spec';
    res.status(status).json({ error: message });
  }
}
