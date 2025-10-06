import { Request, Response, NextFunction } from 'express';

export interface ErrorResponse {
  success: boolean;
  error: string;
  details?: any;
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error occurred:', err);
  
  // Default error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: 'Internal server error'
  };
  
  // Handle specific error types
  if (err.isJoi) {
    errorResponse.error = 'Validation error';
    errorResponse.details = err.details.map((detail: any) => detail.message);
    res.status(400);
  } else if (err.name === 'UnauthorizedError') {
    errorResponse.error = 'Unauthorized';
    res.status(401);
  } else if (err.name === 'NotFoundError') {
    errorResponse.error = 'Not found';
    res.status(404);
  } else {
    res.status(500);
  }
  
  res.json(errorResponse);
};

export const notFoundHandler = (
  req: Request,
  res: Response
): void => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
};