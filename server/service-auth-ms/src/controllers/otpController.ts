import { Request, Response, NextFunction } from 'express';

// Placeholder for OTPController
// Will be implemented in task 11: OTP API endpoints

export class OTPController {
  // POST /api/v1/otp/generate
  static async generate(_req: Request, res: Response, _next: NextFunction) {
    // To be implemented
    res.status(501).json({ message: 'Not implemented yet' });
  }

  // POST /api/v1/otp/verify
  static async verify(_req: Request, res: Response, _next: NextFunction) {
    // To be implemented
    res.status(501).json({ message: 'Not implemented yet' });
  }

  // POST /api/v1/otp/resend
  static async resend(_req: Request, res: Response, _next: NextFunction) {
    // To be implemented
    res.status(501).json({ message: 'Not implemented yet' });
  }
}