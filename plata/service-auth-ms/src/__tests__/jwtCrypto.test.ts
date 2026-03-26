import { describe, it, expect, jest } from '@jest/globals';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyToken, 
  extractTokenFromHeader,
  isTokenExpired,
  getTokenExpiration,
  JWTPayload 
} from '../utils/crypto';
import { UserType, AccountStatus } from '../models/User';
import * as jwt from 'jsonwebtoken';

// Mock the config
jest.mock('../config/environment', () => ({
  config: {
    jwt: {
      secret: 'test-secret-key',
      expiresIn: '1h',
      refreshExpiresIn: '7d'
    }
  }
}));

describe('JWT Crypto Functions', () => {
  const mockUser = {
    id: 'user-123',
    email: 'user@example.com',
    user_type: UserType.USER,
    user_merchant_id: 'merchant-456',
    password: 'hashed-password',
    first_name: 'John',
    last_name: 'Doe',
    status: AccountStatus.ACTIVE,
    email_verified: true,
    phone_verified: false,
    country: 'US',
    created_at: new Date(),
    updated_at: new Date(),
    failed_login_attempts: 0
  };
  
  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      // Act
      const token = generateAccessToken(mockUser);
      
      // Assert
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      
      // Verify token structure
      const decoded = jwt.verify(token, 'test-secret-key') as JWTPayload;
      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.userType).toBe(mockUser.user_type);
      expect(decoded.userMerchantId).toBe(mockUser.user_merchant_id);
    });
    
    it('should generate token without userMerchantId when not provided', () => {
      // Arrange
      const userWithoutMerchantId: any = { ...mockUser, user_merchant_id: undefined };
      
      // Act
      const token = generateAccessToken(userWithoutMerchantId);
      
      // Assert
      const decoded = jwt.verify(token, 'test-secret-key') as JWTPayload;
      expect(decoded.userMerchantId).toBeUndefined();
    });
  });
  
  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      // Act
      const token = generateRefreshToken(mockUser);
      
      // Assert
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      
      // Verify token structure
      const decoded = jwt.verify(token, 'test-secret-key') as JWTPayload;
      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.userType).toBe(mockUser.user_type);
    });
  });
  
  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      // Arrange
      const token = generateAccessToken(mockUser);
      
      // Act
      const decoded = verifyToken(token);
      
      // Assert
      expect(decoded).toBeTruthy();
      expect(decoded!.userId).toBe(mockUser.id);
      expect(decoded!.email).toBe(mockUser.email);
      expect(decoded!.userType).toBe(mockUser.user_type);
    });
    
    it('should return null for invalid token', () => {
      // Act
      const decoded = verifyToken('invalid-token');
      
      // Assert
      expect(decoded).toBeNull();
    });
    
    it('should return null for expired token', () => {
      // Arrange
      const expiredToken = jwt.sign(
        { userId: 'user-123', exp: Math.floor(Date.now() / 1000) - 1000 },
        'test-secret-key'
      );
      
      // Act
      const decoded = verifyToken(expiredToken);
      
      // Assert
      expect(decoded).toBeNull();
    });

    it('should verify client-auth-ms access token (issuer/audience used by gateway login)', () => {
      const token = jwt.sign(
        {
          userId: 'm1',
          email: 'm@example.com',
          userType: 'merchant',
          type: 'access'
        },
        'test-secret-key',
        { issuer: 'client-auth-ms', audience: 'user', expiresIn: '1h' }
      );
      const decoded = verifyToken(token);
      expect(decoded).toBeTruthy();
      expect(decoded!.userId).toBe('m1');
      expect(decoded!.userType).toBe('merchant');
    });
  });
  
  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      // Arrange
      const authHeader = 'Bearer valid-token-123';
      
      // Act
      const token = extractTokenFromHeader(authHeader);
      
      // Assert
      expect(token).toBe('valid-token-123');
    });
    
    it('should return null for invalid header format', () => {
      // Arrange
      const authHeader = 'Basic invalid-format';
      
      // Act
      const token = extractTokenFromHeader(authHeader);
      
      // Assert
      expect(token).toBeNull();
    });
    
    it('should return null for undefined header', () => {
      // Act
      const token = extractTokenFromHeader(undefined);
      
      // Assert
      expect(token).toBeNull();
    });
    
    it('should return null for empty string', () => {
      // Act
      const token = extractTokenFromHeader('');
      
      // Assert
      expect(token).toBeNull();
    });
  });
  
  describe('isTokenExpired', () => {
    it('should return false for valid token', () => {
      // Arrange
      const token = generateAccessToken(mockUser);
      
      // Act
      const isExpired = isTokenExpired(token);
      
      // Assert
      expect(isExpired).toBe(false);
    });
    
    it('should return true for expired token', () => {
      // Arrange
      const expiredToken = jwt.sign(
        { userId: 'user-123', exp: Math.floor(Date.now() / 1000) - 1000 },
        'test-secret-key'
      );
      
      // Act
      const isExpired = isTokenExpired(expiredToken);
      
      // Assert
      expect(isExpired).toBe(true);
    });
    
    it('should return true for invalid token', () => {
      // Act
      const isExpired = isTokenExpired('invalid-token');
      
      // Assert
      expect(isExpired).toBe(true);
    });
  });
  
  describe('getTokenExpiration', () => {
    it('should return expiration date for valid token', () => {
      // Arrange
      const token = generateAccessToken(mockUser);
      
      // Act
      const expiration = getTokenExpiration(token);
      
      // Assert
      expect(expiration).toBeInstanceOf(Date);
      expect(expiration!.getTime()).toBeGreaterThan(Date.now());
    });
    
    it('should return null for invalid token', () => {
      // Act
      const expiration = getTokenExpiration('invalid-token');
      
      // Assert
      expect(expiration).toBeNull();
    });
    
    it('should return null for token without exp claim', () => {
      // Arrange
      const tokenWithoutExp = jwt.sign(
        { userId: 'user-123' },
        'test-secret-key'
      );
      
      // Act
      const expiration = getTokenExpiration(tokenWithoutExp);
      
      // Assert
      expect(expiration).toBeNull();
    });
  });
});
