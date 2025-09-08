import { Request, Response, NextFunction } from 'express';
import { AuthService, UserRegistrationData, MerchantRegistrationData } from '../services/authService';
import { userRegistrationSchema, merchantRegistrationSchema, validateInput } from '../utils/validation';
import { logger } from '../utils/logger';

// Extend Request interface to include body typing
interface TypedRequest<T> extends Request {
  body: T;
}

// Type the Response to ensure status method is available
type ExpressResponse = Response & {
  status(code: number): ExpressResponse;
  json(body?: unknown): ExpressResponse;
};

export class AuthController {
  // POST /api/v1/auth/register/user
  static async registerUser(req: TypedRequest<UserRegistrationData>, res: ExpressResponse, next: NextFunction): Promise<void> {
    try {
      // Validate input data
      const { error, value } = validateInput<UserRegistrationData>(userRegistrationSchema, req.body);

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      // Register user
      const result = await AuthService.registerUser(value!);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('User registration successful', {
        userId: result.user!.id,
        email: result.user!.email
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully. Please check your email for verification instructions.',
        data: {
          user: {
            id: result.user!.id,
            email: result.user!.email,
            firstName: result.user!.firstName,
            lastName: result.user!.lastName,
            userType: result.user!.userType,
            status: result.user!.status,
            emailVerified: result.user!.emailVerified,
            createdAt: result.user!.createdAt
          }
        }
      });
    } catch (error) {
      logger.error('Error in registerUser controller', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  }

  // POST /api/v1/auth/register/merchant
  static async registerMerchant(req: TypedRequest<MerchantRegistrationData>, res: ExpressResponse, next: NextFunction): Promise<void> {
    try {
      // Validate input data
      const { error, value } = validateInput<MerchantRegistrationData>(merchantRegistrationSchema, req.body);

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      // Register merchant
      const result = await AuthService.registerMerchant(value!);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('Merchant registration successful', {
        userId: result.merchant!.id,
        email: result.merchant!.email,
        businessName: result.merchant!.businessName
      });

      res.status(201).json({
        success: true,
        message: 'Merchant registered successfully. Please check your email for verification instructions.',
        data: {
          merchant: {
            id: result.merchant!.id,
            email: result.merchant!.email,
            firstName: result.merchant!.firstName,
            lastName: result.merchant!.lastName,
            userType: result.merchant!.userType,
            status: result.merchant!.status,
            emailVerified: result.merchant!.emailVerified,
            businessName: result.merchant!.businessName,
            businessType: result.merchant!.businessType,
            createdAt: result.merchant!.createdAt
          }
        }
      });
    } catch (error) {
      logger.error('Error in registerMerchant controller', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  }

  // POST /api/v1/auth/verify-account
  static async verifyAccount(_req: Request, res: ExpressResponse, _next: NextFunction) {
    // To be implemented in task 9: Account verification system
    res.status(501).json({ message: 'Not implemented yet' });
  }

  // POST /api/v1/auth/login
  static async login(_req: Request, res: ExpressResponse, _next: NextFunction) {
    // To be implemented in task 10: Authentication endpoints implementation
    res.status(501).json({ message: 'Not implemented yet' });
  }

  // POST /api/v1/auth/logout
  static async logout(_req: Request, res: ExpressResponse, _next: NextFunction) {
    // To be implemented in task 10: Authentication endpoints implementation
    res.status(501).json({ message: 'Not implemented yet' });
  }

  // POST /api/v1/auth/refresh
  static async refresh(_req: Request, res: ExpressResponse, _next: NextFunction) {
    // To be implemented in task 10: Authentication endpoints implementation
    res.status(501).json({ message: 'Not implemented yet' });
  }
}