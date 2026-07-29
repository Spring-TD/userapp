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

/** GET /api/v1/applications/internal/:localApplicationId/applicant-profile (Plata integrator pull). */
function isApplicantProfilePull(path: string, method: string): boolean {
  if (method !== 'GET') return false;
  return /^\/api\/v1\/applications\/internal\/[^/]+\/applicant-profile\/?$/.test(path);
}

/**
 * Verifies PLATA_PUBLIC_KEY / PLATA_SECRET_KEY against Plata service-auth-ms for integrator
 * applicant-profile pulls (mirror of Plata account-ms merchantGatewayAuth).
 */
export async function plataIntegratorGatewayAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (req.method === 'OPTIONS') {
    next();
    return;
  }

  const path = req.path || '';
  if (!isApplicantProfilePull(path, req.method)) {
    next();
    return;
  }

  const publicKey = (req.header('PLATA_PUBLIC_KEY') || '').trim();
  const secretKey = (req.header('PLATA_SECRET_KEY') || '').trim();

  if (!publicKey || !secretKey) {
    res.status(401).json({
      success: false,
      error: 'Merchant API authentication required',
      message:
        'Send PLATA_PUBLIC_KEY and PLATA_SECRET_KEY. Keys are verified at the gateway (API key + IP policy).'
    });
    return;
  }

  const serviceAuthUrl = config.plataServiceAuthUrl.trim();
  const internalToken = config.plataServiceAuthInternalToken.trim();
  if (!serviceAuthUrl || !internalToken) {
    res.status(503).json({
      success: false,
      error:
        'Plata integrator gateway auth is not configured (set PLATA_SERVICE_AUTH_URL and PLATA_SERVICE_AUTH_INTERNAL_TOKEN)'
    });
    return;
  }

  const clientIp = getClientIp(req);

  try {
    const response = await axios.post<{
      success?: boolean;
      data?: { merchant_id: string; merchant_name?: string; api_key_id: string; environment: string };
      error?: string;
    }>(
      `${serviceAuthUrl.replace(/\/+$/, '')}/internal/api/v1/gateway/verify`,
      {
        public_key: publicKey,
        secret_key: secretKey,
        client_ip: clientIp || 'unknown'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': internalToken
        },
        timeout: 10_000,
        validateStatus: () => true
      }
    );

    if (response.status !== 200 || !response.data?.success || !response.data?.data) {
      const errMsg =
        (response.data && typeof response.data === 'object' && 'error' in response.data
          ? (response.data as { error?: string }).error
          : null) || 'Gateway authentication failed';
      res.status(response.status >= 400 && response.status < 600 ? response.status : 401).json({
        success: false,
        error: errMsg
      });
      return;
    }

    req.gatewayMerchantAuth = {
      merchantId: response.data.data.merchant_id,
      merchantName: response.data.data.merchant_name || response.data.data.merchant_id,
      apiKeyId: response.data.data.api_key_id,
      environment: response.data.data.environment
    };
    next();
  } catch (err) {
    const message = axios.isAxiosError(err) ? err.message : 'Plata gateway auth service unavailable';
    res.status(503).json({
      success: false,
      error: message
    });
  }
}
