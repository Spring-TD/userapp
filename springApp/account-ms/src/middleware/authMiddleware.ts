import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        role?: string;
    };
    adminId?: string;
    token?: string;
    /** Set by requireAdminOrMerchantApplicationList for GET /applications listings */
    applicationsMerchantIdFilter?: string;
}

/**
 * Middleware to check if the request is from an authenticated admin.
 * This is a mock implementation that checks for the 'x-admin-id' header.
 * In a production environment, this would validate a JWT token and check user roles.
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    const adminId = req.headers['x-admin-id'] as string;

    if (!adminId) {
        return res.status(403).json({
            success: false,
            error: 'Access denied. Admin privileges required.'
        });
    }

    // Attach adminId to the request object
    (req as AuthRequest).adminId = adminId;

    next();
    return;
};

/**
 * Allows listing applications either as admin (x-admin-id) or as merchant (Bearer JWT from client-auth-ms).
 * Admins see all applications; merchants only see applications tied to their merchantId on the product's app.
 */
export const requireAdminOrMerchantApplicationList = (req: Request, res: Response, next: NextFunction) => {
    const adminId = req.headers['x-admin-id'] as string | undefined;

    if (adminId) {
        (req as AuthRequest).adminId = adminId;
        (req as AuthRequest).applicationsMerchantIdFilter = undefined;
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

        (req as AuthRequest).applicationsMerchantIdFilter = merchantId;
        next();
        return;
    } catch {
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired token'
        });
    }
};

/**
 * Middleware to check if the request contains an authorization token.
 * Does not validate the token itself, relying on downstream services or subsequent steps.
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required. Missing or invalid Authorization header.'
        });
    }

    const token = authHeader.split(' ')[1];
    (req as AuthRequest).token = token;

    next();
    return;
};
