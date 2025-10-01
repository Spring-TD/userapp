import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { validateInput } from '../utils/validation';
import { logger } from '../utils/logger';
import Joi from 'joi';

// Validation schemas for password management
const passwordResetRequestSchema = Joi.object({
  email: Joi.string().email().required()
});

const passwordResetSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
    })
});

const passwordChangeSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
    })
});

export class PasswordController {
  /**
   * POST /api/v1/password/forgot
   * Initiate password reset process
   */
  static async forgot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate input data
      const { error, value } = validateInput<{ email: string }>(passwordResetRequestSchema, req.body);

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      // Initiate password reset
      const result = await AuthService.initiatePasswordReset(value!.email);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('Password reset initiated', {
        email: value!.email
      });

      res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    } catch (error) {
      logger.error('Error in forgot password controller', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  }

  /**
   * POST /api/v1/password/reset
   * Reset password using token
   */
  static async reset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate input data
      const { error, value } = validateInput<{ token: string; newPassword: string }>(passwordResetSchema, req.body);

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      // Reset password
      const result = await AuthService.resetPassword(value!.token, value!.newPassword);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('Password reset successful');

      res.status(200).json({
        success: true,
        message: 'Password has been reset successfully'
      });
    } catch (error) {
      logger.error('Error in reset password controller', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  }

  /**
   * PUT /api/v1/password/change
   * Change password for authenticated user
   */
  static async change(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate input data
      const { error, value } = validateInput<{ currentPassword: string; newPassword: string }>(passwordChangeSchema, req.body);

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      // Check if user is authenticated
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Change password
      const result = await AuthService.changePassword(
        req.user.userId,
        value!.currentPassword,
        value!.newPassword
      );

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('Password change successful', {
        userId: req.user.userId,
        email: req.user.email
      });

      res.status(200).json({
        success: true,
        message: 'Password has been changed successfully'
      });
    } catch (error) {
      logger.error('Error in change password controller', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  }
}