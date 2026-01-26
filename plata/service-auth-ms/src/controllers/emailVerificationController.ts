import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { logger } from '../utils/logger';

export class EmailVerificationController {
  /**
   * Verify email address using JWT token
   */
  static async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.query;

      // Validate token parameter
      if (!token || typeof token !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Invalid or missing verification token'
        });
        return;
      }

      // Verify the token and update user status
      const result = await AuthService.verifyEmailToken(token);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Email verified successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error || 'Invalid verification token'
        });
      }
    } catch (error) {
      logger.error('Error in verifyEmail:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}