import type { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      /** Set when request is forwarded from account-ms after PLATA key verification */
      gatewayMerchant?: {
        merchantId: string;
        apiKeyId?: string;
        gatewayEnvironment?: string;
      };
    }
  }
}

/**
 * Requires headers set by account-ms after merchant API key verification.
 * Direct calls to product-ms without the gateway will fail (by design).
 */
export function requireVerifiedGatewayMerchant(req: Request, res: Response, next: NextFunction): void {
  const verified = (req.header('X-Gateway-Verified') || '').trim() === '1';
  const merchantId = (req.header('X-Merchant-Id') || '').trim();
  if (!verified || !merchantId) {
    res.status(401).json({
      success: false,
      error: 'Gateway merchant authentication required',
      message:
        'Call this endpoint through the API gateway with PLATA_PUBLIC_KEY and PLATA_SECRET_KEY so the gateway can verify keys and forward X-Merchant-Id.'
    });
    return;
  }

  const apiKeyId = (req.header('X-Api-Key-Id') || '').trim();
  const gatewayEnvironment = (req.header('X-Gateway-Environment') || '').trim();

  req.gatewayMerchant = {
    merchantId,
    ...(apiKeyId ? { apiKeyId } : {}),
    ...(gatewayEnvironment ? { gatewayEnvironment } : {})
  };
  next();
}
