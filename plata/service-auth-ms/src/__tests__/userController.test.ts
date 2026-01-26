import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { UserController } from '../controllers/userController';
import { AuthService } from '../services/authService';
import { UserType, AccountStatus } from '../models/User';

// Mock dependencies
jest.mock('../services/authService');
jest.mock('../utils/logger');

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;

// Mock Express request, response, and next function
const mockRequest = (body: any = {}, params: any = {}, user?: any) => {
  const req = {
    body,
    params,
    user
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

describe('User Management', () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;
  
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

  const mockAuthenticatedUser = {
    userId: 'user-123',
    email: 'user@example.com',
    userType: 'user',
    userMerchantId: 'merchant-123'
  };
  
  beforeEach(() => {
    res = mockResponse();
    next = mockNext();
    // Clear all mocks
    jest.clearAllMocks();
  });
  
  describe('UserController.getProfile', () => {
    it('should get user profile successfully', async () => {
      // Arrange
      req = mockRequest({}, {}, mockAuthenticatedUser);
      
      mockAuthService.getUserProfile.mockResolvedValue({
        success: true,
        user: mockUser
      });
      
      // Act
      await UserController.getProfile(req, res, next);
      
      // Assert
      expect(mockAuthService.getUserProfile).toHaveBeenCalledWith('user-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: mockUser
        }
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      req = mockRequest({}, {}, null); // No user
      
      // Act
      await UserController.getProfile(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required'
      });
      expect(mockAuthService.getUserProfile).not.toHaveBeenCalled();
    });

    it('should return 404 when user is not found', async () => {
      // Arrange
      req = mockRequest({}, {}, mockAuthenticatedUser);
      
      mockAuthService.getUserProfile.mockResolvedValue({
        success: false,
        error: 'User not found'
      });
      
      // Act
      await UserController.getProfile(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found'
      });
    });
  });

  describe('UserController.updateProfile', () => {
    it('should update user profile successfully', async () => {
      // Arrange
      const updateData = {
        first_name: 'Jane',
        last_name: 'Smith',
        phone: '+1234567890',
        country: 'Canada'
      };
      
      req = mockRequest(updateData, {}, mockAuthenticatedUser);
      
      const updatedUser = { ...mockUser, ...updateData };
      mockAuthService.updateUserProfile.mockResolvedValue({
        success: true,
        user: updatedUser
      });
      
      // Act
      await UserController.updateProfile(req, res, next);
      
      // Assert
      expect(mockAuthService.updateUserProfile).toHaveBeenCalledWith('user-123', updateData);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: updatedUser
        }
      });
    });

    it('should return 400 for invalid input data', async () => {
      // Arrange
      const invalidData = {
        first_name: 'A', // Too short
        phone: 'invalid-phone'
      };
      
      req = mockRequest(invalidData, {}, mockAuthenticatedUser);
      
      // Act
      await UserController.updateProfile(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details: expect.any(String)
      });
      expect(mockAuthService.updateUserProfile).not.toHaveBeenCalled();
    });
  });

  describe('UserController.getInfo', () => {
    it('should get user info successfully', async () => {
      // Arrange
      req = mockRequest({}, { userId: 'target-user-123' }, mockAuthenticatedUser);
      
      mockAuthService.getUserInfo.mockResolvedValue({
        success: true,
        user: mockUser
      });
      
      // Act
      await UserController.getInfo(req, res, next);
      
      // Assert
      expect(mockAuthService.getUserInfo).toHaveBeenCalledWith('target-user-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: mockUser
        }
      });
    });

    it('should return 400 when userId parameter is missing', async () => {
      // Arrange
      req = mockRequest({}, {}, mockAuthenticatedUser); // No userId in params
      
      // Act
      await UserController.getInfo(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'User ID is required'
      });
      expect(mockAuthService.getUserInfo).not.toHaveBeenCalled();
    });
  });

  describe('UserController.verifyInfo', () => {
    it('should verify user info successfully', async () => {
      // Arrange
      const verificationData = {
        email_verified: true,
        phone_verified: true,
        status: AccountStatus.ACTIVE,
        notes: 'Verification completed'
      };
      
      req = mockRequest(verificationData, { userId: 'target-user-123' }, mockAuthenticatedUser);
      
      const verifiedUser = { ...mockUser, ...verificationData };
      mockAuthService.verifyUserInfo.mockResolvedValue({
        success: true,
        user: verifiedUser
      });
      
      // Act
      await UserController.verifyInfo(req, res, next);
      
      // Assert
      expect(mockAuthService.verifyUserInfo).toHaveBeenCalledWith('target-user-123', verificationData);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User information verified successfully',
        data: {
          user: verifiedUser
        }
      });
    });

    it('should return 400 for invalid verification data', async () => {
      // Arrange
      const invalidData = {
        status: 'invalid-status', // Not a valid AccountStatus
        notes: 'A'.repeat(501) // Too long
      };
      
      req = mockRequest(invalidData, { userId: 'target-user-123' }, mockAuthenticatedUser);
      
      // Act
      await UserController.verifyInfo(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details: expect.any(String)
      });
      expect(mockAuthService.verifyUserInfo).not.toHaveBeenCalled();
    });
  });

  describe('UserController.suspend', () => {
    it('should suspend user successfully', async () => {
      // Arrange
      const suspensionData = {
        reason: 'Policy violation'
      };
      
      req = mockRequest(suspensionData, { userId: 'target-user-123' }, mockAuthenticatedUser);
      
      const suspendedUser = { ...mockUser, status: AccountStatus.SUSPENDED };
      mockAuthService.suspendUser.mockResolvedValue({
        success: true,
        user: suspendedUser
      });
      
      // Act
      await UserController.suspend(req, res, next);
      
      // Assert
      expect(mockAuthService.suspendUser).toHaveBeenCalledWith('target-user-123', 'Policy violation');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User account suspended successfully',
        data: {
          user: suspendedUser
        }
      });
    });

    it('should prevent users from suspending themselves', async () => {
      // Arrange
      req = mockRequest({ reason: 'Test' }, { userId: 'user-123' }, mockAuthenticatedUser); // Same user ID
      
      // Act
      await UserController.suspend(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot suspend your own account'
      });
      expect(mockAuthService.suspendUser).not.toHaveBeenCalled();
    });
  });

  describe('UserController.activate', () => {
    it('should activate user successfully', async () => {
      // Arrange
      req = mockRequest({}, { userId: 'target-user-123' }, mockAuthenticatedUser);
      
      const activatedUser = { ...mockUser, status: AccountStatus.ACTIVE };
      mockAuthService.activateUser.mockResolvedValue({
        success: true,
        user: activatedUser
      });
      
      // Act
      await UserController.activate(req, res, next);
      
      // Assert
      expect(mockAuthService.activateUser).toHaveBeenCalledWith('target-user-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User account activated successfully',
        data: {
          user: activatedUser
        }
      });
    });

    it('should return 400 when userId parameter is missing', async () => {
      // Arrange
      req = mockRequest({}, {}, mockAuthenticatedUser); // No userId in params
      
      // Act
      await UserController.activate(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'User ID is required'
      });
      expect(mockAuthService.activateUser).not.toHaveBeenCalled();
    });
  });

  describe('Service Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      // Arrange
      req = mockRequest({}, {}, mockAuthenticatedUser);
      
      mockAuthService.getUserProfile.mockRejectedValue(new Error('Database connection failed'));
      
      // Act
      await UserController.getProfile(req, res, next);
      
      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});