import { Request, Response, NextFunction } from 'express';
import { ObjectSchema } from 'joi';

declare global {
  namespace Express {
    interface Request {
      validatedBody?: any;
      validatedQuery?: Record<string, unknown>;
    }
  }
}

export const validate = (schema: ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    const { error, value } = schema.validate(req.body, { 
      abortEarly: false,
      stripUnknown: true 
    });
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({
        success: false,
        error: errorMessage
      });
    }
    
    // Attach validated data to request
    req.validatedBody = value;
    next();
  };
};

export const validateQuery = (schema: ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(', ');
      return res.status(400).json({
        success: false,
        error: errorMessage
      });
    }

    req.validatedQuery = value;
    next();
  };
};