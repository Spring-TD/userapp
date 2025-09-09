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

<<<<<<< HEAD
=======
// Address validation schema
const addressSchema = Joi.object({
  street: Joi.string().min(5).max(200).required(),
  city: Joi.string().min(2).max(100).required(),
  state: Joi.string().min(2).max(100).required(),
  country: Joi.string().min(2).max(100).required(),
  postalCode: Joi.string().min(3).max(20).required()
});

>>>>>>> 61b77a379aa21ff00899f7fb6df7b19f71b6190b
// User registration validation schema
export const userRegistrationSchema = Joi.object({
  email: emailSchema,
  password: passwordSchema,
  first_name: nameSchema,
  last_name: nameSchema,
  phone: phoneSchema,
  user_merchant_id: Joi.string().min(5).max(50).required(),
  country: Joi.string().min(2).max(100).required()
});

// Merchant registration validation schema
export const merchantRegistrationSchema = Joi.object({
  email: emailSchema,
  password: passwordSchema,
  first_name: nameSchema,
  last_name: nameSchema,
  phone: phoneSchema,
  user_merchant_id: Joi.string().min(5).max(50).required(),
  country: Joi.string().min(2).max(100).required()
});

<<<<<<< HEAD
// Login validation schema
export const loginSchema = Joi.object({
  email: emailSchema,
  password: Joi.string().required()
});

// Email verification validation schema
export const emailVerificationSchema = Joi.object({
  token: Joi.string().required()
});

// Refresh token validation schema
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required()
});

// Logout validation schema
export const logoutSchema = Joi.object({
  refreshToken: Joi.string().optional()
});

// Password reset request validation schema
export const passwordResetRequestSchema = Joi.object({
  email: emailSchema
});

// Password reset validation schema
export const passwordResetSchema = Joi.object({
  token: Joi.string().required(),
  password: passwordSchema
});

// Password change validation schema
export const passwordChangeSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: passwordSchema
});

=======
>>>>>>> 61b77a379aa21ff00899f7fb6df7b19f71b6190b
// Validation helper function
export const validateInput = <T>(schema: Joi.ObjectSchema, data: any): { error?: string; value?: T } => {
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