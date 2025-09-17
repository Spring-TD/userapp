// src/middleware/errorHandler.ts
import { ErrorRequestHandler } from 'express';
import { logger } from '../utils/logger';

// Global error handler
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // Log error
  logger.error('Unhandled error', {
    error: err instanceof Error ? err.message : 'Unknown error',
    stack: err instanceof Error ? err.stack : 'No stack trace'
  });

  // Send error response
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: err instanceof Error ? err.message : 'Unknown error'
  });
};

// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { KYCStatus } from '../types/kycTypes';

// Authentication middleware to verify JWT tokens
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required - No token provided'
      });
    }

    // Extract token
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { 
        userId: string, 
        userType: string, 
        merchantId?: string,
        iat: number,
        exp: number
      };
      
      // Add user info to request
      req.user = {
        userId: decoded.userId,
        userType: decoded.userType as KYCStatus,
        merchantId: decoded.merchantId,
        token
      };
      
      next();
    } catch (error) {
      logger.warn('JWT verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return res.status(401).json({
        success: false,
        error: 'Authentication failed - Invalid token'
      });
    }
  } catch (error) {
    logger.error('Authentication middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return res.status(500).json({
      success: false,
      error: 'Authentication failed - Internal server error'
    });
  }
};

// Role-based authorization middleware
export const isMerchant = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check if user is a merchant
    if (req.user.userType !== 'merchant') {
      logger.warn('Non-merchant attempted to access merchant-only route', {
        userId: req.user?.userId,
        userType: req.user?.userType
      });
      
      return res.status(403).json({
        success: false,
        error: 'Merchant access required'
      });
    }

    next();
  } catch (error) {
    logger.error('Merchant authorization middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return res.status(500).json({
      success: false,
      error: 'Authorization check failed - Internal server error'
    });
  }
};

// Role-based authorization middleware
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // In a real implementation, this would check user roles from the database
    // For now, we'll use a simple implementation
    const ADMIN_USERS = ['admin_user_001', 'super_user_002'];
    
    if (!ADMIN_USERS.includes(req.user.userId)) {
      logger.warn('Non-admin attempted to access admin route', {
        userId: req.user?.userId,
        userType: req.user?.userType
      });
      
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    next();
  } catch (error) {
    logger.error('Admin authorization middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return res.status(500).json({
      success: false,
      error: 'Authorization check failed - Internal server error'
    });
  }
};

// src/middleware/kycValidation.ts
import { Request, Response, NextFunction } from 'express';
import { validateKYCSubmission } from '../utils/validation';
import { logger } from '../utils/logger';

// Validate KYC submission middleware
export const validateKYC = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = validateKYCSubmission(req.body);
    
    if (error) {
      logger.warn('KYC validation failed', {
        error: error.details.map(detail => detail.message)
      });
      
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(detail => detail.message)
      });
    }
    
    req.body = value;
    next();
  } catch (error) {
    logger.error('KYC validation middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return res.status(500).json({
      success: false,
      error: 'Internal server error during KYC validation'
    });
  }
};

// src/middleware/audit.ts
import { Request, Response, NextFunction } from 'express';
import { auditLogger } from '../utils/audit';
import { logger } from '../utils/logger';

// Audit logging middleware
export const auditLog = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Log request
  logger.info(`Request: ${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Log response
  const send = res.send;
  res.send = function (body) {
    const duration = Date.now() - start;
    
    // Log response
    logger.info(`Response: ${req.method} ${req.url}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
      responseSize: Buffer.byteLength(JSON.stringify(body), 'utf8')
    });
    
    return send.call(this, body);
  };
  
  next();
};