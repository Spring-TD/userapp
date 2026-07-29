import jwt from 'jsonwebtoken';
import { config } from '../config/environment';

export type AccessTokenUser = {
  userId: string;
  email: string;
};

export function verifyAccessToken(token: string): AccessTokenUser | null {
  const trimmed = token.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const decoded = jwt.verify(trimmed, config.jwtSecret) as {
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

export function extractBearerToken(authorizationHeader?: string): string | null {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authorizationHeader.slice(7).trim();
  return token || null;
}
