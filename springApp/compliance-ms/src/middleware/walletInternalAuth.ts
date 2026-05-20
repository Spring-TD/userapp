import { Request, Response, NextFunction } from 'express';

/**
 * Validates X-Internal-Token for wallet-ms → compliance-ms calls (Payonus BVN lookup).
 * Must match wallet-ms COMPLIANCE_WALLET_INTERNAL_TOKEN.
 */
export function walletInternalTokenAuth(req: Request, res: Response, next: NextFunction): void {
  const expected = (process.env.COMPLIANCE_WALLET_INTERNAL_TOKEN || '').trim();
  if (!expected) {
    res.status(503).json({
      success: false,
      error: 'Internal shareholder BVN lookup is not configured (set COMPLIANCE_WALLET_INTERNAL_TOKEN)'
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
