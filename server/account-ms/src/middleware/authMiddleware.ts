import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        role?: string;
    };
    adminId?: string;
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
