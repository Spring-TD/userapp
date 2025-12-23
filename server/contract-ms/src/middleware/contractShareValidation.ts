import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

const shareContractSchema = Joi.object({
  email: Joi.string().trim().email().optional().messages({
    'string.email': 'Please provide a valid email address'
  }),
  phone: Joi.string().trim().optional().messages({
    'string.base': 'Phone number must be a string'
  }),
  recipientName: Joi.string().trim().max(200).optional().messages({
    'string.max': 'Recipient name cannot exceed 200 characters'
  }),
  message: Joi.string().trim().max(500).optional().messages({
    'string.max': 'Custom message cannot exceed 500 characters'
  })
}).custom((value, helpers) => {
  // At least one contact method must be provided
  if (!value.email && !value.phone) {
    return helpers.error('any.required', {
      message: 'At least one contact method (email or phone) is required'
    });
  }
  return value;
});

export const validateShareContract = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { error } = shareContractSchema.validate(req.body);

  if (error) {
    res.status(400).json({
      success: false,
      error: error.details[0].message,
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
};
