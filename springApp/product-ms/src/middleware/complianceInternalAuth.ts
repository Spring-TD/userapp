import { Request, Response, NextFunction } from 'express';
import { config } from '../config/environment';

/**
 * Validates X-Internal-Token for compliance-ms → product-ms internal calls.
 * Must match compliance-ms COMPLIANCE_WALLET_INTERNAL_TOKEN.
 */
export function complianceInternalTokenAuth(req: Request, res: Response, next: NextFunction): void {
  const expected = config.complianceWalletInternalToken;
  if (!expected) {
    res.status(503).json({
      success: false,
      error: 'Internal guarantor notification route is not configured (set COMPLIANCE_WALLET_INTERNAL_TOKEN)'
    });
    return;
  }
  const token = String(req.headers['x-internal-token'] ?? '').trim();
  if (token !== expected) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }
  next();
}
