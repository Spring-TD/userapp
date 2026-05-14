// src/middleware/serviceAuth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

// Extend the Request type to include service information
declare global {
  namespace Express {
    interface Request {
      service?: {
        serviceId: string;
        serviceName: string;
        permissions: string[];
        token?: string;
      };
    }
  }
}

// Middleware to authenticate service-to-service requests
export const authenticateService = (req: Request, res: Response, next: NextFunction): any => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Not a service token, continue to user authentication
      return next();
    }
    
    // Extract token
    const token = authHeader.split(' ')[1];
    
    // Legacy static service token support
    if (token.startsWith('sams_')) {
      req.service = {
        serviceId: 'mock-service-id',
        serviceName: 'auth-service',
        permissions: ['read', 'write'],
        token
      };
      
      logger.info('Service-to-service authentication successful', {
        serviceId: req.service.serviceId,
        serviceName: req.service.serviceName
      });
      
      return next();
    }

    // JWT-based service token support (signed with shared JWT_SECRET)
    const secret = process.env.JWT_SECRET || 'default-secret-key';
    const decoded = jwt.verify(token, secret) as {
      type?: string;
      serviceId?: string;
      serviceName?: string;
      permissions?: string[];
    };
    if (decoded?.type === 'service' && decoded.serviceId) {
      req.service = {
        serviceId: decoded.serviceId,
        serviceName: decoded.serviceName || decoded.serviceId,
        permissions: Array.isArray(decoded.permissions) ? decoded.permissions : ['read', 'write'],
        token
      };
      logger.info('JWT service authentication successful', {
        serviceId: req.service.serviceId,
        serviceName: req.service.serviceName
      });
      return next();
    }
    
    // If it's not a service credential, continue to user authentication
    return next();
  } catch (error) {
    logger.error('Service authentication error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    // Continue to user authentication
    return next();
  }
};