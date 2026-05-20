import { Request, Response, NextFunction } from 'express';
import { config } from '../config/environment';

/**
 * Guards wallet-ms -> payment-ms service calls.
 * Header: X-Internal-Token: <PAYMENT_INTERNAL_TOKEN>
 */
export const requirePaymentInternalToken = (req: Request, res: Response, next: NextFunction): void => {
  if (!config.paymentInternalToken) {
    res.status(503).json({
      success: false,
      error: 'Internal payment API is not configured (set PAYMENT_INTERNAL_TOKEN on payment-ms)'
    });
    return;
  }

  const provided = (req.header('x-internal-token') || '').trim();
  if (!provided || provided !== config.paymentInternalToken) {
    res.status(401).json({
      success: false,
      error: 'Invalid or missing internal token'
    });
    return;
  }

  next();
};
