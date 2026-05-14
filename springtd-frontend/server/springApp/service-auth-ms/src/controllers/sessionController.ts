
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { logger } from '../utils/logger';

export class SessionController {
    /**
     * GET /api/v1/sessions
     * Get active sessions for the current user
     */
    static async getSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }

            const result = await AuthService.getUserSessions(req.user.userId);

            if (!result.success) {
                res.status(500).json({
                    success: false,
                    error: result.error
                });
                return;
            }

            // Map sessions to frontend-friendly format (hide sensitive data)
            const sessions = result.sessions?.map(s => ({
                id: s.id,
                deviceInfo: s.deviceInfo || 'Unknown Device',
                ipAddress: s.ipAddress || 'Unknown IP',
                lastActiveAt: s.lastActiveAt,
                isCurrent: false // The client can determine "current" via matching Session ID if stored, or by checking current refresh token?
                // Ideally we would flag "isCurrent" if the session matches the current request's refresh token
                // But headers usually only have access token.
            }));

            res.status(200).json({
                success: true,
                data: {
                    sessions
                }
            });
        } catch (error) {
            logger.error('Error in getSessions controller', { error: error instanceof Error ? error.message : 'Unknown error' });
            next(error);
        }
    }

    /**
     * DELETE /api/v1/sessions/:sessionId
     * Revoke a specific session
     */
    static async revokeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }

            const { sessionId } = req.params;
            if (!sessionId) {
                res.status(400).json({
                    success: false,
                    error: 'Session ID is required'
                });
                return;
            }

            const result = await AuthService.revokeSession(req.user.userId, sessionId);

            if (!result.success) {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
                return;
            }

            logger.info('Session revoked successfully', { userId: req.user.userId, sessionId });

            res.status(200).json({
                success: true,
                message: 'Session revoked successfully'
            });
        } catch (error) {
            logger.error('Error in revokeSession controller', { error: error instanceof Error ? error.message : 'Unknown error' });
            next(error);
        }
    }
}
