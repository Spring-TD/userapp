// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { UserType } from '../types/kycTypes';

type AuthTokenPayload = {
  userId: string;
  userType: UserType;
  email?: string;
  userMerchantId?: string;
  type?: string;
  iat: number;
  exp: number;
};

const verifyUserToken = (token: string): AuthTokenPayload => {
  const primarySecret = process.env.JWT_SECRET || 'default-secret-key';

  try {
    return jwt.verify(token, primarySecret) as AuthTokenPayload;
  } catch {
    // Fall through to client-auth verification so gateway-issued login tokens work.
  }

  const clientAuthSecret = process.env.CLIENT_AUTH_JWT_SECRET || primarySecret;
  return jwt.verify(token, clientAuthSecret, {
    issuer: 'client-auth-ms',
    audience: 'user'
  }) as AuthTokenPayload;
};

// Extend the Request type to include user information
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        userType: UserType;
        email?: string;
        userMerchantId?: string;
        token?: string;
      };
    }
  }
}

// Middleware to authenticate requests
export const authenticate = (req: Request, res: Response, next: NextFunction): any => {
  try {
    // If service authentication already succeeded, allow the request
    if (req.service) {
      return next();
    }
    
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication failed - No token provided or invalid format');
      return res.status(401).json({
        success: false,
        error: 'Authentication required - No token provided'
      });
    }
    
    // Extract token
    const token = authHeader.split(' ')[1];
    
    // Verify token. Accept both compliance-native tokens and client-auth-ms access tokens.
    const decoded = verifyUserToken(token);
    
    // Attach user to request
    req.user = {
      userId: decoded.userId,
      userType: decoded.userType,
      email: decoded.email,
      userMerchantId: decoded.userMerchantId,
      token
    };
    
    return next();
  } catch (error) {
    logger.error('Authentication failed - Invalid token', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return res.status(401).json({
      success: false,
      error: 'Authentication failed - Invalid token'
    });
  }
};

// Middleware to check if user is admin
export const isAdmin = (req: Request, res: Response, next: NextFunction): any => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      logger.warn('Admin access denied - User not authenticated');
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    // Check if user is admin
    // In a real implementation, this would check the user's role in the database
    if (req.user.userType !== UserType.ADMIN) { 
      logger.warn(`Admin access denied for user ${req.user.userId}`);
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    
    return next();
  } catch (error) {
    logger.error('Error in admin middleware', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Middleware to check if user is merchant
export const isMerchant = (req: Request, res: Response, next: NextFunction): any => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      logger.warn('Merchant access denied - User not authenticated');
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    // Check if user is merchant
    // In a real implementation, this would check the user's role in the database
    if (req.user.userType !== UserType.MERCHANT) {
      logger.warn(`Merchant access denied for user ${req.user.userId}`);
      return res.status(403).json({
        success: false,
        error: 'Merchant access required'
      });
    }
    
    return next();
  } catch (error) {
    logger.error('Error in merchant middleware', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Middleware to check if user is individual
export const isIndividual = (req: Request, res: Response, next: NextFunction): any => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      logger.warn('Individual access denied - User not authenticated');
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    // Check if user is individual
    // In a real implementation, this would check the user's role in the database
    if (req.user.userType !== UserType.INDIVIDUAL) {
      logger.warn(`Individual access denied for user ${req.user.userId}`);
      return res.status(403).json({
        success: false,
        error: 'Individual access required'
      });
    }
    
    return next();
  } catch (error) {
    logger.error('Error in individual middleware', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};