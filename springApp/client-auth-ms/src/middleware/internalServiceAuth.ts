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
  const jwtSecret = stripSurroundingQuotes(config.jwt.secret || '');
  const legacy = stripSurroundingQuotes(config.clientAuthInternalToken || '');
  if (jwtSecret) tokens.add(jwtSecret);
  if (legacy) tokens.add(legacy);
  return [...tokens];
}

/**
 * Validates X-Internal-Token for trusted service-to-service calls.
 * Accepts JWT_SECRET (preferred) or legacy CLIENT_AUTH_INTERNAL_TOKEN.
 */
export function internalServiceAuth(req: Request, res: Response, next: NextFunction): void {
  const allowed = acceptedInternalTokens();
  if (allowed.length === 0) {
    res.status(503).json({
      success: false,
      error: 'Internal user lookup is not configured (set JWT_SECRET on client-auth-ms)'
    });
    return;
  }

  const token = stripSurroundingQuotes(String(req.headers['x-internal-token'] ?? ''));
  if (!token || !allowed.includes(token)) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  next();
}
