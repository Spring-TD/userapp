import type { Request, Response, NextFunction } from 'express';
import { authenticate } from './auth';
import { requireVerifiedGatewayMerchant } from './gatewayMerchantAuth';

/**
 * Accept either a dashboard JWT or gateway-forwarded merchant API keys.
 * Gateway path sets `req.gatewayMerchant` and a synthetic owner `req.user` so
 * existing authorizeMerchant / requirePermission (isOwner) checks still pass.
 * Controllers must still enforce path merchantId / user-wallet ownership.
 */
export async function authenticateJwtOrGatewayMerchant(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const verified = (req.header('X-Gateway-Verified') || '').trim() === '1';
  const merchantId = (req.header('X-Merchant-Id') || '').trim();

  if (verified && merchantId) {
    requireVerifiedGatewayMerchant(req, res, (err?: unknown) => {
      if (err) {
        next(err);
        return;
      }
      if (res.headersSent) return;
      req.user = {
        userId: `gateway-key:${merchantId}`,
        email: '',
        userType: 'MERCHANT',
        merchantId,
        isOwner: true,
        permissions: []
      };
      next();
    });
    return;
  }

  await authenticate(req, res, next);
}

/** When the path has :merchantId, gateway keys may only read their own merchant. */
export function requirePathMerchantMatchesGateway(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const pathMerchantId = String(req.params.merchantId || '').trim();
  if (!pathMerchantId || !req.gatewayMerchant) {
    next();
    return;
  }
  if (req.gatewayMerchant.merchantId !== pathMerchantId) {
    res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'merchantId must match the merchant on your API keys'
    });
    return;
  }
  next();
}
