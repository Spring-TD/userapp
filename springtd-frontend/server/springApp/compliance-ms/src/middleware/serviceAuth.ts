// src/middleware/serviceAuth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { UserType } from '../types/kycTypes';

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
    
    // For now, we'll implement a simple check for service credentials
    // In a production environment, this would validate against the SAMS service
    if (token.startsWith('sams_')) {
      // This is a service credential
      // In a real implementation, we would validate this against SAMS
      // For now, we'll just attach a mock service object
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