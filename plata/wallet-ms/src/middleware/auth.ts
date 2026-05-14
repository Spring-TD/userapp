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
        req.user = {
          ...response.data.data.user,
          userType: String(response.data.data.user.userType || '').toUpperCase(),
          merchantId:
            response.data.data.user.merchantId ||
            response.data.data.user.userMerchantId,
        };
        next();
      } else {
        res.status(401).json({
          success: false,
          error: 'Invalid token'
        });
      }
    } catch (authError) {
      res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
  } catch (error) {
    next(error);
  }
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
  
  if (req.user.userType !== 'MERCHANT') {
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
  
  if (req.user.userType !== 'USER') {
    res.status(403).json({
      success: false,
      error: 'Access denied. User access required.'
    });
    return;
  }
  
  next();
};