import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { OTPController } from '../controllers/otpController';
import { AuthService } from '../services/authService';
import { GenerateOTPRequest, VerifyOTPRequest, ResendOTPRequest } from '../types/otpTypes';

// Mock Express request, response, and next function
const mockRequest = (body: any = {}) => {
  return {
    body
  } as Request;
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

describe('OTPController', () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;
  
  beforeEach(() => {
    res = mockResponse();
    next = mockNext();
  });
  
  describe('generate', () => {
    it('should generate OTP successfully with valid parameters', async () => {
      // Arrange
      const generateRequest: GenerateOTPRequest = {
        identifier: 'user@example.com',
        channel: 'email',
        purpose: 'verification'
      };
      
      req = mockRequest(generateRequest);
      
      // Mock successful OTP generation
      jest.spyOn(AuthService, 'generateOTP').mockResolvedValue({
        success: true,
        reference: 'mock-reference-id',
        expiresIn: 300
      });
      
      // Act
      await OTPController.generate(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'OTP sent successfully',
        data: {
          reference: 'mock-reference-id',
          expiresIn: 300
        }
      });
    });
    
    it('should return 400 if missing required parameters', async () => {
      // Arrange
      req = mockRequest({});
      
      // Act
      await OTPController.generate(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Missing required parameters: identifier, channel, and purpose are required'
      });
    });
    
    it('should return 400 if invalid channel', async () => {
      // Arrange
      req = mockRequest({
        identifier: 'user@example.com',
        channel: 'invalid',
        purpose: 'verification'
      });
      
      // Act
      await OTPController.generate(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid channel: must be either "email" or "sms"'
      });
    });
    
    it('should return 400 if invalid purpose', async () => {
      // Arrange
      req = mockRequest({
        identifier: 'user@example.com',
        channel: 'email',
        purpose: 'invalid'
      });
      
      // Act
      await OTPController.generate(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid purpose: must be one of "verification", "password-reset", or "login"'
      });
    });
    
    it('should handle server errors', async () => {
      // Arrange
      const generateRequest: GenerateOTPRequest = {
        identifier: 'user@example.com',
        channel: 'email',
        purpose: 'verification'
      };
      
      req = mockRequest(generateRequest);
      
      // Mock server error
      jest.spyOn(AuthService, 'generateOTP').mockResolvedValue({
        success: false,
        error: 'Internal server error during OTP generation'
      });
      
      // Act
      await OTPController.generate(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error during OTP generation'
      });
    });
  });
  
  describe('verify', () => {
    it('should verify OTP successfully with valid parameters', async () => {
      // Arrange
      const verifyRequest: VerifyOTPRequest = {
        identifier: 'user@example.com',
        code: '123456'
      };
      
      req = mockRequest(verifyRequest);
      
      // Mock successful OTP verification
      jest.spyOn(AuthService, 'verifyOTP').mockResolvedValue({
        success: true,
        valid: true
      });
      
      // Act
      await OTPController.verify(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'OTP verified successfully',
        data: {
          verified: true
        }
      });
    });
    
    it('should return 400 if missing required parameters', async () => {
      // Arrange
      req = mockRequest({});
      
      // Act
      await OTPController.verify(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Missing required parameters: identifier and code are required'
      });
    });
    
    it('should handle server errors', async () => {
      // Arrange
      const verifyRequest: VerifyOTPRequest = {
        identifier: 'user@example.com',
        code: '123456'
      };
      
      req = mockRequest(verifyRequest);
      
      // Mock server error
      jest.spyOn(AuthService, 'verifyOTP').mockResolvedValue({
        success: false,
        error: 'Internal server error during OTP verification'
      });
      
      // Act
      await OTPController.verify(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error during OTP verification'
      });
    });
  });
  
  describe('resend', () => {
    it('should resend OTP successfully', async () => {
      // Arrange
      const resendRequest: ResendOTPRequest = {
        reference: 'mock-reference-id'
      };
      
      req = mockRequest(resendRequest);
      
      // Mock successful OTP resend
      jest.spyOn(AuthService, 'resendOTP').mockResolvedValue({
        success: true,
        reference: 'new-reference-id',
        expiresIn: 300
      });
      
      // Act
      await OTPController.resend(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'OTP resent successfully',
        data: {
          reference: 'new-reference-id',
          expiresIn: 300
        }
      });
    });
    
    it('should return 400 if missing reference', async () => {
      // Arrange
      req = mockRequest({});
      
      // Act
      await OTPController.resend(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Missing required parameter: reference is required'
      });
    });
    
    it('should handle server errors', async () => {
      // Arrange
      const resendRequest: ResendOTPRequest = {
        reference: 'mock-reference-id'
      };
      
      req = mockRequest(resendRequest);
      
      // Mock server error
      jest.spyOn(AuthService, 'resendOTP').mockResolvedValue({
        success: false,
        error: 'Internal server error during OTP resend'
      });
      
      // Act
      await OTPController.resend(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error during OTP resend'
      });
    });
  });
});