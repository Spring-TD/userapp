import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { UserType } from '../models/User';
import { userProfileUpdateSchema, validateForm, updateEmailSchema } from '../utils/validation';

function firstString(value: unknown): string {
  if (Array.isArray(value)) {
    return firstString(value[0]);
  }
  return typeof value === 'string' ? value.trim() : '';
}

export class UserController {
  // Get user profile
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const user = await AuthService.getUserById(req.user.userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      // Retail users get their KYC status so the storefront can gate/route UX.
      const kycSummary = await AuthService.resolveKycSummary(user);

      res.status(200).json({
        success: true,
        data: { user, ...(kycSummary ?? {}) }
      });
    } catch (error) {
      console.error('Error getting user profile:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Update user profile
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const validation = validateForm<{
        first_name?: string;
        last_name?: string;
        phone?: string;
        country?: string;
      }>(userProfileUpdateSchema, req.body);

      if (validation.error) {
        res.status(400).json({
          success: false,
          error: validation.error
        });
        return;
      }

      const result = await AuthService.updateUserProfile(req.user.userId, {
        ...(validation.value || {}),
        profilePictureFile: req.file
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: result.user
        }
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Update email (Developer → Security: new email + confirm email; requires current password)
  static async updateEmail(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const validation = validateForm<{ newEmail: string; confirmEmail: string; currentPassword: string }>(
        updateEmailSchema,
        req.body
      );
      if (validation.error) {
        res.status(400).json({
          success: false,
          error: validation.error
        });
        return;
      }

      const { newEmail, currentPassword } = validation.value!;
      const result = await AuthService.updateEmail(req.user.userId, currentPassword, newEmail);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Email updated successfully. Please verify your new email address.',
        data: { user: result.user }
      });
    } catch (error) {
      console.error('Error updating email:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // List users
  static async listUsers(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      if (req.user.userType !== UserType.MERCHANT && req.user.userType !== UserType.ADMIN) {
        res.status(403).json({
          success: false,
          error: 'Access denied: Merchant or Admin only'
        });
        return;
      }

      const merchantId =
        req.user.userType === UserType.ADMIN
          ? req.user.userMerchantId || 'admin'
          : req.user.userMerchantId || req.user.userId;
      const appId =
        firstString(req.headers['x-tenant-app-id']) ||
        firstString(req.headers['x-app-id']) ||
        firstString(req.query.appId) ||
        firstString(req.query.app_id) ||
        firstString(req.query.applicationId);

      if (req.user.userType === UserType.MERCHANT && !appId) {
        res.status(400).json({
          success: false,
          error:
            'appId is required to list app-scoped customers. Use GET /api/v1/user/list?appId={appId} or GET /api/v1/apps/{appId}/customers'
        });
        return;
      }

      const result = await AuthService.getMerchantUsers(merchantId, appId || undefined);

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
      console.error('Error listing users:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Update user status
  static async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { userId } = req.params;
      const { status } = req.body;

      res.status(500).json({
        success: false,
        error: 'Update user status functionality not fully implemented in this simplified version'
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Deactivate user
  static async deactivate(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const result = await AuthService.deactivateAccount(req.user.userId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Account deactivated successfully'
      });
    } catch (error) {
      console.error('Error deactivating user:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Update callback URLs
  static async updateCallbackUrls(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Update callback URLs functionality not fully implemented in this simplified version'
      });
    } catch (error) {
      console.error('Error updating callback URLs:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Get user info
  static async getInfo(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { userId } = req.params;

      res.status(500).json({
        success: false,
        error: 'Get user info functionality not fully implemented in this simplified version'
      });
    } catch (error) {
      console.error('Error getting user info:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Verify user info
  static async verifyInfo(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { userId } = req.params;

      res.status(500).json({
        success: false,
        error: 'Verify user info functionality not fully implemented in this simplified version'
      });
    } catch (error) {
      console.error('Error verifying user info:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Suspend user
  static async suspend(req: Request, res: Response): Promise<void> {
    try {
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
          error: 'userId is required'
        });
        return;
      }

      const result = await AuthService.suspendStaffUser(req.user.userId, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'User suspended successfully',
          data: { user: result.user }
        });
        return;
      }

      const err = result.error || 'Request failed';
      if (err === 'User not found') {
        res.status(404).json({ success: false, error: err });
        return;
      }
      if (err === 'Actor user not found') {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }
      if (err.startsWith('Insufficient permissions')) {
        res.status(403).json({ success: false, error: err });
        return;
      }
      res.status(400).json({ success: false, error: err });
    } catch (error) {
      console.error('Error suspending user:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Activate user
  static async activate(req: Request, res: Response): Promise<void> {
    try {
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
          error: 'userId is required'
        });
        return;
      }

      const result = await AuthService.activateStaffUser(req.user.userId, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'User activated successfully',
          data: { user: result.user }
        });
        return;
      }

      const err = result.error || 'Request failed';
      if (err === 'User not found') {
        res.status(404).json({ success: false, error: err });
        return;
      }
      if (err === 'Actor user not found') {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }
      if (err.startsWith('Insufficient permissions')) {
        res.status(403).json({ success: false, error: err });
        return;
      }
      res.status(400).json({ success: false, error: err });
    } catch (error) {
      console.error('Error activating user:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}