import { Request, Response } from 'express';
import { authApiService } from '../services/authApiService';

export class UserController {
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        res.status(401).json({
          success: false,
          error: 'Authorization token is required'
        });
        return;
      }

      const result = await authApiService.getUserProfile(token);
      res.status(result.success ? 200 : 401).json(result);
    } catch (error) {
      console.error('Error in getUserProfile:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const profileData = req.body;

      if (!token) {
        res.status(401).json({
          success: false,
          error: 'Authorization token is required'
        });
        return;
      }

      const result = await authApiService.updateUserProfile(token, profileData);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Error in updateProfile:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const { userId } = req.params;
      const { status } = req.body;

      if (!token) {
        res.status(401).json({
          success: false,
          error: 'Authorization token is required'
        });
        return;
      }

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
        return;
      }

      const result = await authApiService.updateUserStatus(token, userId, status);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Error in updateStatus:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async getInfo(req: Request, res: Response): Promise<void> {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const { userId } = req.params;

      if (!token) {
        res.status(401).json({
          success: false,
          error: 'Authorization token is required'
        });
        return;
      }

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
        return;
      }

      const result = await authApiService.getUserInfo(token, userId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      console.error('Error in getUserInfo:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async verifyInfo(req: Request, res: Response): Promise<void> {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const { userId } = req.params;
      const verificationData = req.body;

      if (!token) {
        res.status(401).json({
          success: false,
          error: 'Authorization token is required'
        });
        return;
      }

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
        return;
      }

      const result = await authApiService.verifyUserInfo(token, userId, verificationData);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Error in verifyUserInfo:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async suspend(req: Request, res: Response): Promise<void> {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const { userId } = req.params;
      const { reason } = req.body;

      if (!token) {
        res.status(401).json({
          success: false,
          error: 'Authorization token is required'
        });
        return;
      }

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
        return;
      }

      const result = await authApiService.suspendUser(token, userId, reason);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Error in suspendUser:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async activate(req: Request, res: Response): Promise<void> {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const { userId } = req.params;

      if (!token) {
        res.status(401).json({
          success: false,
          error: 'Authorization token is required'
        });
        return;
      }

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
        return;
      }

      const result = await authApiService.activateUser(token, userId);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Error in activateUser:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}