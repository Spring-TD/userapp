// src/middleware/sanctionsValidation.ts
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../utils/logger';

// Validation schema for sanctions check request
const sanctionsCheckSchema = Joi.object({
  name: Joi.string().required().trim().min(1).max(255).messages({
    'string.empty': 'Name is required',
    'any.required': 'Name is required',
    'string.min': 'Name must be at least 1 character long',
    'string.max': 'Name must be less than 255 characters long'
  }),
  companyId: Joi.string().trim().max(100).optional().messages({
    'string.max': 'Company ID must be less than 100 characters long'
  }),
  country: Joi.string().trim().length(2).optional().messages({
    'string.length': 'Country must be a 2-letter ISO country code'
  })
});

/**
 * Middleware to validate sanctions check request
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export const validateSanctionsCheck = (req: Request, res: Response, next: NextFunction) => {
  const { error } = sanctionsCheckSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    logger.warn('Sanctions check validation failed', {
      errors: error.details.map(detail => detail.message)
    });
    
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.details.map(detail => detail.message)
    });
  }
  
  next();
};