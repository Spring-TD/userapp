import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';

/**
 * JWT Payload Interface
 */
interface JWTPayload {
  userId: string;
  email: string;
  userType: string;
  userMerchantId?: string;
  iat?: number;
  exp?: number;
}

/**
 * Verify JWT token using the same configuration as service-auth-ms
 * @param token - The JWT token to verify
 * @returns The decoded payload or null if invalid
 */
const verifyToken = (token: string): JWTPayload | null => {
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
 * @param authHeader - The Authorization header
 * @returns The token or null if invalid
 */
const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove 'Bearer ' prefix
};

/**
 * Middleware to check if the user is an admin
 * Integrates with the JWT tokens authentication system implemented by service-auth-ms
 */
export default function adminAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access token required',
        error: 'Please provide a valid Bearer token in the Authorization header'
      });
      return;
    }

    const token = extractTokenFromHeader(authHeader);
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Invalid token format',
        error: 'Token must be in Bearer format'
      });
      return;
    }

    // Verify the JWT token
    const decoded = verifyToken(token);
    if (!decoded) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        error: 'The provided token is invalid or has expired'
      });
      return;
    }

    // Check if user is an admin
    const isAdmin = decoded.userType === 'ADMIN';
    
    if (!isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
      return;
    }
    
    // Attach user data to request
    (req as any).user = decoded;
    
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}