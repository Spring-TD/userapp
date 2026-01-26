import { Request, Response } from 'express';
import { authApiService } from '../services/authApiService';

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

      const result = await authApiService.verifyAccount(token);
      res.status(result.success ? 200 : 400).json(result);
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

      const result = await authApiService.login(email, password);
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
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        res.status(401).json({
          success: false,
          error: 'Authorization token is required'
        });
        return;
      }

      const result = await authApiService.logout(token);
      res.status(result.success ? 200 : 401).json(result);
    } catch (error) {
      console.error('Error in logout:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
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

      const result = await authApiService.refreshToken(refreshToken);
      res.status(result.success ? 200 : 401).json(result);
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

      const result = await authApiService.getMe(token);
      res.status(result.success ? 200 : 401).json(result);
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

      const result = await authApiService.verifyToken(token);
      res.status(result.success ? 200 : 401).json(result);
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

      const result = await authApiService.checkEmailExists(email);
      res.status(result.success ? 200 : 404).json(result);
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

      const result = await authApiService.verifyEmail(token);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Error in verifyEmail:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}