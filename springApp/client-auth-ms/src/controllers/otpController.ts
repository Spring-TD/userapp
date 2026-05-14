import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';

export class OTPController {
  static async generate(req: Request, res: Response): Promise<void> {
    try {
      const { identifier, channel, purpose } = req.body;

      if (!identifier || !channel || !purpose) {
        res.status(400).json({
          success: false,
          error: 'Identifier, channel, and purpose are required'
        });
        return;
      }

      const result = await AuthService.generateOTP({ identifier, channel, purpose });
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Error in generateOTP:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async verify(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body || {};
      const identifier = body.identifier ?? body.email;
      const code = body.code ?? body.otp ?? body.verificationCode;

      if (!identifier || !code) {
        res.status(400).json({
          success: false,
          error: 'Identifier and code are required',
          hint: 'Send JSON body with "identifier" (email) and "code" (6-digit OTP). Use Content-Type: application/json.'
        });
        return;
      }

      const result = await AuthService.verifyOTP({ identifier: String(identifier).trim(), code: String(code).trim() });
      res.status(result.success ? 200 : 401).json(result);
    } catch (error) {
      console.error('Error in verifyOTP:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async resend(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body || {};
      const identifier = body.identifier ?? body.email;
      const channel = body.channel ?? 'email';
      const purpose = body.purpose ?? 'verification';

      if (!identifier) {
        res.status(400).json({
          success: false,
          error: 'Identifier (or email) is required.'
        });
        return;
      }
      const validChannels = ['email', 'sms'];
      const validPurposes = ['verification', 'password-reset', 'password-change', 'login'];
      if (!validChannels.includes(channel)) {
        res.status(400).json({ success: false, error: 'Channel must be "email" or "sms".' });
        return;
      }
      if (!validPurposes.includes(purpose)) {
        res.status(400).json({ success: false, error: 'Purpose must be "verification", "password-reset", "password-change", or "login".' });
        return;
      }

      const result = await AuthService.resendOTP({
        identifier: String(identifier).trim(),
        channel: channel as 'email' | 'sms',
        purpose: purpose as 'verification' | 'password-reset' | 'password-change' | 'login'
      });
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Error in resendOTP:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}