import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { PasswordController } from '../controllers/passwordController';
import { AuthService } from '../services/authService';

// Mock Express request, response, and next function
const mockRequest = (body: any = {}, user: any = null) => {
  const req = {
    body,
    user
  } as Request;
  return req;
};

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = () => {
  return jest.fn();
};

describe('PasswordController', () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;
  
  beforeEach(() => {
    res = mockResponse();
    next = mockNext();
    // Clear all mocks
    jest.clearAllMocks();
  });
  
  describe('forgot', () => {
    it('should initiate password reset successfully with valid email', async () => {
      // Arrange
      const forgotRequest = {
        email: 'user@example.com'
      };
      
      req = mockRequest(forgotRequest);
      
      // Mock successful password reset initiation
      jest.spyOn(AuthService, 'initiatePasswordReset').mockResolvedValue({
        success: true
      });
      
      // Act
      await PasswordController.forgot(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
      expect(AuthService.initiatePasswordReset).toHaveBeenCalledWith('user@example.com');
    });
    
    it('should return 400 if email is missing', async () => {
      // Arrange
      req = mockRequest({});
      
      // Act
      await PasswordController.forgot(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details: expect.stringContaining('email')
      });
    });
    
    it('should return 400 if email format is invalid', async () => {
      // Arrange
      req = mockRequest({ email: 'invalid-email' });
      
      // Act
      await PasswordController.forgot(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details: expect.stringContaining('valid email')
      });
    });
    
    it('should handle service errors', async () => {
      // Arrange
      const forgotRequest = {
        email: 'user@example.com'
      };
      
      req = mockRequest(forgotRequest);
      
      // Mock service error
      jest.spyOn(AuthService, 'initiatePasswordReset').mockResolvedValue({
        success: false,
        error: 'Internal server error during password reset'
      });
      
      // Act
      await PasswordController.forgot(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error during password reset'
      });
    });
  });
  
  describe('reset', () => {
    it('should reset password successfully with valid token and password', async () => {
      // Arrange
      const resetRequest = {
        token: 'valid-reset-token',
        newPassword: 'NewSecurePass123!'
      };
      
      req = mockRequest(resetRequest);
      
      // Mock successful password reset
      jest.spyOn(AuthService, 'resetPassword').mockResolvedValue({
        success: true
      });
      
      // Act
      await PasswordController.reset(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password has been reset successfully'
      });
      expect(AuthService.resetPassword).toHaveBeenCalledWith('valid-reset-token', 'NewSecurePass123!');
    });
    
    it('should return 400 if token is missing', async () => {
      // Arrange
      req = mockRequest({ newPassword: 'NewSecurePass123!' });
      
      // Act
      await PasswordController.reset(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details: expect.stringContaining('token')
      });
    });
    
    it('should return 400 if password is missing', async () => {
      // Arrange
      req = mockRequest({ token: 'valid-token' });
      
      // Act
      await PasswordController.reset(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details: expect.stringContaining('newPassword')
      });
    });
    
    it('should return 400 if password does not meet requirements', async () => {
      // Arrange
      req = mockRequest({ 
        token: 'valid-token',
        newPassword: 'weak'
      });
      
      // Act
      await PasswordController.reset(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details: expect.stringContaining('Password must contain')
      });
    });
    
    it('should handle service errors', async () => {
      // Arrange
      const resetRequest = {
        token: 'invalid-token',
        newPassword: 'NewSecurePass123!'
      };
      
      req = mockRequest(resetRequest);
      
      // Mock service error
      jest.spyOn(AuthService, 'resetPassword').mockResolvedValue({
        success: false,
        error: 'Invalid or expired reset token'
      });
      
      // Act
      await PasswordController.reset(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired reset token'
      });
    });
  });
  
  describe('change', () => {
    const mockUser = {
      userId: 'user-123',
      email: 'user@example.com',
      userType: 'USER'
    };
    
    it('should change password successfully for authenticated user', async () => {
      // Arrange
      const changeRequest = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewSecurePass123!'
      };
      
      req = mockRequest(changeRequest, mockUser);
      
      // Mock successful password change
      jest.spyOn(AuthService, 'changePassword').mockResolvedValue({
        success: true
      });
      
      // Act
      await PasswordController.change(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password has been changed successfully'
      });
      expect(AuthService.changePassword).toHaveBeenCalledWith(
        'user-123',
        'OldPassword123!',
        'NewSecurePass123!'
      );
    });
    
    it('should return 401 if user is not authenticated', async () => {
      // Arrange
      const changeRequest = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewSecurePass123!'
      };
      
      req = mockRequest(changeRequest); // No user attached
      
      // Act
      await PasswordController.change(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required'
      });
    });
    
    it('should return 400 if current password is missing', async () => {
      // Arrange
      req = mockRequest({ newPassword: 'NewSecurePass123!' }, mockUser);
      
      // Act
      await PasswordController.change(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details: expect.stringContaining('currentPassword')
      });
    });
    
    it('should return 400 if new password is missing', async () => {
      // Arrange
      req = mockRequest({ currentPassword: 'OldPassword123!' }, mockUser);
      
      // Act
      await PasswordController.change(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details: expect.stringContaining('newPassword')
      });
    });
    
    it('should return 400 if new password does not meet requirements', async () => {
      // Arrange
      req = mockRequest({
        currentPassword: 'OldPassword123!',
        newPassword: 'weak'
      }, mockUser);
      
      // Act
      await PasswordController.change(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details: expect.stringContaining('Password must contain')
      });
    });
    
    it('should handle service errors', async () => {
      // Arrange
      const changeRequest = {
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewSecurePass123!'
      };
      
      req = mockRequest(changeRequest, mockUser);
      
      // Mock service error
      jest.spyOn(AuthService, 'changePassword').mockResolvedValue({
        success: false,
        error: 'Current password is incorrect'
      });
      
      // Act
      await PasswordController.change(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Current password is incorrect'
      });
    });
  });
});