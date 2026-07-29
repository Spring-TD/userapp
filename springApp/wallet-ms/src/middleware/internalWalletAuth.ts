import { Request, Response, NextFunction } from 'express';
import { config } from '../config/environment';

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

function acceptedInternalTokens(): string[] {
  const tokens = new Set<string>();
  const jwtSecret = stripSurroundingQuotes(config.jwtSecret || '');
  const walletInternalToken = stripSurroundingQuotes(config.walletInternalToken || '');
  if (jwtSecret) tokens.add(jwtSecret);
  if (walletInternalToken) tokens.add(walletInternalToken);
  return [...tokens];
}

/**
 * Validates X-Internal-Token for service-to-service wallet internal routes.
 * Accepts JWT_SECRET (preferred) or legacy WALLET_INTERNAL_TOKEN.
 */
export const requireWalletInternalToken = (req: Request, res: Response, next: NextFunction): void => {
  const allowed = acceptedInternalTokens();
  if (allowed.length === 0) {
    res.status(503).json({
      success: false,
      error: 'Internal wallet API is not configured (set JWT_SECRET on wallet-ms)'
    });
    return;
  }

  const provided = stripSurroundingQuotes(req.header('x-internal-token') || '');
  if (!provided || !allowed.includes(provided)) {
    res.status(401).json({
      success: false,
      error: 'Invalid or missing internal token'
    });
    return;
  }

  next();
};
