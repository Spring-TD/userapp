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

// Admin registration validation schema
export const adminRegistrationSchema = Joi.object({
  email: emailSchema,
  password: passwordSchema,
  first_name: nameSchema,
  last_name: nameSchema,
  phone: phoneSchema,
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

// User status update validation schema
export const userStatusUpdateSchema = Joi.object({
  status: Joi.string().valid('pending', 'active', 'suspended', 'deactivated').required()
});

// SAMS (Service Authentication Microservice) Validation Schemas

// Service creation validation schema
export const createServiceSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().min(10).max(500).required(),
  version: Joi.string().max(20).optional(),
  endpoint_url: Joi.string().uri().optional(),
  health_check_url: Joi.string().uri().optional(),
  owner_email: Joi.string().email().optional(),
  tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
  metadata: Joi.object().optional()
});

// Service ID parameter validation
export const serviceIdSchema = Joi.object({
  serviceId: Joi.string().uuid().required()
});

// IP whitelist validation schema
export const whitelistIPSchema = Joi.object({
  ip_addresses: Joi.array()
    .items(
      Joi.string().pattern(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/(?:[0-9]|[1-2][0-9]|3[0-2]))?$/)
        .messages({
          'string.pattern.base': 'IP address must be valid IPv4 address or CIDR notation'
        })
    )
    .min(1)
    .max(50)
    .required(),
  description: Joi.string().max(200).optional()
});

// Credential creation validation schema
export const createCredentialSchema = Joi.object({
  target_service_id: Joi.string().uuid().optional(),
  credential_type: Joi.string().valid('api_key', 'jwt_token', 'client_secret').required(),
  expires_in: Joi.number().integer().min(300).max(31536000).optional(), // 5 minutes to 1 year
  permissions: Joi.array().items(Joi.string().max(50)).max(20).optional(),
  rate_limit: Joi.number().integer().min(1).max(10000).optional(),
  description: Joi.string().max(200).optional()
});

// Credential validation request schema
export const validateCredentialSchema = Joi.object({
  credential_value: Joi.string().required(),
  service_id: Joi.string().uuid().optional(),
  requested_permissions: Joi.array().items(Joi.string().max(50)).max(20).optional(),
  user_merchant_id: Joi.string().max(50).optional()
});

// Credential ID parameter validation
export const credentialIdSchema = Joi.object({
  credentialId: Joi.string().uuid().required()
});

// Void credential validation schema
export const voidCredentialSchema = Joi.object({
  reason: Joi.string().max(200).optional()
});

// Service status update validation schema
export const updateServiceStatusSchema = Joi.object({
  status: Joi.string().valid('active', 'inactive', 'suspended', 'decommissioned').required()
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