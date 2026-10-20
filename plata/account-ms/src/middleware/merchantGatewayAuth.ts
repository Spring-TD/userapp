import type { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { config } from '../config/environment';
import {
  isExternalApplicationServicingRoute,
  isGetUnscopedProductCatalog
} from '../utils/productGatewayRoute';
import { isWalletReadRoute } from '../utils/walletGatewayRoute';

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
  '/docs',
  '/frontendplata',
  '/api/v1/auth',
  '/api/v1/registration',
  '/api/v1/otp',
  '/api/v1/password',
  '/api/v1/user',
  '/api/v1/roles',
  '/api/v1/invitations',
  '/api/v1/team',
  '/verify-email',
];

function isPostSubMerchantActivations(path: string, method: string): boolean {
  if (method !== 'POST') return false;
  return (
    path === '/api/v1/products/sub-merchant-activations' ||
    path === '/api/v1/products/sub-merchant-activations/'
  );
}

function isPostSubMerchantUsageEvents(path: string, method: string): boolean {
  if (method !== 'POST') return false;
  return (
    path === '/api/v1/products/sub-merchant-usage-events' ||
    path === '/api/v1/products/sub-merchant-usage-events/'
  );
}

function isPostExternalProductApplications(path: string, method: string): boolean {
  if (method !== 'POST') return false;
  return (
    path === '/api/v1/products/external-applications' ||
    path === '/api/v1/products/external-applications/'
  );
}

function isPostExternalProductAccounts(path: string, method: string): boolean {
  if (method !== 'POST') return false;
  return (
    path === '/api/v1/products/external-accounts' ||
    path === '/api/v1/products/external-accounts/'
  );
}

function isPostWalletPrincipalSettlement(path: string, method: string): boolean {
  if (method !== 'POST') return false;
  const normalized = path.replace(/\/+$/, '') || '/';
  return (
    normalized === '/api/v1/wallets/investment/principal-settlement' ||
    normalized === '/api/v1/wallets/investment/principal-repayment' ||
    normalized === '/api/v1/wallets/savings/principal-settlement' ||
    normalized === '/api/v1/wallets/savings/principal-repayment' ||
    normalized === '/api/v1/wallets/savings/application-activity' ||
    normalized === '/api/v1/wallets/commodity/principal-settlement' ||
    normalized === '/api/v1/wallets/commodity/principal-repayment' ||
    normalized === '/api/v1/wallets/commodity/maturity-payout' ||
    normalized === '/api/v1/wallets/savings/maturity-payout' ||
    normalized === '/api/v1/wallets/investment/maturity-payout' ||
    normalized === '/api/v1/wallets/commodity/maturity-withdrawal-request' ||
    normalized === '/api/v1/wallets/savings/maturity-withdrawal-request' ||
    normalized === '/api/v1/wallets/investment/maturity-withdrawal-request'
  );
}

function hasBearerAuth(req: Request): boolean {
  const auth = (req.header('Authorization') || '').trim();
  return /^Bearer\s+\S+/i.test(auth);
}

function requiresMerchantGatewayKeys(req: Request): boolean {
  const path = req.path || '';
  const method = req.method;

  // Wallet details/history: dual auth — dashboard JWT or merchant API keys.
  // Only enforce keys when there is no Bearer (integrator / springApp backends).
  if (isWalletReadRoute(path, method)) {
    return !hasBearerAuth(req);
  }

  return (
    isGetUnscopedProductCatalog(req) ||
    isPostSubMerchantActivations(path, method) ||
    isPostSubMerchantUsageEvents(path, method) ||
    isPostExternalProductAccounts(path, method) ||
    isPostExternalProductApplications(path, method) ||
    isExternalApplicationServicingRoute(path, method) ||
    isPostWalletPrincipalSettlement(path, method)
  );
}

/**
 * Merchant API keys (pk/sk) are enforced for:
 * - GET /api/v1/products with no appId (integrator full catalog)
 * - POST /api/v1/products/sub-merchant-activations (sub-merchant activate/deactivate reporting)
 * - POST /api/v1/products/sub-merchant-usage-events (external user started-usage reporting)
 * - POST /api/v1/products/external-accounts (external user/wallet provisioning)
 * - POST /api/v1/products/external-applications (external apply + user/wallet provisioning)
 * - GET /api/v1/products/external-applications/{id}[/offer|/account|/repayment-schedule], POST .../{id}/offer
 * - POST /api/v1/wallets/{investment|savings|commodity}/principal-{settlement|repayment}
 * - POST /api/v1/wallets/commodity/maturity-payout (Treasury debit for Spring maturity credit)
 * - GET merchant/user wallet details/history when called **without** a dashboard Bearer JWT
 * Dashboard JWT wallet reads and GET /api/v1/products?appId=... skip key verification.
 * Other product routes and configurations skip gateway key verification.
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

  if (path.startsWith('/api-docs') || path.startsWith('/docs') || path.startsWith('/frontendplata')) {
    next();
    return;
  }

  for (const prefix of EXEMPT_PATH_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      next();
      return;
    }
  }

  if (!requiresMerchantGatewayKeys(req)) {
    next();
    return;
  }

  const publicKey = (req.header('PLATA_PUBLIC_KEY') || '').trim();
  const secretKey = (req.header('PLATA_SECRET_KEY') || '').trim();

  if (!publicKey || !secretKey) {
    res.status(401).json({
      success: false,
      error: 'Merchant API authentication required',
      message: 'Send PLATA_PUBLIC_KEY and PLATA_SECRET_KEY. Keys are verified at the gateway (API key + IP policy).',
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
      const body = response.data as unknown;
      let errMsg: string | undefined;
      if (body && typeof body === 'object') {
        const record = body as { error?: unknown; message?: unknown };
        if (typeof record.error === 'string' && record.error.trim()) {
          errMsg = record.error.trim();
        } else if (typeof record.message === 'string' && record.message.trim()) {
          errMsg = record.message.trim();
        }
      } else if (typeof body === 'string' && body.trim()) {
        errMsg = body.trim();
      }
      if (!errMsg) {
        errMsg =
          response.status === 429
            ? 'Gateway auth rate limited; retry shortly'
            : 'Gateway authentication failed';
      }
      res.status(response.status >= 400 && response.status < 600 ? response.status : 401).json({
        success: false,
        error: errMsg,
      });
      return;
    }

    req.gatewayMerchantAuth = {
      merchantId: response.data.data.merchant_id,
      merchantName: response.data.data.merchant_name || response.data.data.merchant_id,
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
