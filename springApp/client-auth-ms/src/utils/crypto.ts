import bcrypt from 'bcrypt';
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/environment';

export type JwtUserPayload = {
  userId: string;
  email: string;
  userType: string;
  userMerchantId?: string;
  sessionId: string;
};

/** Store only a hash of refresh tokens in the database */
export function hashTokenForStorage(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * Hash a password
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = config.bcrypt.rounds;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Compare a password with its hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Generate a password reset token
 */
export function generatePasswordResetToken(payload: { userId: string; email: string; userType: string; userMerchantId?: string }): string {
  const jwtPayload = {
    userId: payload.userId,
    email: payload.email,
    userType: payload.userType,
    userMerchantId: payload.userMerchantId,
    type: 'password_reset',
  };
  const options: SignOptions = {
    issuer: 'client-auth-ms',
    audience: 'user',
    expiresIn: 3600, // 1 hour in seconds
  };
  return jwt.sign(jwtPayload, config.jwt.secret as Secret, options);
}

/**
 * Verify a password reset token
 */
export function verifyPasswordResetToken(token: string): { valid: boolean; payload?: any; error?: string } {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    
    if (decoded.type !== 'password_reset') {
      return { valid: false, error: 'Invalid token type' };
    }
    
    return { valid: true, payload: decoded };
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}

/**
 * Verify an email verification token
 */
export function verifyEmailVerificationToken(token: string): { valid: boolean; email?: string; error?: string } {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as { email?: string; type?: string };
    
    if (decoded.type !== 'email_verification') {
      return { valid: false, error: 'Invalid token type' };
    }
    
    return { valid: true, email: decoded.email };
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}

/**
 * Generate an access token
 */
export function generateAccessToken(payload: JwtUserPayload): string {
  const jwtPayload = {
    userId: payload.userId,
    email: payload.email,
    userType: payload.userType,
    userMerchantId: payload.userMerchantId,
    sessionId: payload.sessionId,
    type: 'access',
  };
  const options: SignOptions = {
    issuer: 'client-auth-ms',
    audience: 'user',
    // Cast because jsonwebtoken's StringValue template type is narrower than general string
    expiresIn: (config.jwt.expiresIn || '1h') as any,
  };
  return jwt.sign(jwtPayload, config.jwt.secret as Secret, options);
}

/**
 * Generate a refresh token
 */
export function generateRefreshToken(payload: JwtUserPayload): string {
  const jwtPayload = {
    userId: payload.userId,
    email: payload.email,
    userType: payload.userType,
    userMerchantId: payload.userMerchantId,
    sessionId: payload.sessionId,
    type: 'refresh',
  };
  const options: SignOptions = {
    issuer: 'client-auth-ms',
    audience: 'user',
    // Cast because jsonwebtoken's StringValue template type is narrower than general string
    expiresIn: (config.jwt.refreshExpiresIn || '30d') as any,
  };
  return jwt.sign(jwtPayload, config.jwt.secret as Secret, options);
}

/**
 * Verify a token
 */
export function verifyToken(token: string, type: 'access' | 'refresh' = 'access'): { valid: boolean; payload?: any; error?: string } {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    
    if (decoded.type !== type) {
      return { valid: false, error: 'Invalid token type' };
    }
    
    return { valid: true, payload: decoded };
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}

/**
 * Generate a secure token
 */
export function generateSecureToken(length: number = 32): string {
  return uuidv4().replace(/-/g, '').substring(0, length);
}