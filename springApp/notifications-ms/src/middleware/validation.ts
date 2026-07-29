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
  email: Joi.string().email().optional().allow(''),
  template: Joi.string().required(),
  data: Joi.object().required(),
  priority: Joi.string().valid('high', 'normal', 'low').optional(),
  skipWebPush: Joi.boolean().optional()
});

export const webPushSubscribeSchema = Joi.object({
  userId: Joi.string().required(),
  subscription: Joi.object({
    endpoint: Joi.string().uri().required(),
    expirationTime: Joi.number().allow(null).optional(),
    keys: Joi.object({
      p256dh: Joi.string().required(),
      auth: Joi.string().required()
    }).required()
  }).required(),
  appId: Joi.string().optional().allow('')
});

export const webPushUnsubscribeSchema = Joi.object({
  userId: Joi.string().required(),
  endpoint: Joi.string().uri().required()
});

export const inboxMarkReadSchema = Joi.object({
  ids: Joi.array().items(Joi.string()).optional()
});

export const inboxDeleteBulkSchema = Joi.object({
  ids: Joi.array().items(Joi.string()).min(1).required()
});
