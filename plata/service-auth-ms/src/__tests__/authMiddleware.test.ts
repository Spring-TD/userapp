import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { authenticate, authorize, optionalAuth, extractToken } from '../middleware/auth';
import { verifyToken } from '../utils/crypto';
import { tokenBlacklistService } from '../services/tokenBlacklistService';
import { UserType } from '../models/User';

// Mock dependencies
jest.mock('../utils/crypto');
jest.mock('../services/tokenBlacklistService');
jest.mock('../utils/logger');

const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;
const mockIsBlacklisted = tokenBlacklistService.isBlacklisted as jest.MockedFunction<typeof tokenBlacklistService.isBlacklisted>;

// Mock Express request, response, and next function
const mockRequest = (headers: any = {}, user: any = null) => {
  const req = {
    headers,
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

describe('Authentication Middleware', () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;
  
  beforeEach(() => {
    res = mockResponse();
    next = mockNext();
    jest.clearAllMocks();
  });
  
  describe('authenticate', () => {
    it('should authenticate user with valid token', async () => {
      // Arrange
      const mockUser = {
        userId: 'user-123',
        email: 'user@example.com',
        userType: UserType.USER,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };
      
      req = mockRequest({
        authorization: 'Bearer valid-token-123'
      });
      
      mockVerifyToken.mockReturnValue(mockUser);
      mockIsBlacklisted.mockResolvedValue(false);
      
      // Act
      await authenticate(req, res, next);
      
      // Assert
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
    
    it('should return 401 if no authorization header', async () => {
      // Arrange
      req = mockRequest();
      
      // Act
      await authenticate(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access token required',
        message: 'Please provide a valid Bearer token in the Authorization header'
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should return 401 if authorization header is not Bearer format', async () => {
      // Arrange
      req = mockRequest({
        authorization: 'Basic invalid-format'
      });
      
      // Act
      await authenticate(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access token required',
        message: 'Please provide a valid Bearer token in the Authorization header'
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should return 401 if token is invalid', async () => {
      // Arrange
      req = mockRequest({
        authorization: 'Bearer invalid-token'
      });
      
      mockVerifyToken.mockReturnValue(null);
      
      // Act
      await authenticate(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired token',
        message: 'The provided token is invalid or has expired'
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should return 401 if token is blacklisted', async () => {
      // Arrange
      const mockUser = {
        userId: 'user-123',
        email: 'user@example.com',
        userType: UserType.USER
      };
      
      req = mockRequest({
        authorization: 'Bearer blacklisted-token'
      });
      
      mockVerifyToken.mockReturnValue(mockUser);
      mockIsBlacklisted.mockResolvedValue(true);
      
      // Act
      await authenticate(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token has been revoked',
        message: 'This token has been invalidated and cannot be used'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
  
  describe('authorize', () => {
    const mockUser = {
      userId: 'user-123',
      email: 'user@example.com',
      userType: 'USER'
    };
    
    it('should authorize user with correct role', () => {
      // Arrange
      req = mockRequest({}, mockUser);
      const authorizeMiddleware = authorize([UserType.USER, UserType.MERCHANT]);
      
      // Act
      authorizeMiddleware(req, res, next);
      
      // Assert
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
    
    it('should return 401 if user is not authenticated', () => {
      // Arrange
      req = mockRequest();
      const authorizeMiddleware = authorize([UserType.USER]);
      
      // Act
      authorizeMiddleware(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
        message: 'You must be authenticated to access this resource'
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should return 403 if user does not have required role', () => {
      // Arrange
      req = mockRequest({}, mockUser);
      const authorizeMiddleware = authorize([UserType.MERCHANT]);
      
      // Act
      authorizeMiddleware(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient permissions',
        message: 'Access denied. Required roles: ADMIN'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
  
  describe('optionalAuth', () => {
    it('should attach user if valid token provided', async () => {
      // Arrange
      const mockUser = {
        userId: 'user-123',
        email: 'user@example.com',
        userType: UserType.USER
      };
      
      req = mockRequest({
        authorization: 'Bearer valid-token'
      });
      
      mockVerifyToken.mockReturnValue(mockUser);
      mockIsBlacklisted.mockResolvedValue(false);
      
      // Act
      await optionalAuth(req, res, next);
      
      // Assert
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
    
    it('should continue without user if no token provided', async () => {
      // Arrange
      req = mockRequest();
      
      // Act
      await optionalAuth(req, res, next);
      
      // Assert
      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
    
    it('should continue without user if invalid token provided', async () => {
      // Arrange
      req = mockRequest({
        authorization: 'Bearer invalid-token'
      });
      
      mockVerifyToken.mockReturnValue(null);
      
      // Act
      await optionalAuth(req, res, next);
      
      // Assert
      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
  
  describe('extractToken', () => {
    it('should extract token and attach to request', () => {
      // Arrange
      req = mockRequest({
        authorization: 'Bearer valid-token-123'
      });
      
      // Act
      extractToken(req, res, next);
      
      // Assert
      expect((req as any).token).toBe('valid-token-123');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
    
    it('should return 400 if no authorization header', () => {
      // Arrange
      req = mockRequest();
      
      // Act
      extractToken(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access token required',
        message: 'Please provide a valid Bearer token in the Authorization header'
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should return 400 if authorization header is not Bearer format', () => {
      // Arrange
      req = mockRequest({
        authorization: 'Basic invalid-format'
      });
      
      // Act
      extractToken(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access token required',
        message: 'Please provide a valid Bearer token in the Authorization header'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});