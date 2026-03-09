import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/environment';

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
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      userType: payload.userType,
      userMerchantId: payload.userMerchantId,
      type: 'password_reset',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    },
    config.jwt.secret,
    {
      issuer: 'client-auth-ms',
      audience: 'user',
    }
  );
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
export function generateAccessToken(payload: { userId: string; email: string; userType: string; userMerchantId?: string }): string {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      userType: payload.userType,
      userMerchantId: payload.userMerchantId,
      type: 'access',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
    },
    config.jwt.secret,
    {
      issuer: 'client-auth-ms',
      audience: 'user',
    }
  );
}

/**
 * Generate a refresh token
 */
export function generateRefreshToken(payload: { userId: string; email: string; userType: string; userMerchantId?: string }): string {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      userType: payload.userType,
      userMerchantId: payload.userMerchantId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
    },
    config.jwt.secret,
    {
      issuer: 'client-auth-ms',
      audience: 'user',
    }
  );
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