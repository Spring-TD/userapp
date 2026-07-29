import { Request, Response, NextFunction } from 'express';
import { TransactionPinService } from '../services/transactionPinService';
import { notifyTransactionPinChanged } from '../services/transactionPinNotificationService';
import { logger } from '../utils/logger';

/** Resolve the path userId and enforce that the caller owns it. */
function resolveOwner(req: Request, res: Response): string | null {
  const { userId } = req.params;
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return null;
  }
  if (req.user.userId !== userId) {
    res.status(403).json({
      success: false,
      error: 'Access denied. Only the wallet owner can manage the transaction PIN.'
    });
    return null;
  }
  return userId;
}

export class TransactionPinController {
  /** GET /api/v1/wallets/user/:userId/transaction-pin/status */
  static async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = resolveOwner(req, res);
      if (!userId) return;
      const status = await TransactionPinService.getStatus(userId);
      res.status(200).json({ success: true, data: status });
    } catch (error) {
      logger.error('Error fetching transaction PIN status', { error });
      next(error);
    }
  }

  /** POST /api/v1/wallets/user/:userId/transaction-pin  body: { pin } */
  static async setPin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = resolveOwner(req, res);
      if (!userId) return;
      const result = await TransactionPinService.setPin(userId, req.body?.pin);
      if (!result.success) {
        res.status(result.status).json({ success: false, error: result.error, code: result.code });
        return;
      }
      res.status(result.status).json({ success: true, message: 'Transaction PIN created successfully' });
    } catch (error) {
      logger.error('Error setting transaction PIN', { error });
      next(error);
    }
  }

  /** PUT /api/v1/wallets/user/:userId/transaction-pin  body: { currentPin, newPin } */
  static async changePin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = resolveOwner(req, res);
      if (!userId) return;
      const result = await TransactionPinService.changePin(userId, req.body?.currentPin, req.body?.newPin);
      if (!result.success) {
        res.status(result.status).json({ success: false, error: result.error, code: result.code });
        return;
      }
      void notifyTransactionPinChanged({
        userId,
        email: req.user?.email,
        userName: req.user?.email?.split('@')[0]
      }).catch(() => undefined);
      res.status(result.status).json({ success: true, message: 'Transaction PIN updated successfully' });
    } catch (error) {
      logger.error('Error changing transaction PIN', { error });
      next(error);
    }
  }
}
