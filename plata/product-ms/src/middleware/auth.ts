import type { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { config } from '../config/environment';

declare global {
  namespace Express {
    interface Request {
      authUser?: {
        userId: string;
        email: string;
        userType: string;
        /** Merchant account id (product creator id in snapshots) */
        merchantAccountId: string;
      };
    }
  }
}

/**
 * Verifies Bearer JWT via client-auth-ms (same as gateway /api/v1/auth).
 */
export async function authenticateJwt(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    const token = authHeader.slice(7);
    const response = await axios.post<{
      success?: boolean;
      data?: {
        user?: {
          userId?: string;
          email?: string;
          userType?: string;
          merchantId?: string;
          userMerchantId?: string;
        };
      };
    }>(
      `${config.clientAuthUrl}/api/v1/auth/verify-token`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10_000,
        validateStatus: () => true
      }
    );

    if (response.status !== 200 || !response.data?.success) {
      res.status(401).json({ success: false, error: 'Invalid token' });
      return;
    }

    const u = response.data.data?.user;
    const merchantAccountId = (u?.merchantId ?? u?.userMerchantId ?? '').trim();
    if (!u?.userId || !u?.userType) {
      res.status(401).json({ success: false, error: 'Invalid token payload' });
      return;
    }

    req.authUser = {
      userId: u.userId,
      email: u.email ?? '',
      userType: String(u.userType ?? '').toUpperCase(),
      merchantAccountId
    };
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Authentication failed' });
  }
}

export function requireMerchantCreator(req: Request, res: Response, next: NextFunction): void {
  if (!req.authUser) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  if (String(req.authUser.userType ?? '').toUpperCase() !== 'MERCHANT') {
    res.status(403).json({ success: false, error: 'Merchant access required' });
    return;
  }
  if (!req.authUser.merchantAccountId) {
    res.status(403).json({
      success: false,
      error: 'Merchant account id missing from token'
    });
    return;
  }
  next();
}
