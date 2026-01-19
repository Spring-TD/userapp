import jwt from 'jsonwebtoken';
import { config } from '../config/environment';

/**
 * JWT Token Payload Interface
 */
export interface JWTPayload {
  userId: string;
  email: string;
  userType: string;
  userMerchantId?: string;
  iat?: number;
  exp?: number;
}

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): JWTPayload | null => {
  try {
    const decoded = jwt.verify(token, config.jwtSecret, {
      issuer: 'service-auth-ms',
      audience: 'client-app'
    }) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Extract token from Authorization header
 */
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove 'Bearer ' prefix
};