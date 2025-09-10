import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../utils/crypto';
import { logger } from '../utils/logger';
import { tokenBlacklistService } from '../services/tokenBlacklistService';

// Extend Request interface to include user data
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        userType: string;
        userMerchantId?: string;
        iat?: number;
        exp?: number;
      };
    }
  }
}

/**
 * Authentication middleware to verify JWT tokens
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Access token required',
        message: 'Please provide a valid Bearer token in the Authorization header'
      });
      return;
    }

    const token = extractTokenFromHeader(authHeader);
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Invalid token format',
        message: 'Token must be in Bearer format'
      });
      return;
    }

    // Verify the JWT token
    const decoded = verifyToken(token);
    if (!decoded) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        message: 'The provided token is invalid or has expired'
      });
      return;
    }

    // Check if token is blacklisted
    const isBlacklisted = await tokenBlacklistService.isBlacklisted(token);
    if (isBlacklisted) {
      res.status(401).json({
        success: false,
        error: 'Token has been revoked',
        message: 'This token has been invalidated and cannot be used'
      });
      return;
    }

    // Attach user data to request
    req.user = decoded;
    
    logger.debug('User authenticated successfully', {
      userId: decoded.userId,
      email: decoded.email,
      userType: decoded.userType
    });

    next();
  } catch (error) {
    logger.error('Authentication middleware error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
      message: 'An error occurred during authentication'
    });
  }
};

/**
 * Authorization middleware to check user roles
 */
export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'You must be authenticated to access this resource'
        });
        return;
      }

      if (!allowedRoles.includes(req.user.userType)) {
        logger.warn('Authorization failed - insufficient permissions', {
          userId: req.user.userId,
          userType: req.user.userType,
          requiredRoles: allowedRoles
        });

        res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
        });
        return;
      }

      logger.debug('User authorized successfully', {
        userId: req.user.userId,
        userType: req.user.userType,
        allowedRoles
      });

      next();
    } catch (error) {
      logger.error('Authorization middleware error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      res.status(403).json({
        success: false,
        error: 'Authorization failed',
        message: 'An error occurred during authorization'
      });
    }
  };
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 * Useful for endpoints that work with both authenticated and anonymous users
 */
export const optionalAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = extractTokenFromHeader(authHeader);
      
      if (token) {
        const decoded = verifyToken(token);
        
        if (decoded) {
          // Check if token is blacklisted
          const isBlacklisted = await tokenBlacklistService.isBlacklisted(token);
          
          if (!isBlacklisted) {
            req.user = decoded;
            logger.debug('Optional authentication successful', {
              userId: decoded.userId,
              email: decoded.email
            });
          }
        }
      }
    }
    
    next();
  } catch (error) {
    logger.warn('Optional authentication error, continuing without auth', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    // Continue without authentication for optional auth
    next();
  }
};

/**
 * Admin-only authorization middleware
 */
export const adminOnly = authorize(['ADMIN']);

/**
 * Merchant-only authorization middleware
 */
export const merchantOnly = authorize(['MERCHANT', 'ADMIN']);

/**
 * User or higher authorization middleware
 */
export const userOrHigher = authorize(['USER', 'MERCHANT', 'ADMIN']);

/**
 * Middleware to extract and validate token without full authentication
 * Useful for logout endpoints where we need to blacklist tokens
 */
export const extractToken = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(400).json({
        success: false,
        error: 'Access token required',
        message: 'Please provide a valid Bearer token in the Authorization header'
      });
      return;
    }

    const token = extractTokenFromHeader(authHeader);
    if (!token) {
      res.status(400).json({
        success: false,
        error: 'Invalid token format',
        message: 'Token must be in Bearer format'
      });
      return;
    }

    // Attach token to request for use in controllers
    (req as any).token = token;
    next();
  } catch (error) {
    logger.error('Token extraction error', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    res.status(400).json({
      success: false,
      error: 'Token extraction failed',
      message: 'Unable to extract token from request'
    });
  }
};