import Joi from 'joi';

// Common validation schemas
const emailSchema = Joi.string().email().required();
const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .required()
  .messages({
    'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
  });

const phoneSchema = Joi.string()
  .pattern(/^\+?[1-9]\d{1,14}$/)
  .optional()
  .messages({
    'string.pattern.base': 'Phone number must be in valid international format'
  });

const nameSchema = Joi.string().min(2).max(50).required();

// Address validation schema
const addressSchema = Joi.object({
  street: Joi.string().min(5).max(200).required(),
  city: Joi.string().min(2).max(100).required(),
  state: Joi.string().min(2).max(100).required(),
  country: Joi.string().min(2).max(100).required(),
  postalCode: Joi.string().min(3).max(20).required()
});

// User registration validation schema
export const userRegistrationSchema = Joi.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema,
  dateOfBirth: Joi.date().max('now').optional(),
  address: addressSchema.optional()
});

// Merchant registration validation schema
export const merchantRegistrationSchema = Joi.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema,
  businessName: Joi.string().min(2).max(200).required(),
  businessType: Joi.string().min(2).max(100).required(),
  businessRegistrationNumber: Joi.string().min(5).max(50).optional(),
  businessAddress: addressSchema.required(),
  website: Joi.string().uri().optional(),
  description: Joi.string().max(1000).optional()
});

// Validation helper function
export const validateInput = <T>(schema: Joi.ObjectSchema, data: any): { error?: string; value?: T } => {
  const { error, value } = schema.validate(data, { 
    abortEarly: false,
    stripUnknown: true 
  });
  
  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return { error: errorMessage };
  }
  
  return { value };
};