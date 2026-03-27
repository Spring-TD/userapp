import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { UserType } from '../models/User';
import { logger } from '../utils/logger';

export class InternalUserController {
  /**
   * Internal lookup for merchant contact details.
   * Used by other services (e.g. compliance-ms) to send notifications.
   */
  static async getUserContact(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      if (!userId) {
        res.status(400).json({ success: false, error: 'userId is required' });
        return;
      }

      const user = await AuthService.getUserById(userId);
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      const userName = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();

      res.status(200).json({
        success: true,
        data: {
          userId: user.id,
          userType: user.user_type,
          email: user.email,
          userName,
          // Convenience: merchantId (if needed by downstream services)
          userMerchantId: user.user_merchant_id
        }
      });
    } catch (error) {
      logger.error('Internal getUserContact failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}

