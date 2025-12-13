import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        role?: string;
    };
    adminId?: string;
    token?: string;
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
