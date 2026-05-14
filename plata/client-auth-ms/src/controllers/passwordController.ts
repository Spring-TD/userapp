import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';

export class PasswordController {
  static async forgot(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Email is required'
        });
        return;
      }

      const result = await AuthService.initiatePasswordReset(email);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Error in forgotPassword:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async reset(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body || {};
      const identifier = body.identifier ?? body.email;
      const code = body.code ?? body.otp ?? body.verificationCode;
      const { newPassword } = body;

      if (!identifier || !code || !newPassword) {
        res.status(400).json({
          success: false,
          error: 'Email, OTP code, and new password are required'
        });
        return;
      }

      const result = await AuthService.resetPassword(
        String(identifier).trim(),
        String(code).trim(),
        String(newPassword)
      );
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Error in resetPassword:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async change(req: Request, res: Response): Promise<void> {
    try {
      // Check if user is authenticated
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          error: 'Current password and new password are required'
        });
        return;
      }

      const result = await AuthService.changePassword(req.user.userId, currentPassword, newPassword);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Error in changePassword:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}