import { Request, Response, NextFunction } from 'express';
<<<<<<< HEAD
import { AuthService } from '../services/authService';
import { passwordResetRequestSchema, passwordResetSchema, passwordChangeSchema, validateInput } from '../utils/validation';
import { logger } from '../utils/logger';

// Extend Request interface to include body typing
interface TypedRequest<T> extends Request {
  body: T;
}

// Type the Response to ensure status method is available
type ExpressResponse = Response & {
  status(code: number): ExpressResponse;
  json(body?: unknown): ExpressResponse;
};

export class PasswordController {
  // POST /api/v1/password/forgot
  static async forgot(req: TypedRequest<{ email: string }>, res: ExpressResponse, next: NextFunction): Promise<void> {
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

  // POST /api/v1/password/reset
  static async reset(req: TypedRequest<{ token: string; password: string }>, res: ExpressResponse, next: NextFunction): Promise<void> {
    try {
      // Validate input data
      const { error, value } = validateInput<{ token: string; password: string }>(passwordResetSchema, req.body);

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      // Reset password
      const result = await AuthService.resetPassword(value!.token, value!.password);

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

  // PUT /api/v1/password/change
  static async change(req: TypedRequest<{ currentPassword: string; newPassword: string }>, res: ExpressResponse, next: NextFunction): Promise<void> {
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
=======

// Placeholder for PasswordController
// Will be implemented in task 12: Password management API endpoints

export class PasswordController {
  // POST /api/v1/password/forgot
  static async forgot(_req: Request, res: Response, _next: NextFunction) {
    // To be implemented
    res.status(501).json({ message: 'Not implemented yet' });
  }

  // POST /api/v1/password/reset
  static async reset(_req: Request, res: Response, _next: NextFunction) {
    // To be implemented
    res.status(501).json({ message: 'Not implemented yet' });
  }

  // PUT /api/v1/password/change
  static async change(_req: Request, res: Response, _next: NextFunction) {
    // To be implemented
    res.status(501).json({ message: 'Not implemented yet' });
>>>>>>> 61b77a379aa21ff00899f7fb6df7b19f71b6190b
  }
}