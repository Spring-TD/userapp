import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

// Placeholder for validation middleware
// Will be implemented in task 4: Core data models and validation schemas

export const validate = (_schema: Joi.ObjectSchema) => {
  return (_req: Request, _res: Response, next: NextFunction) => {
    // To be implemented
    next();
  };
};