import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { SessionService } from '../services/SessionService';
import { verifyToken } from '../utils/crypto';

export class AuthController {
  // ===== ACCOUNT VERIFICATION =====
  static async verifyAccount(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({
          success: false,
          error: 'Verification token is required'
        });
        return;
      }

      // For now, just return success - in a real implementation, you'd verify the token
      // and update the user's email_verified status
      res.status(200).json({
        success: true,
        message: 'Email verification not fully implemented in this simplified version',
        data: { token }
      });
    } catch (error) {
      console.error('Error in verifyAccount:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // ===== AUTHENTICATION =====
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
        return;
      }

      const result = await AuthService.login(email, password, {
        userAgent: req.get('User-Agent') || undefined,
        ip: req.ip || req.socket.remoteAddress || undefined,
      });
      res.status(result.success ? 200 : 401).json(result);
    } catch (error) {
      console.error('Error in login:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const accessToken = req.headers.authorization?.replace('Bearer ', '');
      const refreshToken = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : undefined;

      if (accessToken) {
        const v = verifyToken(accessToken, 'access');
        if (v.valid && v.payload?.userId) {
          if (v.payload.sessionId) {
            await SessionService.revokeBySessionId(
              v.payload.userId,
              v.payload.sessionId as string
            );
          }
          res.status(200).json({
            success: true,
            message: 'Logged out successfully',
          });
          return;
        }
      }

      if (refreshToken) {
        const out = await SessionService.revokeWithRefreshToken(refreshToken);
        if (!out.success) {
          res.status(401).json({
            success: false,
            error: out.error || 'Invalid refresh token',
          });
          return;
        }
        res.status(200).json({
          success: true,
          message: 'Logged out successfully',
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: 'Provide Authorization Bearer access token or refreshToken in body',
      });
    } catch (error) {
      console.error('Error in logout:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: 'Refresh token is required'
        });
        return;
      }

      const result = await SessionService.refreshTokens(refreshToken);
      if (!result.success) {
        res.status(401).json({
          success: false,
          error: result.error,
        });
        return;
      }
      res.status(200).json({
        success: true,
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      });
    } catch (error) {
      console.error('Error in refreshToken:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async getMe(req: Request, res: Response): Promise<void> {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        res.status(401).json({
          success: false,
          error: 'Authorization token is required'
        });
        return;
      }

      // In a real implementation, you would verify the token and return user info
      // For now, just return an error indicating it's not implemented
      res.status(401).json({
        success: false,
        error: 'Get me functionality not fully implemented in this simplified version'
      });
    } catch (error) {
      console.error('Error in getMe:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async verifyToken(req: Request, res: Response): Promise<void> {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        res.status(401).json({
          success: false,
          error: 'Authorization token is required'
        });
        return;
      }

      const verification = verifyToken(token, 'access');

      if (!verification.valid || !verification.payload) {
        res.status(401).json({
          success: false,
          error: verification.error || 'Invalid or expired token'
        });
        return;
      }

      const user = {
        userId: verification.payload.userId,
        email: verification.payload.email,
        userType: verification.payload.userType,
        userMerchantId: verification.payload.userMerchantId,
        merchantId: verification.payload.userMerchantId,
        sessionId: verification.payload.sessionId as string | undefined,
      };

      res.status(200).json({
        success: true,
        message: 'Token is valid',
        data: {
          valid: true,
          user
        }
      });
    } catch (error) {
      console.error('Error in verifyToken:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async checkEmailExists(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.params;

      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Email parameter is required'
        });
        return;
      }

      // Check if email exists in our database
      const user = await AuthService.getUserByEmail(email);
      if (user) {
        res.status(200).json({
          success: true,
          exists: true,
          data: { email }
        });
      } else {
        res.status(404).json({
          success: false,
          exists: false,
          error: 'Email not found'
        });
      }
    } catch (error) {
      console.error('Error in checkEmailExists:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // ===== EMAIL VERIFICATION =====
  static async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Invalid or missing verification token'
        });
        return;
      }

      // For now, just return success - in a real implementation, you'd verify the token
      // and update the user's email_verified status
      res.status(200).json({
        success: true,
        message: 'Email verification not fully implemented in this simplified version',
        data: { token }
      });
    } catch (error) {
      console.error('Error in verifyEmail:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}