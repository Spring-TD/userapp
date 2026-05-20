import cors from 'cors';
import { config } from '../config/environment';
import { extractTenantSubdomainFromHost } from './tenantResolverMiddleware';

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '');
}

function hostFromOrigin(origin: string): string | null {
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }

  const normalized = normalizeOrigin(origin);
  const staticOrigins = config.corsOrigins.map((value) => normalizeOrigin(value));
  if (staticOrigins.includes(normalized)) {
    return true;
  }

  const host = hostFromOrigin(normalized);
  if (!host) {
    return false;
  }

  return extractTenantSubdomainFromHost(host) !== null;
}

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Tenant-Host']
});
