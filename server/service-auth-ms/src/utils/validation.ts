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
  newPassword: passwordSchema
});

// Password change validation schema
export const passwordChangeSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: passwordSchema
});

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

// User profile update validation schema
export const userProfileUpdateSchema = Joi.object({
  first_name: Joi.string().min(2).max(50).optional(),
  last_name: Joi.string().min(2).max(50).optional(),
  phone: phoneSchema.optional(),
  country: Joi.string().min(2).max(100).optional()
});

// User verification validation schema (admin only)
export const userVerificationSchema = Joi.object({
  email_verified: Joi.boolean().optional(),
  phone_verified: Joi.boolean().optional(),
  status: Joi.string().valid('pending', 'active', 'suspended', 'deactivated').optional(),
  notes: Joi.string().max(500).optional()
});

// User suspension validation schema (admin only)
export const userSuspensionSchema = Joi.object({
  reason: Joi.string().max(500).optional()
});

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