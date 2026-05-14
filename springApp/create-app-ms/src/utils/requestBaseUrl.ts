import { Request } from 'express';

/**
 * Scheme + host for this service, used to build absolute PWA artifact URLs.
 * Returns null when Host is missing (avoid failing public endpoints).
 */
export function tryGetApiBaseUrl(req: Request): string | null {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto || req.protocol;
  const host = req.get('host');
  if (!host) {
    return null;
  }
  return `${proto}://${host}`;
}
