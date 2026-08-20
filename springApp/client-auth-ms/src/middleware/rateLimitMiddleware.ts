import type { Request } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config/environment';

function requestPath(req: Request): string {
  return (req.originalUrl || req.url || '').split('?')[0].toLowerCase();
}

const LOGIN_SENSITIVE_PATHS: RegExp[] = [
  /^\/api\/v1\/auth\/login\/?$/,
  /^\/api\/v1\/auth\/register\/?$/,
  /^\/api\/v1\/auth\/verify-account\/?$/,
  /^\/api\/v1\/auth\/email-exists\//,
  /^\/api\/v1\/password\/forgot\/?$/,
  /^\/api\/v1\/password\/reset\/?$/,
  /^\/api\/v1\/otp(?:\/|$)/,
  /^\/api\/v1\/registration\/(?:merchant|user|admin)\/?$/,
];

export function isLoginSensitiveRequest(req: Request): boolean {
  if (req.method === 'OPTIONS') {
    return false;
  }
  const path = requestPath(req);
  return LOGIN_SENSITIVE_PATHS.some((pattern) => pattern.test(path));
}

function skipLoginLimiter(req: Request): boolean {
  if (!config.rateLimit.enabled || config.nodeEnv === 'test') {
    return true;
  }
  const path = requestPath(req);
  if (path === '/health' || path.startsWith('/api-docs') || path.startsWith('/internal/')) {
    return true;
  }
  return !isLoginSensitiveRequest(req);
}

/**
 * Defense in depth for login / OTP / password-reset when client-auth is hit
 * directly (Fly hostname) as well as through account-ms.
 */
export const loginSensitiveLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.loginMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many login or verification attempts, please try again later.',
  },
  skip: skipLoginLimiter,
});
