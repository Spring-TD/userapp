import { Request, Response, NextFunction } from 'express';
<<<<<<< HEAD
import { verifyToken, JWTPayload } from '../utils/crypto';
import { logger } from '../utils/logger';
import { tokenBlacklistService } from '../services/tokenBlacklistService';

// Extend Request interface to include user data
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
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
        error: 'Access token required'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = verifyToken(token);

    if (!decoded) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
      return;
    }

    // Check if token is blacklisted
    const isBlacklisted = await tokenBlacklistService.isBlacklisted(token);
    if (isBlacklisted) {
      res.status(401).json({
        success: false,
        error: 'Token has been revoked'
      });
      return;
    }

    // Attach user data to request
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Authentication middleware error', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(401).json({
      success: false,
      error: 'Authentication failed'
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
          error: 'Authentication required'
        });
        return;
      }

      if (!allowedRoles.includes(req.user.userType)) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Authorization middleware error', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(403).json({
        success: false,
        error: 'Authorization failed'
      });
    }
  };
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      
      if (decoded) {
        req.user = decoded;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
=======

// Placeholder for authentication middleware
// Will be implemented in task 5: Authentication utilities and JWT management

export const authenticate = (_req: Request, _res: Response, next: NextFunction) => {
  // To be implemented
  next();
};

export const authorize = (_roles: string[]) => {
  return (_req: Request, _res: Response, next: NextFunction) => {
    // To be implemented
    next();
  };
>>>>>>> 61b77a379aa21ff00899f7fb6df7b19f71b6190b
};