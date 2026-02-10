import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';

export class OTPController {
  static async generate(req: Request, res: Response): Promise<void> {
    try {
      const { identifier, channel, purpose } = req.body;

      if (!identifier || !channel || !purpose) {
        res.status(400).json({
          success: false,
          error: 'Identifier, channel, and purpose are required'
        });
        return;
      }

      const result = await AuthService.generateOTP({ identifier, channel, purpose });
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Error in generateOTP:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async verify(req: Request, res: Response): Promise<void> {
    try {
      const { identifier, code } = req.body;

      if (!identifier || !code) {
        res.status(400).json({
          success: false,
          error: 'Identifier and code are required'
        });
        return;
      }

      const result = await AuthService.verifyOTP({ identifier, code });
      res.status(result.success ? 200 : 401).json(result);
    } catch (error) {
      console.error('Error in verifyOTP:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async resend(req: Request, res: Response): Promise<void> {
    try {
      const { identifier, channel, purpose } = req.body;

      if (!identifier || !channel || !purpose) {
        res.status(400).json({
          success: false,
          error: 'Identifier, channel, and purpose are required'
        });
        return;
      }

      const result = await AuthService.resendOTP({ identifier });
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Error in resendOTP:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}