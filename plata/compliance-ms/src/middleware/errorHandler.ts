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