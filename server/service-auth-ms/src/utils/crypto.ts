import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';
import { UserAccount, UserType } from '../models/User';

/**
 * Hash a password using bcrypt
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, config.password.bcryptRounds);
};

/**
 * Compare a plain text password with a hashed password
 */
export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

/**
 * Generate a random string for tokens
 */
export const generateRandomString = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * JWT Token Payload Interface
 */
export interface JWTPayload {
  userId: string;
  email: string;
  userType: UserType;
  userMerchantId?: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate JWT access token
 */
export const generateAccessToken = (user: UserAccount): string => {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    userType: user.user_type,
    ...(user.user_merchant_id && { userMerchantId: user.user_merchant_id })
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
    issuer: 'service-auth-ms',
    audience: 'client-app'
  });
};

/**
 * Generate JWT refresh token
 */
export const generateRefreshToken = (user: UserAccount): string => {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    userType: user.user_type,
    ...(user.user_merchant_id && { userMerchantId: user.user_merchant_id })
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiresIn,
    issuer: 'service-auth-ms',
    audience: 'client-app'
  });
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): JWTPayload | null => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: 'service-auth-ms',
      audience: 'client-app'
    }) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Generate email verification token
 */
export const generateEmailVerificationToken = (userId: string, email: string): string => {
  const payload = {
    userId,
    email,
    type: 'email_verification',
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.verification.emailExpiresIn,
    issuer: 'service-auth-ms'
  });
};

/**
 * Verify email verification token
 */
export const verifyEmailVerificationToken = (token: string): { userId: string; email: string } | null => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    if (decoded.type === 'email_verification') {
      return {
        userId: decoded.userId,
        email: decoded.email
      };
    }
    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Generate password reset token
 */
export const generatePasswordResetToken = (userId: string, email: string): string => {
  const payload = {
    userId,
    email,
    type: 'password_reset',
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.verification.passwordResetExpiresIn,
    issuer: 'service-auth-ms'
  });
};

/**
 * Verify password reset token
 */
export const verifyPasswordResetToken = (token: string): { userId: string; email: string } | null => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    if (decoded.type === 'password_reset') {
      return {
        userId: decoded.userId,
        email: decoded.email
      };
    }
    return null;
  } catch (error) {
    return null;
  }
};