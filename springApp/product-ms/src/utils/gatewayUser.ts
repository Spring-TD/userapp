import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';

export type GatewayUser = { userId: string; email: string };

/**
 * Read merchant/user identity from `Authorization: Bearer` when the token is a client-auth-ms access JWT.
 * Returns null if missing, invalid, or wrong type.
 */
export function getAccessTokenUser(req: Request): GatewayUser | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    return null;
  }
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as {
      type?: string;
      userId?: string;
      email?: string;
    };
    if (decoded.type !== 'access' || !decoded.userId || !decoded.email) {
      return null;
    }
    return { userId: String(decoded.userId), email: String(decoded.email) };
  } catch {
    return null;
  }
}
