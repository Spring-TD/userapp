import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';
import { UserAccount, UserType } from '../models/User';

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
 * Generate a cryptographically secure token for SAMS credentials
 */
export const generateSecureToken = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let result = '';

  // Use crypto.randomInt for better security if available
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      result += chars.charAt((array[i] ?? 0) % chars.length);
    }
  } else {
    // Fallback to Math.random
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }

  return result;
};

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

const CLIENT_AUTH_ISSUER = 'client-auth-ms';
const CLIENT_AUTH_AUDIENCE = 'user';

/**
 * Verify JWT token — accepts tokens issued by this service or by client-auth-ms (gateway login).
 */
export const verifyToken = (token: string): JWTPayload | null => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: 'service-auth-ms',
      audience: 'client-app'
    }) as JWTPayload;
    return decoded;
  } catch {
    // continue
  }

  // Login flows use client-auth-ms; same secret is typical — override with CLIENT_AUTH_JWT_SECRET if different.
  const clientAuthSecret = process.env['CLIENT_AUTH_JWT_SECRET'] || config.jwt.secret;
  try {
    const decoded = jwt.verify(token, clientAuthSecret, {
      issuer: CLIENT_AUTH_ISSUER,
      audience: CLIENT_AUTH_AUDIENCE
    }) as JWTPayload & { type?: string };

    if (decoded.type && decoded.type !== 'access' && decoded.type !== 'refresh') {
      return null;
    }

    const out: JWTPayload = {
      userId: decoded.userId,
      email: decoded.email,
      userType: decoded.userType
    };
    if (decoded.userMerchantId !== undefined) {
      out.userMerchantId = decoded.userMerchantId;
    }
    if (decoded.iat !== undefined) {
      out.iat = decoded.iat;
    }
    if (decoded.exp !== undefined) {
      out.exp = decoded.exp;
    }
    return out;
  } catch {
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

/**
 * Extract token from Authorization header
 */
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove 'Bearer ' prefix
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.exp) {
      return true;
    }
    return Date.now() >= decoded.exp * 1000;
  } catch (error) {
    return true;
  }
};

/**
 * Get token expiration time
 */
/**
 * Get token expiration time
 */
export const getTokenExpiration = (token: string): Date | null => {
  try {
    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.exp) {
      return null;
    }
    return new Date(decoded.exp * 1000);
  } catch (error) {
    return null;
  }
};

/**
 * Generate API key pair (public and secret)
 */
export const generateApiKeyPair = (environment: 'test' | 'live'): { publicKey: string, secretKey: string } => {
  const prefix = environment === 'live' ? 'live' : 'test';
  const randomPublic = generateRandomString(24);
  const randomSecret = generateRandomString(48);

  return {
    publicKey: `pk_${prefix}_${randomPublic}`,
    secretKey: `sk_${prefix}_${randomSecret}`
  };
};

/**
 * Hash API key
 * We use SHA-256 for API key hashing as it's faster than bcrypt and sufficient for high-entropy keys
 */
export const hashApiKey = (apiKey: string): string => {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
};

/**
 * Verify API key against hash
 */
export const verifyApiKey = (apiKey: string, hash: string): boolean => {
  const computedHash = hashApiKey(apiKey);
  return computedHash === hash;
};