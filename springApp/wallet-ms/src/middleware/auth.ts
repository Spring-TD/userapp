import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { config } from '../config/environment';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        userType: string;
        merchantId?: string;
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
    
    // Verify token with auth service
    try {
      const response = await axios.post(
        `${config.authServiceUrl}/api/v1/auth/verify-token`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success && response.data.data?.user) {
        const user = response.data.data.user;
        req.user = {
          ...user,
          // Normalize merchant identity from either auth payload shape.
          merchantId: user.merchantId || user.userMerchantId
        };
        next();
      } else {
        res.status(401).json({
          success: false,
          error: 'Invalid token'
        });
      }
    } catch (authError) {
      if (axios.isAxiosError(authError)) {
        const upstreamStatus = authError.response?.status;
        const upstreamError =
          authError.response?.data?.error ||
          authError.response?.data?.message ||
          authError.message;

        console.error('Auth service token verification failed', {
          authServiceUrl: config.authServiceUrl,
          upstreamStatus,
          upstreamError
        });

        if (upstreamStatus === 401) {
          res.status(401).json({
            success: false,
            error: upstreamError || 'Invalid token'
          });
          return;
        }

        res.status(503).json({
          success: false,
          error: 'Auth service unreachable'
        });
        return;
      }

      console.error('Unexpected auth middleware error', authError);
      res.status(503).json({
        success: false,
        error: 'Auth service unreachable'
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Best-effort auth: if a valid Bearer token is present, populates req.user; otherwise
 * proceeds without error. Used by endpoints that also accept a signed link token
 * (e.g. receipt PDF download links embedded in notifications).
 */
export const optionalAuthenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }
    const token = authHeader.substring(7);
    const response = await axios.post(
      `${config.authServiceUrl}/api/v1/auth/verify-token`,
      {},
      { headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true }
    );
    if (response.data?.success && response.data?.data?.user) {
      const user = response.data.data.user;
      req.user = { ...user, merchantId: user.merchantId || user.userMerchantId };
    }
  } catch {
    // best-effort; fall through unauthenticated
  }
  next();
};

export const authorizeMerchant = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
    return;
  }
  
  const userType = (req.user.userType || '').toLowerCase();
  if (userType !== 'merchant') {
    res.status(403).json({
      success: false,
      error: 'Access denied. Merchant access required.'
    });
    return;
  }
  
  next();
};

export const authorizeUser = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
    return;
  }
  
  const userType = (req.user.userType || '').toLowerCase();
  if (userType !== 'user') {
    res.status(403).json({
      success: false,
      error: 'Access denied. User access required.'
    });
    return;
  }
  
  next();
};