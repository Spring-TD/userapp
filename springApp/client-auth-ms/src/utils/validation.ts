import Joi from 'joi';

const emailSchema = Joi.string().email().required().messages({
  'string.email': 'Please enter a valid email address',
  'any.required': 'Email is required'
});

const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .required()
  .messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password must not exceed 128 characters',
    'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
    'any.required': 'Password is required'
  });

const phoneSchema = Joi.string()
  .pattern(/^\+?[1-9]\d{1,14}$/)
  .required()
  .messages({
    'string.pattern.base': 'Phone number must be in valid international format',
    'any.required': 'Phone number is required'
  });

const nameSchema = Joi.string().min(2).max(50).required().messages({
  'string.min': 'Name must be at least 2 characters long',
  'string.max': 'Name must not exceed 50 characters',
  'any.required': 'This field is required'
});

const countrySchema = Joi.string().min(2).max(100).required().messages({
  'string.min': 'Country must be at least 2 characters long',
  'string.max': 'Country must not exceed 100 characters',
  'any.required': 'Country is required'
});

const userMerchantIdSchema = Joi.string().min(5).max(50).required().messages({
  'string.min': 'User Merchant ID must be at least 5 characters long',
  'string.max': 'User Merchant ID must not exceed 50 characters',
  'any.required': 'User Merchant ID is required'
});

export const merchantRegistrationSchema = Joi.object({
  first_name: nameSchema,
  last_name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  country: countrySchema,
  password: passwordSchema
});

export const userRegistrationSchema = Joi.object({
  user_merchant_id: userMerchantIdSchema,
  first_name: nameSchema,
  last_name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  country: countrySchema,
  password: passwordSchema
});

export const adminRegistrationSchema = Joi.object({
  first_name: nameSchema,
  last_name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  country: countrySchema,
  password: passwordSchema
});

export const updateEmailSchema = Joi.object({
  newEmail: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'New email is required'
  }),
  confirmEmail: Joi.string().email().valid(Joi.ref('newEmail')).required().messages({
    'any.only': 'Emails do not match',
    'any.required': 'Please confirm your email'
  }),
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required to change email'
  })
});

export const validateForm = <T>(schema: Joi.ObjectSchema, data: any): { error?: string; value?: T } => {
  const { error, value } = schema.validate(data, { 
    abortEarly: false,
    stripUnknown: true 
  });
  
  if (error) {
    const errorMessage = error.details.map((detail: any) => detail.message).join(', ');
    return { error: errorMessage };
  }
  
  return { value };
};