import { Request, Response } from 'express';
import { SessionService } from '../services/SessionService';

export class SessionController {
  static async getSessions(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const sessions = await SessionService.listActiveSessions(req.user.userId);
      const currentSessionId = req.user.sessionId;

      res.status(200).json({
        success: true,
        data: {
          sessions: sessions.map((s) => ({
            ...s,
            isCurrent: currentSessionId != null && s.id === currentSessionId,
          })),
        },
      });
    } catch (error) {
      console.error('Error in getSessions:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  static async revokeSession(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: 'Session ID is required',
        });
        return;
      }

      const revoked = await SessionService.revokeBySessionId(req.user.userId, sessionId);
      if (!revoked) {
        res.status(404).json({
          success: false,
          error: 'Session not found or already revoked',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Session revoked successfully',
      });
    } catch (error) {
      console.error('Error in revokeSession:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}
