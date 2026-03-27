import type { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { config } from '../config/environment';

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const first = forwarded.split(',')[0];
    return (first && first.trim()) || req.ip || req.socket.remoteAddress || '';
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    const first = forwarded[0].split(',')[0];
    return (first && first.trim()) || req.ip || req.socket.remoteAddress || '';
  }
  return req.ip || req.socket.remoteAddress || '';
}

const EXEMPT_PATH_PREFIXES = [
  '/health',
  '/api-docs',
  '/api/v1/auth',
  '/api/v1/registration',
  '/api/v1/otp',
  '/api/v1/password',
  '/api/v1/user',
  '/api/v1/roles',
  '/verify-email',
];

/** Only GET /api/v1/products (unscoped full catalog) requires merchant API keys at the gateway. */
function isGetUnscopedProductList(path: string, method: string): boolean {
  if (method !== 'GET') return false;
  return path === '/api/v1/products' || path === '/api/v1/products/';
}

/**
 * Merchant API keys (pk/sk) + IP allowlist are enforced only for GET /api/v1/products (full product list).
 * Merchant-scoped routes (e.g. /api/v1/products/app/:appId), configurations, and all other paths skip gateway key verification.
 * Exempt paths skip this middleware entirely for docs, health, and client-auth flows.
 */
export async function merchantGatewayAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.method === 'OPTIONS') {
    next();
    return;
  }

  const path = req.path || '';

  if (path === '/' || path === '/health') {
    next();
    return;
  }

  if (path.startsWith('/api-docs')) {
    next();
    return;
  }

  for (const prefix of EXEMPT_PATH_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      next();
      return;
    }
  }

  if (!isGetUnscopedProductList(path, req.method)) {
    next();
    return;
  }

  const publicKey = (req.header('X-Public-Key') || req.header('x-public-key') || '').trim();
  const secretKey = (req.header('X-Secret-Key') || req.header('x-secret-key') || '').trim();

  if (!publicKey || !secretKey) {
    res.status(401).json({
      success: false,
      error: 'Merchant API authentication required',
      message: 'Send X-Public-Key and X-Secret-Key. Keys are verified at the gateway (API key + IP policy).',
    });
    return;
  }

  const clientIp = getClientIp(req);

  try {
    const response = await axios.post<{
      success?: boolean;
      data?: { merchant_id: string; api_key_id: string; environment: string };
      error?: string;
    }>(
      `${config.serviceAuthUrl}/internal/api/v1/gateway/verify`,
      {
        public_key: publicKey,
        secret_key: secretKey,
        client_ip: clientIp || 'unknown',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': config.serviceAuthInternalToken,
        },
        timeout: 10_000,
        validateStatus: () => true,
      }
    );

    if (response.status !== 200 || !response.data?.success || !response.data?.data) {
      const errMsg =
        (response.data && typeof response.data === 'object' && 'error' in response.data
          ? (response.data as { error?: string }).error
          : null) || 'Gateway authentication failed';
      res.status(response.status >= 400 && response.status < 600 ? response.status : 401).json({
        success: false,
        error: errMsg,
      });
      return;
    }

    req.gatewayMerchantAuth = {
      merchantId: response.data.data.merchant_id,
      apiKeyId: response.data.data.api_key_id,
      environment: response.data.data.environment,
    };
    next();
  } catch (err) {
    const message = axios.isAxiosError(err) ? err.message : 'Gateway auth service unavailable';
    res.status(503).json({
      success: false,
      error: message,
    });
  }
}
