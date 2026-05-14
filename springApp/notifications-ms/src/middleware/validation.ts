import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiError } from './errorHandler';

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => detail.message).join(', ');
      throw new ApiError(400, `Validation error: ${errors}`);
    }

    next();
  };
};

export const sendNotificationSchema = Joi.object({
  channel: Joi.string().valid('email', 'sms', 'in_app').required(),
  recipient: Joi.string().required(),
  template: Joi.string().required(),
  data: Joi.object().required(),
  priority: Joi.string().valid('high', 'normal', 'low').optional()
});

export const sendEmailAndInAppSchema = Joi.object({
  userId: Joi.string().required(),
  email: Joi.string().email().required(),
  template: Joi.string().required(),
  data: Joi.object().required(),
  priority: Joi.string().valid('high', 'normal', 'low').optional()
});
