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