import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { userProfileUpdateSchema, userVerificationSchema, userSuspensionSchema, validateInput } from '../utils/validation';
import { logger } from '../utils/logger';
import { AccountStatus } from '../models/User';

export class UserController {
  /**
   * GET /api/v1/user/profile
   * Get current user's profile
   */
  static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check if user is authenticated
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Get user profile
      const result = await AuthService.getUserProfile(req.user.userId);

      if (!result.success) {
        res.status(404).json({
          success: false,
          error: result.error
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          user: result.user
        }
      });
    } catch (error) {
      logger.error('Error in getProfile controller', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  }

  /**
   * PUT /api/v1/user/profile
   * Update current user's profile
   */
  static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check if user is authenticated
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Validate input data
      const { error, value } = validateInput<{
        first_name?: string;
        last_name?: string;
        phone?: string;
        country?: string;
      }>(userProfileUpdateSchema, req.body);

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      // Update user profile
      const result = await AuthService.updateUserProfile(req.user.userId, value!);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('User profile updated', {
        userId: req.user.userId,
        email: req.user.email
      });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: result.user
        }
      });
    } catch (error) {
      logger.error('Error in updateProfile controller', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  }

  /**
   * GET /api/v1/user/info/:userId
   * Get detailed user information (admin only)
   */
  static async getInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check if user is authenticated
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Check if user has admin role
      if (req.user.userType !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
        return;
      }
      
      const { userId } = req.params;
      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
        return;
      }

      // Get detailed user information
      const result = await AuthService.getUserInfo(userId);

      if (!result.success) {
        res.status(404).json({
          success: false,
          error: result.error
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          user: result.user
        }
      });
    } catch (error) {
      logger.error('Error in getInfo controller', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  }

  /**
   * POST /api/v1/user/verify-info/:userId
   * Verify user information (admin only)
   */
  static async verifyInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check if user is authenticated
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Check if user has admin role
      if (req.user.userType !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
        return;
      }
      
      const { userId } = req.params;
      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
        return;
      }

      // Validate input data
      const { error, value } = validateInput<{
        email_verified?: boolean;
        phone_verified?: boolean;
        status?: AccountStatus;
        notes?: string;
      }>(userVerificationSchema, req.body);

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      // Verify user information
      const result = await AuthService.verifyUserInfo(userId, value!);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('User information verified', {
        userId,
        verifiedBy: req.user.userId,
        verificationData: value
      });

      res.status(200).json({
        success: true,
        message: 'User information verified successfully',
        data: {
          user: result.user
        }
      });
    } catch (error) {
      logger.error('Error in verifyInfo controller', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  }

  /**
   * PUT /api/v1/user/suspend/:userId
   * Suspend user account (admin only)
   */
  static async suspend(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check if user is authenticated
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Check if user has admin role
      if (req.user.userType !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
        return;
      }
      
      const { userId } = req.params;
      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
        return;
      }

      // Prevent users from suspending themselves
      if (userId === req.user.userId) {
        res.status(400).json({
          success: false,
          error: 'Cannot suspend your own account'
        });
        return;
      }

      // Validate input data
      const { error, value } = validateInput<{
        reason?: string;
      }>(userSuspensionSchema, req.body);

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      // Suspend user account
      const result = await AuthService.suspendUser(userId, value?.reason);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('User account suspended', {
        userId,
        suspendedBy: req.user.userId,
        reason: value?.reason
      });

      res.status(200).json({
        success: true,
        message: 'User account suspended successfully',
        data: {
          user: result.user
        }
      });
    } catch (error) {
      logger.error('Error in suspend controller', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  }

  /**
   * PUT /api/v1/user/activate/:userId
   * Activate user account (admin only)
   */
  static async activate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check if user is authenticated
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Check if user has admin role
      if (req.user.userType !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
        return;
      }
      
      const { userId } = req.params;
      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
        return;
      }

      // Activate user account
      const result = await AuthService.activateUser(userId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('User account activated', {
        userId,
        activatedBy: req.user.userId
      });

      res.status(200).json({
        success: true,
        message: 'User account activated successfully',
        data: {
          user: result.user
        }
      });
    } catch (error) {
      logger.error('Error in activate controller', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  }
}