import { Request, Response, NextFunction } from 'express';
import { extractBearerToken, verifyAccessToken, AccessTokenUser } from '../utils/accessToken';

declare global {
  namespace Express {
    interface Request {
      accessUser?: AccessTokenUser;
    }
  }
}

export function requireAccessToken(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    res.status(401).json({ success: false, error: 'Access denied. Bearer access token required.' });
    return;
  }
  const user = verifyAccessToken(token);
  if (!user) {
    res.status(401).json({ success: false, error: 'Invalid or expired access token.' });
    return;
  }
  req.accessUser = user;
  next();
}

/** Ensures :recipient path param matches the authenticated user id. */
export function requireSelfRecipient(req: Request, res: Response, next: NextFunction): void {
  const recipient = req.params.recipient?.trim();
  const userId = req.accessUser?.userId;
  if (!recipient || !userId || recipient !== userId) {
    res.status(403).json({ success: false, error: 'Forbidden. You can only access your own notifications.' });
    return;
  }
  next();
}

/** Ensures JSON body userId matches the authenticated user (for push subscribe). */
export function requireSelfUserIdBody(req: Request, res: Response, next: NextFunction): void {
  const bodyUserId = typeof req.body?.userId === 'string' ? req.body.userId.trim() : '';
  const userId = req.accessUser?.userId;
  if (!bodyUserId || !userId || bodyUserId !== userId) {
    res.status(403).json({ success: false, error: 'Forbidden. userId must match the authenticated user.' });
    return;
  }
  next();
}
