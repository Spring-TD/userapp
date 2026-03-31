import { Request, Response, NextFunction } from 'express';
import { config } from '../config/environment';

/**
 * Internal service-to-service auth middleware.
 * Requires `X-Internal-Token` header to match configured token.
 */
export const requireInternalToken = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.header('X-Internal-Token');
  if (!token || token !== config.internal.serviceToken) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized internal request',
    });
    return;
  }

  next();
};

