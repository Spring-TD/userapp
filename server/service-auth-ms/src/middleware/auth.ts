import { Request, Response, NextFunction } from 'express';

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
};