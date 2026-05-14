import { Request, Response, NextFunction } from 'express';
import { WalletService } from '../services';
import { logger } from '../utils/logger';

/**
 * POST /api/v1/internal/wallets/user
 * Creates a user wallet (and Payonus NUBAN when enabled) without an end-user JWT.
 * Called from client-auth-ms after merchant-scoped user signup.
 */
export class InternalWalletController {
  static async createUserWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, merchantId, name, currency, complianceShareholderUserId } = req.body as {
        userId?: string;
        merchantId?: string;
        name?: string;
        currency?: string;
        complianceShareholderUserId?: string;
      };

      if (!userId || typeof userId !== 'string' || !userId.trim()) {
        res.status(400).json({ success: false, error: 'userId is required' });
        return;
      }
      if (!merchantId || typeof merchantId !== 'string' || !merchantId.trim()) {
        res.status(400).json({ success: false, error: 'merchantId is required' });
        return;
      }

      const result = await WalletService.createUserWallet({
        userId: userId.trim(),
        merchantId: merchantId.trim(),
        complianceShareholderUserId: complianceShareholderUserId?.trim() || userId.trim(),
        name: (name && String(name).trim()) || 'Personal Wallet',
        currency: (currency && String(currency).trim().toUpperCase()) || 'NGN'
      });

      if (!result.success) {
        res.status(400).json({ success: false, error: result.error || 'Failed to create user wallet' });
        return;
      }

      logger.info('Internal API: user wallet created', {
        userId: userId.trim(),
        merchantId: merchantId.trim(),
        walletId: result.wallet?.id
      });

      res.status(201).json({
        success: true,
        message: 'User wallet created successfully',
        data: { wallet: result.wallet }
      });
    } catch (error) {
      logger.error('Internal API: create user wallet failed', { error });
      next(error);
    }
  }
}
