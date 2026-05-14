import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/crypto';

// Extend the Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        userType: string;
        userMerchantId?: string;
        sessionId?: string;
      };
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }
    
    const token = authHeader.substring(7);
    
    // Verify token
    const verification = verifyToken(token, 'access');
    
    if (!verification.valid || !verification.payload) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
      return;
    }
    
    // Attach user info to request
    req.user = {
      userId: verification.payload.userId,
      email: verification.payload.email,
      userType: verification.payload.userType,
      userMerchantId: verification.payload.userMerchantId,
      sessionId: verification.payload.sessionId as string | undefined,
    };
    
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error during authentication'
    });
  }
};

/** If a Bearer token is present and valid, attaches `req.user`; otherwise continues without error. */
export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }
    const token = authHeader.substring(7);
    const verification = verifyToken(token, 'access');
    if (verification.valid && verification.payload) {
      req.user = {
        userId: verification.payload.userId,
        email: verification.payload.email,
        userType: verification.payload.userType,
        userMerchantId: verification.payload.userMerchantId,
        sessionId: verification.payload.sessionId as string | undefined,
      };
    }
    next();
  } catch {
    next();
  }
};

export const adminOnly = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }
  if (req.user.userType !== 'admin') {
    res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
    return;
  }
  next();
};

/** FAQ and similar content: both platform admins and merchants may act. */
export const merchantOrAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }
  if (req.user.userType !== 'admin' && req.user.userType !== 'merchant') {
    res.status(403).json({
      success: false,
      error: 'Merchant or admin access required',
    });
    return;
  }
  next();
};

export const extractToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      req.headers.token = token; // Store token in headers for later use
    }
    
    next();
  } catch (error) {
    next(error);
  }
};