
import { Request, Response } from 'express';
import { authApiService } from '../services/authApiService';

export class SessionController {
    static async getSessions(req: Request, res: Response): Promise<void> {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            if (!token) {
                res.status(401).json({
                    success: false,
                    error: 'Authorization token is required'
                });
                return;
            }

            const result = await authApiService.getSessions(token);
            res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            console.error('Error in getSessions:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    static async revokeSession(req: Request, res: Response): Promise<void> {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            const { sessionId } = req.params;

            if (!token) {
                res.status(401).json({
                    success: false,
                    error: 'Authorization token is required'
                });
                return;
            }

            const result = await authApiService.revokeSession(token, sessionId);
            res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            console.error('Error in revokeSession:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
}
