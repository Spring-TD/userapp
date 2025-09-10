import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { GenerateOTPRequest, VerifyOTPRequest, ResendOTPRequest } from '../types/otpTypes';

// OTPController implementation
// Implemented as part of task 11: OTP API endpoints

export class OTPController {
  /**
   * POST /api/v1/otp/generate
   * Generate OTP for email verification, password reset, or login
   */
  static async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const { identifier, channel, purpose } = req.body as GenerateOTPRequest;
      
      // Validate required parameters
      if (!identifier || !channel || !purpose) {
        return res.status(400).json({ 
          success: false,
          error: 'Missing required parameters: identifier, channel, and purpose are required'
        });
      }
      
      // Validate channel
      if (channel !== 'email' && channel !== 'sms') {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid channel: must be either "email" or "sms"'
        });
      }
      
      // Validate purpose
      if (purpose !== 'verification' && purpose !== 'password-reset' && purpose !== 'login') {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid purpose: must be one of "verification", "password-reset", or "login"'
        });
      }
      
      // Generate OTP
      const result = await AuthService.generateOTP({ identifier, channel, purpose });
      
      if (!result.success) {
        return res.status(500).json({ 
          success: false,
          error: result.error 
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
        data: {
          reference: result.reference,
          expiresIn: result.expiresIn
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/otp/verify
   * Verify OTP code
   */
  static async verify(req: Request, res: Response, next: NextFunction) {
    try {
      const { identifier, code } = req.body as VerifyOTPRequest;
      
      // Validate required parameters
      if (!identifier || !code) {
        return res.status(400).json({ 
          success: false,
          error: 'Missing required parameters: identifier and code are required'
        });
      }
      
      // Verify OTP
      const result = await AuthService.verifyOTP({ identifier, code });
      
      if (!result.success) {
        return res.status(500).json({ 
          success: false,
          error: result.error 
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'OTP verified successfully',
        data: {
          verified: result.valid
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/otp/resend
   * Resend OTP code
   */
  static async resend(req: Request, res: Response, next: NextFunction) {
    try {
      const { reference } = req.body as ResendOTPRequest;
      
      // Validate required parameter
      if (!reference) {
        return res.status(400).json({ 
          success: false,
          error: 'Missing required parameter: reference is required'
        });
      }
      
      // Resend OTP
      const result = await AuthService.resendOTP({ reference });
      
      if (!result.success) {
        return res.status(500).json({ 
          success: false,
          error: result.error 
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'OTP resent successfully',
        data: {
          reference: result.reference,
          expiresIn: result.expiresIn
        }
      });
    } catch (error) {
      next(error);
    }
  }
}