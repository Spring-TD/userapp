import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';

export interface ApplicationAuthRequest extends Request {
  adminId?: string;
  applicationsMerchantIdFilter?: string;
}

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void | Response => {
  const adminId = req.headers['x-admin-id'] as string | undefined;
  if (!adminId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Admin privileges required.'
    });
  }

  (req as ApplicationAuthRequest).adminId = adminId;
  next();
};

export const requireAdminOrMerchantApplicationList = (
  req: Request,
  res: Response,
  next: NextFunction
): void | Response => {
  const adminId = req.headers['x-admin-id'] as string | undefined;
  if (adminId) {
    (req as ApplicationAuthRequest).adminId = adminId;
    (req as ApplicationAuthRequest).applicationsMerchantIdFilter = undefined;
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Send x-admin-id (admin) or Authorization: Bearer <merchant JWT>.'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as {
      type?: string;
      userType?: string;
      userId?: string;
      userMerchantId?: string;
    };

    if (decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token type'
      });
    }

    if (decoded.userType !== 'merchant') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Merchant access token required for application listing without admin header.'
      });
    }

    const merchantId = decoded.userMerchantId || decoded.userId;
    if (!merchantId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Merchant id missing from token.'
      });
    }

    (req as ApplicationAuthRequest).applicationsMerchantIdFilter = merchantId;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};
