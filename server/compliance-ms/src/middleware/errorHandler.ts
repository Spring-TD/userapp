// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Global error handler middleware
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Global error handler: ${err.message}`, {
    error: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  // Set default error values
  const errorStatus = err.status || 500;
  const errorMessage = err.message || 'Internal server error';
  
  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const validationErrors = Object.values(err.errors).map(error => error.message);
    
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: validationErrors
    });
    return;
  }
  
  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    res.status(400).json({
      success: false,
      error: 'Duplicate key error',
      details: 'A document with this unique value already exists'
    });
    return;
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: 'Authentication failed - Invalid token'
    });
    return;
  }
  
  // Handle other errors
  res.status(errorStatus).json({
    success: false,
    error: errorMessage,
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

// src/middleware/cors.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { CORS_ALLOWED_ORIGINS } from '../config/environment';

// CORS middleware
export const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Set CORS headers
  res.header('Access-Control-Allow-Origin', CORS_ALLOWED_ORIGINS);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
};