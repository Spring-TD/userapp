// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { KYCStatus } from '../types/kycTypes';

// Middleware to authenticate requests
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
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
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
    
    // Attach user to request
    req.user = decoded;
    
    next();
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
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
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
    if (req.user.userType !== 'admin') {
      logger.warn(`Admin access denied for user ${req.user.userId}`);
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    
    next();
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
export const isMerchant = (req: Request, res: Response, next: NextFunction) => {
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
    if (req.user.userType !== 'merchant') {
      logger.warn(`Merchant access denied for user ${req.user.userId}`);
      return res.status(403).json({
        success: false,
        error: 'Merchant access required'
      });
    }
    
    next();
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
export const isIndividual = (req: Request, res: Response, next: NextFunction) => {
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
    if (req.user.userType !== 'individual') {
      logger.warn(`Individual access denied for user ${req.user.userId}`);
      return res.status(403).json({
        success: false,
        error: 'Individual access required'
      });
    }
    
    next();
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