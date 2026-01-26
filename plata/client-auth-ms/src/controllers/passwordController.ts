import { Request, Response } from 'express';
import { authApiService } from '../services/authApiService';

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

      const result = await authApiService.forgotPassword(email);
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
      const { token, password } = req.body;

      if (!token || !password) {
        res.status(400).json({
          success: false,
          error: 'Token and new password are required'
        });
        return;
      }

      const result = await authApiService.resetPassword(token, password);
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
      const token = req.headers.authorization?.replace('Bearer ', '');
      const { currentPassword, newPassword } = req.body;

      if (!token) {
        res.status(401).json({
          success: false,
          error: 'Authorization token is required'
        });
        return;
      }

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          error: 'Current password and new password are required'
        });
        return;
      }

      const result = await authApiService.changePassword(token, currentPassword, newPassword);
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