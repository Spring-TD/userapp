import { Request, Response, NextFunction } from 'express';
import { AuthService, UserRegistrationData, MerchantRegistrationData, LoginResponse } from '../services/authService';
import { userRegistrationSchema, merchantRegistrationSchema, validateInput } from '../utils/validation';
import { logger } from '../utils/logger';
import Joi from 'joi';

// Extend Request interface to include token
declare global {
  namespace Express {
    interface Request {
      token?: string;
    }
  }
}

// Validation schemas
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required()
});

const emailVerificationSchema = Joi.object({
  token: Joi.string().required()
});

const logoutSchema = Joi.object({
  refreshToken: Joi.string().optional()
});

export class AuthController {
  /**
   * POST /api/v1/auth/register/user
   * Register a new user account
   */
  static async registerUser(req: Request, res: Response, next: NextFunction): Promise<void> {
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
            first_name: result.user!.first_name,
            last_name: result.user!.last_name,
            user_type: result.user!.user_type,
            status: result.user!.status,
            email_verified: result.user!.email_verified,
            created_at: result.user!.created_at
          }
        }
      });
    } catch (error) {
      logger.error('Error in registerUser controller', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/register/merchant
   * Register a new merchant account
   */
  static async registerMerchant(req: Request, res: Response, next: NextFunction): Promise<void> {
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
        user_merchant_id: result.merchant!.user_merchant_id
      });

      res.status(201).json({
        success: true,
        message: 'Merchant registered successfully. Please check your email for verification instructions.',
        data: {
          merchant: {
            id: result.merchant!.id,
            email: result.merchant!.email,
            first_name: result.merchant!.first_name,
            last_name: result.merchant!.last_name,
            user_type: result.merchant!.user_type,
            status: result.merchant!.status,
            email_verified: result.merchant!.email_verified,
            user_merchant_id: result.merchant!.user_merchant_id,
            country: result.merchant!.country,
            created_at: result.merchant!.created_at
          }
        }
      });
    } catch (error) {
      logger.error('Error in registerMerchant controller', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/login
   * Authenticate user and return tokens
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate input data
      const { error, value } = validateInput<{ email: string; password: string }>(loginSchema, req.body);

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      // Authenticate user
      const result: LoginResponse = await AuthService.login(value!.email, value!.password);

      if (!result.success) {
        res.status(401).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('User login successful', {
        userId: result.user?.id,
        email: result.user?.email
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: result.user!.id,
            email: result.user!.email,
            first_name: result.user!.first_name,
            last_name: result.user!.last_name,
            user_type: result.user!.user_type,
            status: result.user!.status,
            email_verified: result.user!.email_verified,
            phone_verified: result.user!.phone_verified,
            last_login_at: result.user!.last_login_at,
            created_at: result.user!.created_at
          },
          tokens: {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken
          }
        }
      });
    } catch (error) {
      logger.error('Error in login controller', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/logout
   * Logout user by blacklisting tokens
   */
  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate input data
      const { error, value } = validateInput<{ refreshToken?: string }>(logoutSchema, req.body);

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      const accessToken = req.token;
      const refreshToken = value?.refreshToken;

      if (!accessToken) {
        res.status(400).json({
          success: false,
          error: 'Access token is required'
        });
        return;
      }

      // Logout user
      const result = await AuthService.logout(accessToken, refreshToken);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('User logout successful');

      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      logger.error('Error in logout controller', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/refresh
   * Refresh access token using refresh token
   */
  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate input data
      const { error, value } = validateInput<{ refreshToken: string }>(refreshTokenSchema, req.body);

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      // Refresh tokens
      const result = await AuthService.refreshToken(value!.refreshToken);

      if (!result.success) {
        res.status(401).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('Token refresh successful');

      res.status(200).json({
        success: true,
        message: 'Token refresh successful',
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken
        }
      });
    } catch (error) {
      logger.error('Error in refresh token controller', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  }

  /**
   * GET /api/v1/auth/me
   * Get current user profile
   */
  static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Get user from database
      const user = await AuthService.getUserById(req.user.userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      // Remove password from response
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userResponse } = user;

      res.status(200).json({
        success: true,
        data: {
          user: userResponse
        }
      });
    } catch (error) {
      logger.error('Error in me controller', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/verify-token
   * Verify if token is valid and not blacklisted
   */
  static async verifyToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const accessToken = req.token;

      if (!accessToken) {
        res.status(400).json({
          success: false,
          error: 'Access token is required'
        });
        return;
      }

      // Token is already verified by extractToken middleware
      // If we reach here, token is valid
      res.status(200).json({
        success: true,
        message: 'Token is valid',
        data: {
          user: req.user
        }
      });
    } catch (error) {
      logger.error('Error in verify token controller', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/verify-account
   * Verify user account using email verification token
   */
  static async verifyAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate input data
      const { error, value } = validateInput<{ token: string }>(emailVerificationSchema, req.body);

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }

      // Verify account
      const result = await AuthService.verifyAccount(value!.token);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      logger.info('Account verification successful', {
        userId: result.user?.id,
        email: result.user?.email
      });

      res.status(200).json({
        success: true,
        message: 'Account verified successfully',
        data: {
          user: {
            id: result.user!.id,
            email: result.user!.email,
            first_name: result.user!.first_name,
            last_name: result.user!.last_name,
            user_type: result.user!.user_type,
            status: result.user!.status,
            email_verified: result.user!.email_verified,
            phone_verified: result.user!.phone_verified,
            created_at: result.user!.created_at
          }
        }
      });
    } catch (error) {
      logger.error('Error in verify account controller', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  }

  /**
   * GET /api/v1/auth/email-exists/:email
   * Check if email already exists
   */
  static async checkEmailExists(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.params;

      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Email parameter is required'
        });
        return;
      }

      const exists = await AuthService.emailExists(email);

      res.status(200).json({
        success: true,
        data: {
          exists
        }
      });
    } catch (error) {
      logger.error('Error in checkEmailExists controller', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  }
}