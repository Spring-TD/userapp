import { Request, Response, NextFunction } from 'express';
import { ObjectSchema } from 'joi';

declare global {
  namespace Express {
    interface Request {
      validatedBody?: any;
    }
  }
}

export const validate = (schema: ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
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