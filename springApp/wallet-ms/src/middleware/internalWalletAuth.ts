import { Request, Response, NextFunction } from 'express';
import { config } from '../config/environment';

/**
 * Validates X-Internal-Token against WALLET_INTERNAL_TOKEN for service-to-service calls.
 */
export const requireWalletInternalToken = (req: Request, res: Response, next: NextFunction): void => {
  if (!config.walletInternalToken) {
    res.status(503).json({
      success: false,
      error: 'Internal wallet API is not configured (set WALLET_INTERNAL_TOKEN on wallet-ms)'
    });
    return;
  }

  const provided = (req.header('x-internal-token') || '').trim();
  if (!provided || provided !== config.walletInternalToken) {
    res.status(401).json({
      success: false,
      error: 'Invalid or missing internal token'
    });
    return;
  }

  next();
};
