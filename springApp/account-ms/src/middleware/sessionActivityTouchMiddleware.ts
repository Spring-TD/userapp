import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { config } from '../config/environment';

/**
 * Paths that must not trigger a session touch (bootstrap / recursion / logout).
 */
const SKIP_PATH_SUFFIXES = [
  '/api/v1/auth/login',
  '/api/v1/auth/refresh',
  '/api/v1/auth/verify-token',
  '/api/v1/auth/logout',
  '/api/v1/auth/verify-account',
  '/health',
];

/** In-memory throttle so busy UIs do not POST verify-token on every click. */
const TOUCH_THROTTLE_MS = 30_000;
const lastTouchByToken = new Map<string, number>();
const MAX_TOUCH_CACHE = 5_000;

function shouldSkipSessionTouch(req: Request): boolean {
  const url = (req.originalUrl || req.url || '').split('?')[0].toLowerCase();
  return SKIP_PATH_SUFFIXES.some((suffix) => url === suffix || url.endsWith(suffix));
}

function tokenTouchKey(authHeader: string): string {
  // Avoid storing full JWTs; last ~48 chars are enough to key the throttle map.
  return authHeader.length <= 48 ? authHeader : authHeader.slice(-48);
}

function recentlyTouched(authHeader: string): boolean {
  const key = tokenTouchKey(authHeader);
  const last = lastTouchByToken.get(key);
  const now = Date.now();
  if (last !== undefined && now - last < TOUCH_THROTTLE_MS) {
    return true;
  }
  if (lastTouchByToken.size >= MAX_TOUCH_CACHE) {
    lastTouchByToken.clear();
  }
  lastTouchByToken.set(key, now);
  return false;
}

/**
 * Best-effort idle heartbeat: when the client sends a Bearer access token on any
 * gateway request (products, apps, wallets, etc.), notify client-auth-ms so
 * `last_active_at` advances. Without this, local JWT verification on upstream
 * services never updates the session and active users hit SESSION_IDLE_TIMEOUT
 * / hard JWT expiry as if they were idle.
 *
 * Fire-and-forget so proxy latency is unchanged. Idle revoke still applies on
 * refresh and on services that await verify-token.
 */
export function sessionActivityTouchMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (
    typeof authHeader === 'string' &&
    authHeader.startsWith('Bearer ') &&
    !shouldSkipSessionTouch(req) &&
    !recentlyTouched(authHeader)
  ) {
    void axios
      .post(
        `${config.clientAuthServiceUrl}/api/v1/auth/verify-token`,
        {},
        {
          headers: { Authorization: authHeader },
          timeout: 2500,
          validateStatus: () => true,
        }
      )
      .catch(() => {
        /* ignore — heartbeat must never block or fail the proxied request */
      });
  }
  next();
}
