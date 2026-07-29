import { Request, Response, NextFunction } from 'express';

function stripSurroundingQuotes(s: string): string {
  const t = s.trim();
  if (t.length >= 2) {
    const a = t[0];
    const b = t[t.length - 1];
    if ((a === '"' && b === '"') || (a === "'" && b === "'")) {
      return t.slice(1, -1).trim();
    }
  }
  return t;
}

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

/** Shared internal-token guard for service-to-service compliance routes (product-ms guarantor KYC). */
export function requireServiceInternalToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const expected = stripSurroundingQuotes((process.env.JWT_SECRET || '').trim());
  if (!expected) {
    res.status(503).json({
      success: false,
      error: 'Internal service integration is not configured (JWT_SECRET)'
    });
    return;
  }
  const token = stripSurroundingQuotes((req.header('X-Internal-Token') || '').trim());
  if (token !== expected) {
    res.status(401).json({ success: false, error: 'Unauthorized internal request' });
    return;
  }
  next();
}
