import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { AccountStatus, UserType } from '../models/User';
import { userProfileUpdateSchema, userVerificationSchema, userSuspensionSchema, userStatusUpdateSchema, validateInput } from '../utils/validation';
import { logger } from '../utils/logger';

export class UserController {
  /**
   * PUT /api/v1/user/:userId/status
   * Update user status (Merchant can update their users, Admin can update anyone)
   */
  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check if user is authenticated
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
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
        status: AccountStatus;
      }>(userStatusUpdateSchema, req.body);

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      // Get target user to check permissions
      const targetUserResult = await AuthService.getUserProfile(userId);
      if (!targetUserResult.success || !targetUserResult.user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }
      const targetUser = targetUserResult.user;

      // Check permissions
      const requesterType = req.user.userType.toLowerCase();

      if (requesterType === UserType.MERCHANT) {
        // Merchant can only update status of their own users
        if (!req.user.userMerchantId || targetUser.user_merchant_id !== req.user.userMerchantId) {
          res.status(403).json({
            success: false,
            error: 'Unauthorized: You can only manage your own users'
          });
          return;
        }
      } else if (requesterType !== UserType.ADMIN) {
        // Other users cannot update status
        res.status(403).json({
          success: false,
          error: 'Unauthorized: Insufficient permissions'
        });
        return;
      }

      // Update user status
      const result = await AuthService.updateUserStatus(userId, value!.status);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('User status updated via API', {
        targetUserId: userId,
        newStatus: value!.status,
        updatedBy: req.user.userId,
        updaterType: requesterType
      });

      res.status(200).json({
        success: true,
        message: 'User status updated successfully',
        data: {
          user: result.user
        }
      });
    } catch (error) {
      logger.error('Error in updateStatus controller', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  }

  /**
   * GET /api/v1/user/list
   * Get list of users for the authenticated merchant
   */
  static async getMerchantUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check if user is authenticated
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Check if user is a merchant or admin
      if (req.user.userType !== UserType.MERCHANT && req.user.userType !== UserType.ADMIN) {
        res.status(403).json({
          success: false,
          error: 'Access denied: Merchant or Admin only'
        });
        return;
      }

      const merchantId = req.user.userMerchantId || 'admin';

      // Get merchant users
      const result = await AuthService.getMerchantUsers(merchantId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          users: result.users
        }
      });
    } catch (error) {
      logger.error('Error in getMerchantUsers controller', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  }

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