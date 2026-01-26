import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { ContractTypeEnum } from '../types/contractType';

const contractToSchema = Joi.object({
  fullName: Joi.string().trim().max(200).optional(),
  email: Joi.string().trim().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required in contract_to'
  }),
  phone: Joi.string().trim().max(50).optional(),
  address: Joi.string().trim().max(500).optional(),
  user_id: Joi.string().required().messages({
    'any.required': 'user_id is required in contract_to'
  })
});

const createContractOrderSchema = Joi.object({
  contract_to: contractToSchema.optional(),
  contract_id: Joi.string().required().messages({
    'any.required': 'contract_id is required'
  }),
  contract_type: Joi.string()
    .valid(...Object.values(ContractTypeEnum))
    .required()
    .messages({
      'any.only': `contract_type must be one of: ${Object.values(ContractTypeEnum).join(', ')}`,
      'any.required': 'contract_type is required'
    }),
  expiration: Joi.date().iso().greater('now').required().messages({
    'date.base': 'Expiration must be a valid date',
    'date.greater': 'Expiration date must be in the future',
    'any.required': 'Expiration is required'
  }),
  redirect_url: Joi.string().uri().optional().messages({
    'string.uri': 'redirect_url must be a valid URL'
  })
});

const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'sent', 'accepted', 'rejected', 'expired')
    .required()
    .messages({
      'any.only': 'Status must be one of: pending, sent, accepted, rejected, expired',
      'any.required': 'Status is required'
    })
});

export const validateCreateContractOrder = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { error } = createContractOrderSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors,
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
};

export const validateUpdateOrderStatus = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { error } = updateOrderStatusSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors,
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
};
