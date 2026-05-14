import { Request, Response, NextFunction } from 'express';
import { config } from '../config/environment';

export const requireInternalToken = (req: Request, res: Response, next: NextFunction): void => {
  const token = (req.header('X-Internal-Token') || '').trim();
  if (!token || token !== config.serviceAuthInternalToken) {
    res.status(401).json({ success: false, error: 'Unauthorized internal request' });
    return;
  }
  next();
};
