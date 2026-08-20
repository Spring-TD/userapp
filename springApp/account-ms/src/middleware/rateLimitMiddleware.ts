import type { Request } from 'express';
import rateLimit, { type Options } from 'express-rate-limit';
import { config } from '../config/environment';

function requestPath(req: Request): string {
  return (req.originalUrl || req.url || '').split('?')[0].toLowerCase();
}

function skipAlways(req: Request): boolean {
  if (!config.rateLimit.enabled || config.nodeEnv === 'test') {
    return true;
  }
  if (req.method === 'OPTIONS') {
    return true;
  }
  const path = requestPath(req);
  return (
    path === '/' ||
    path === '/health' ||
    path.startsWith('/api-docs') ||
    path === '/manifest.webmanifest'
  );
}

const AUTH_SENSITIVE_PATHS: RegExp[] = [
  /^\/api\/v1\/auth\/login\/?$/,
  /^\/api\/v1\/auth\/register\/?$/,
  /^\/api\/v1\/auth\/verify-account\/?$/,
  /^\/api\/v1\/auth\/email-exists\//,
  /^\/api\/v1\/password\/forgot\/?$/,
  /^\/api\/v1\/password\/reset\/?$/,
  /^\/api\/v1\/otp(?:\/|$)/,
  /^\/api\/v1\/registration\/(?:merchant|user|admin)\/?$/,
];

export function isAuthSensitiveRequest(req: Request): boolean {
  if (req.method === 'OPTIONS') {
    return false;
  }
  const path = requestPath(req);
  return AUTH_SENSITIVE_PATHS.some((pattern) => pattern.test(path));
}

const common: Pick<Options, 'standardHeaders' | 'legacyHeaders' | 'windowMs'> = {
  windowMs: config.rateLimit.windowMs,
  standardHeaders: true,
  legacyHeaders: false,
};

/** Broad public-edge cap (SPA + tenant PWA traffic). */
export const generalApiLimiter = rateLimit({
  ...common,
  max: config.rateLimit.maxRequests,
  message: { success: false, error: 'Too many requests from this IP, please try again later.' },
  skip: skipAlways,
});

/**
 * Tight cap for login, signup, OTP, and password-reset probes.
 * Applied in addition to the general limiter.
 */
export const authSensitiveLimiter = rateLimit({
  ...common,
  max: config.rateLimit.authMaxRequests,
  message: {
    success: false,
    error: 'Too many login or verification attempts, please try again later.',
  },
  skip: (req) => skipAlways(req) || !isAuthSensitiveRequest(req),
});
