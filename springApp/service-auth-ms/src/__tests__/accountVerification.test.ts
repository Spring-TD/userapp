import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { AuthController } from '../controllers/authController';
import { AuthService } from '../services/authService';
import { generateEmailVerificationToken, verifyEmailVerificationToken } from '../utils/crypto';
import { db as mockDb } from '../db/database';
import { UserType, AccountStatus } from '../models/User';

// Mock dependencies
jest.mock('../services/authService');
jest.mock('../utils/crypto');
jest.mock('../db/database');
jest.mock('../utils/logger');

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;
const mockVerifyEmailVerificationToken = verifyEmailVerificationToken as jest.MockedFunction<typeof verifyEmailVerificationToken>;

// Mock Express request, response, and next function
const mockRequest = (body: any = {}) => {
  const req = {
    body
  } as Request;
  return req;
};

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res) as any;
  res.json = jest.fn().mockReturnValue(res) as any;
  return res;
};

const mockNext = () => {
  return jest.fn();
};

describe('Account Verification', () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;
  
  beforeEach(() => {
    res = mockResponse();
    next = mockNext();
    // Clear all mocks
    jest.clearAllMocks();
  });
  
  describe('AuthController.verifyAccount', () => {
    it('should verify account successfully with valid token', async () => {
      // Arrange
      const verifyRequest = {
        token: 'valid-verification-token'
      };
      
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        first_name: 'John',
        last_name: 'Doe',
        user_type: UserType.USER,
        status: AccountStatus.ACTIVE,
        email_verified: true,
        phone_verified: false,
        user_merchant_id: 'merchant-123',
        country: 'USA',
        created_at: new Date(),
        updated_at: new Date(),
        failed_login_attempts: 0
      };
      
      req = mockRequest(verifyRequest);
      
      mockAuthService.verifyAccount.mockResolvedValue({
        success: true,
        user: mockUser
      });
      
      // Act
      await AuthController.verifyAccount(req, res, next);
      
      // Assert
      expect(mockAuthService.verifyAccount).toHaveBeenCalledWith('valid-verification-token');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Account verified successfully',
        data: {
          user: {
            id: 'user-123',
            email: 'user@example.com',
            first_name: 'John',
            last_name: 'Doe',
            user_type: UserType.USER,
            status: AccountStatus.ACTIVE,
            email_verified: true,
            phone_verified: false,
            created_at: mockUser.created_at
          }
        }
      });
    });

    it('should return 400 when token is missing', async () => {
      // Arrange
      const verifyRequest = {}; // Missing token
      
      req = mockRequest(verifyRequest);
      
      // Act
      await AuthController.verifyAccount(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details: expect.any(String)
      });
      expect(mockAuthService.verifyAccount).not.toHaveBeenCalled();
    });

    it('should return 400 when token is invalid', async () => {
      // Arrange
      const verifyRequest = {
        token: 'invalid-token'
      };
      
      req = mockRequest(verifyRequest);
      
      mockAuthService.verifyAccount.mockResolvedValue({
        success: false,
        error: 'Invalid or expired verification token'
      });
      
      // Act
      await AuthController.verifyAccount(req, res, next);
      
      // Assert
      expect(mockAuthService.verifyAccount).toHaveBeenCalledWith('invalid-token');
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired verification token'
      });
    });

    it('should return 400 when account is already verified', async () => {
      // Arrange
      const verifyRequest = {
        token: 'valid-token-already-verified'
      };
      
      req = mockRequest(verifyRequest);
      
      mockAuthService.verifyAccount.mockResolvedValue({
        success: false,
        error: 'Account is already verified'
      });
      
      // Act
      await AuthController.verifyAccount(req, res, next);
      
      // Assert
      expect(mockAuthService.verifyAccount).toHaveBeenCalledWith('valid-token-already-verified');
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Account is already verified'
      });
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      const verifyRequest = {
        token: 'some-token'
      };
      
      req = mockRequest(verifyRequest);
      
      mockAuthService.verifyAccount.mockRejectedValue(new Error('Database connection failed'));
      
      // Act
      await AuthController.verifyAccount(req, res, next);
      
      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('AuthService.verifyAccount', () => {
    beforeEach(() => {
      // Reset mocks for direct service testing
      jest.clearAllMocks();
      // Use real implementation
      jest.unmock('../services/authService');
    });

    it('should verify account and activate user', async () => {
      // Arrange
      const userId = 'user-123';
      const email = 'user@example.com';
      const token = 'valid-verification-token';
      
      const mockUser = {
        id: userId,
        email: email,
        first_name: 'John',
        last_name: 'Doe',
        user_type: UserType.USER,
        status: AccountStatus.PENDING,
        email_verified: false,
        phone_verified: false,
        password: 'hashed-password',
        created_at: new Date(),
        updated_at: new Date(),
        user_merchant_id: 'merchant-123',
        country: 'USA',
        failed_login_attempts: 0
      };

      const updatedUser = {
        ...mockUser,
        email_verified: true,
        status: AccountStatus.ACTIVE
      };
      
      mockVerifyEmailVerificationToken.mockReturnValue({
        userId,
        email
      });
      
      const mockFindUserById: any = jest.fn()
        .mockResolvedValueOnce(mockUser)  // First call for verification
        .mockResolvedValueOnce(updatedUser);
        
      const mockUpdateUser: any = jest.fn().mockResolvedValue(undefined);
      
      (mockDb as any).findUserById = mockFindUserById;
      (mockDb as any).updateUser = mockUpdateUser;
      
      // Act
      const result = await AuthService.verifyAccount({ token });
      
      // Assert
      expect(mockVerifyEmailVerificationToken).toHaveBeenCalledWith(token);
      expect(mockFindUserById).toHaveBeenCalledWith(userId);
      expect(mockUpdateUser).toHaveBeenCalledWith(userId, {
        email_verified: true,
        status: AccountStatus.ACTIVE
      });
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.email_verified).toBe(true);
      expect(result.user?.status).toBe(AccountStatus.ACTIVE);
      expect(result.user).not.toHaveProperty('password'); // Password should be excluded
    });

    it('should reject invalid token', async () => {
      // Arrange
      const token = 'invalid-token';
      
      mockVerifyEmailVerificationToken.mockReturnValue(null);
      
      // Act
      const result = await AuthService.verifyAccount({ token });
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid or expired verification token');
    });

    it('should reject token for non-existent user', async () => {
      // Arrange
      const token = 'valid-token';
      const userId = 'non-existent-user';
      const email = 'user@example.com';
      
      mockVerifyEmailVerificationToken.mockReturnValue({
        userId,
        email
      });
      
      const mockFindUserById: any = jest.fn().mockResolvedValue(null);
      (mockDb as any).findUserById = mockFindUserById;
      
      // Act
      const result = await AuthService.verifyAccount({ token });
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should reject token with mismatched email', async () => {
      // Arrange
      const token = 'valid-token';
      const userId = 'user-123';
      const tokenEmail = 'token@example.com';
      const userEmail = 'different@example.com';
      
      const mockUser = {
        id: userId,
        email: userEmail,
        email_verified: false,
        status: AccountStatus.PENDING
      };
      
      mockVerifyEmailVerificationToken.mockReturnValue({
        userId,
        email: tokenEmail
      });
      
      const mockFindUserById: any = jest.fn().mockResolvedValue(mockUser);
      (mockDb as any).findUserById = mockFindUserById;
      
      // Act
      const result = await AuthService.verifyAccount({ token });
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid verification token');
    });

    it('should reject verification for already verified account', async () => {
      // Arrange
      const token = 'valid-token';
      const userId = 'user-123';
      const email = 'user@example.com';
      
      const mockUser = {
        id: userId,
        email: email,
        email_verified: true, // Already verified
        status: AccountStatus.ACTIVE
      };
      
      mockVerifyEmailVerificationToken.mockReturnValue({
        userId,
        email
      });
      
      const mockFindUserById: any = jest.fn().mockResolvedValue(mockUser);
      (mockDb as any).findUserById = mockFindUserById;
      
      // Act
      const result = await AuthService.verifyAccount({ token });
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Account is already verified');
    });
  });

  describe('Email Verification Token Generation', () => {
    it('should generate valid email verification token', () => {
      // Arrange
      const userId = 'user-123';
      const email = 'user@example.com';
      
      // Act
      const token = generateEmailVerificationToken(userId, email);
      
      // Assert
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should verify valid email verification token', () => {
      // Arrange
      const userId = 'user-123';
      const email = 'user@example.com';
      const token = generateEmailVerificationToken(userId, email);
      
      // Act
      const decoded = verifyEmailVerificationToken(token);
      
      // Assert
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(userId);
      expect(decoded?.email).toBe(email);
    });

    it('should reject invalid email verification token', () => {
      // Arrange
      const invalidToken = 'invalid.token.here';
      
      // Act
      const decoded = verifyEmailVerificationToken(invalidToken);
      
      // Assert
      expect(decoded).toBeNull();
    });
  });
});