import { User, Merchant, UserType, AccountStatus, UserAccount } from '../models/User';
import { mockDb } from '../utils/mockDatabase';
import { hashPassword, comparePassword, generateAccessToken, generateRefreshToken, verifyEmailVerificationToken, generatePasswordResetToken, verifyPasswordResetToken } from '../utils/crypto';
import { logger } from '../utils/logger';
import { config } from '../config/environment';
import { tokenBlacklistService } from './tokenBlacklistService';
import { emailService } from './emailService';

// Type for user response without password
export type UserResponse = Omit<UserAccount, 'password'>;

export interface UserRegistrationData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  user_merchant_id: string;
  country: string;
}

export interface MerchantRegistrationData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  user_merchant_id: string;
  country: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  static async registerUser(userData: UserRegistrationData): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // Check if email already exists
      const existingUser = await mockDb.findUserByEmail(userData.email);
      if (existingUser) {
        return {
          success: false,
          error: 'Email address is already registered'
        };
      }

      // Hash password
      const hashedPassword = await hashPassword(userData.password);

      // Create user object
      const userToCreate: Omit<User, 'id' | 'created_at' | 'updated_at' | 'failed_login_attempts'> = {
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        first_name: userData.first_name,
        last_name: userData.last_name,
        user_type: UserType.USER,
        status: AccountStatus.PENDING,
        email_verified: false,
        phone_verified: false,
        user_merchant_id: userData.user_merchant_id,
        country: userData.country,
        ...(userData.phone && { phone: userData.phone })
      };

      const createdUser = await mockDb.createUser(userToCreate) as User;

      logger.info('User registered successfully', {
        userId: createdUser.id,
        email: createdUser.email,
        user_type: createdUser.user_type
      });

      // Remove password from response
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userResponse } = createdUser;

      return {
        success: true,
        user: userResponse as User
      };
    } catch (error) {
      logger.error('Error registering user', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        success: false,
        error: 'Internal server error during registration'
      };
    }
  }

  /**
   * Register a new merchant
   */
  static async registerMerchant(merchantData: MerchantRegistrationData): Promise<{ success: boolean; merchant?: Merchant; error?: string }> {
    try {
      // Check if email already exists
      const existingUser = await mockDb.findUserByEmail(merchantData.email);
      if (existingUser) {
        return {
          success: false,
          error: 'Email address is already registered'
        };
      }

      // Hash password
      const hashedPassword = await hashPassword(merchantData.password);

      // Create merchant object
      const merchantToCreate: Omit<Merchant, 'id' | 'created_at' | 'updated_at' | 'failed_login_attempts'> = {
        email: merchantData.email.toLowerCase(),
        password: hashedPassword,
        first_name: merchantData.first_name,
        last_name: merchantData.last_name,
        user_type: UserType.MERCHANT,
        status: AccountStatus.PENDING,
        email_verified: false,
        phone_verified: false,
        user_merchant_id: merchantData.user_merchant_id,
        country: merchantData.country,
        ...(merchantData.phone && { phone: merchantData.phone })
      };

      const createdMerchant = await mockDb.createUser(merchantToCreate) as Merchant;

      logger.info('Merchant registered successfully', {
        userId: createdMerchant.id,
        email: createdMerchant.email,
        user_type: createdMerchant.user_type,
        user_merchant_id: createdMerchant.user_merchant_id
      });

      // Remove password from response
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...merchantResponse } = createdMerchant;

      return {
        success: true,
        merchant: merchantResponse as Merchant
      };
    } catch (error) {
      logger.error('Error registering merchant', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        success: false,
        error: 'Internal server error during registration'
      };
    }
  }

  /**
   * Check if email exists
   */
  static async emailExists(email: string): Promise<boolean> {
    const user = await mockDb.findUserByEmail(email);
    return user !== null;
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<UserAccount | null> {
    return mockDb.findUserByEmail(email);
  }

  /**
   * Get user by ID
   */
  static async getUserById(id: string): Promise<UserAccount | null> {
    return mockDb.findUserById(id);
  }

  /**
   * Login user with email and password
   */
  static async login(email: string, password: string): Promise<{ success: boolean; user?: UserResponse; accessToken?: string; refreshToken?: string; error?: string }> {
    try {
      // Find user by email
      const user = await mockDb.findUserByEmail(email.toLowerCase());
      if (!user) {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      // Check if account is locked
      if (user.locked_until && new Date() < user.locked_until) {
        const lockoutTime = Math.ceil((user.locked_until.getTime() - Date.now()) / 60000);
        return {
          success: false,
          error: `Account is locked. Please try again in ${lockoutTime} minutes.`
        };
      }

      // Check if account is active
      if (user.status !== AccountStatus.ACTIVE) {
        return {
          success: false,
          error: 'Account is not active. Please verify your email first.'
        };
      }

      // Verify password
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        // Increment failed login attempts
        const failedAttempts = (user.failed_login_attempts || 0) + 1;
        const shouldLockAccount = failedAttempts >= config.security.accountLockoutAttempts;
        
        await mockDb.updateUser(user.id, {
          failed_login_attempts: failedAttempts,
          ...(shouldLockAccount && {
            locked_until: new Date(Date.now() + config.security.accountLockoutDuration * 1000)
          })
        });

        return {
          success: false,
          error: shouldLockAccount 
            ? `Account locked due to too many failed attempts. Please try again in ${config.security.accountLockoutDuration / 60} minutes.`
            : 'Invalid email or password'
        };
      }

      // Reset failed login attempts on successful login
      await mockDb.updateUser(user.id, {
        failed_login_attempts: 0,
        last_login_at: new Date()
      });

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      logger.info('User login successful', {
        userId: user.id,
        email: user.email,
        userType: user.user_type
      });

      // Remove password from response
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...userResponse } = user;

      return {
        success: true,
        user: userResponse as UserResponse,
        accessToken,
        refreshToken
      };
    } catch (error) {
      logger.error('Error during login', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        success: false,
        error: 'Internal server error during login'
      };
    }
  }

  /**
   * Verify email account with token
   */
  static async verifyAccount(token: string): Promise<{ success: boolean; user?: UserResponse; error?: string }> {
    try {
      // Verify the token
      const tokenData = verifyEmailVerificationToken(token);
      if (!tokenData) {
        return {
          success: false,
          error: 'Invalid or expired verification token'
        };
      }

      // Find user by ID
      const user = await mockDb.findUserById(tokenData.userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Check if email matches
      if (user.email !== tokenData.email) {
        return {
          success: false,
          error: 'Invalid verification token'
        };
      }

      // Check if already verified
      if (user.email_verified) {
        return {
          success: false,
          error: 'Email is already verified'
        };
      }

      // Update user verification status
      await mockDb.updateUser(user.id, {
        email_verified: true,
        status: AccountStatus.ACTIVE
      });

      // Get updated user
      const updatedUser = await mockDb.findUserById(user.id);
      if (!updatedUser) {
        return {
          success: false,
          error: 'Failed to update user verification status'
        };
      }

      logger.info('Email verification successful', {
        userId: user.id,
        email: user.email
      });

      // Remove password from response
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userResponse } = updatedUser;

      return {
        success: true,
        user: userResponse as UserResponse
      };
    } catch (error) {
      logger.error('Error during email verification', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        success: false,
        error: 'Internal server error during verification'
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(refreshToken: string): Promise<{ success: boolean; accessToken?: string; error?: string }> {
    try {
      // Verify refresh token
      const { verifyToken } = await import('../utils/crypto');
      const tokenData = verifyToken(refreshToken);
      if (!tokenData) {
        return {
          success: false,
          error: 'Invalid or expired refresh token'
        };
      }

      // Find user by ID
      const user = await mockDb.findUserById(tokenData.userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Check if user is still active
      if (user.status !== AccountStatus.ACTIVE) {
        return {
          success: false,
          error: 'Account is not active'
        };
      }

      // Generate new access token
      const accessToken = generateAccessToken(user);

      logger.info('Token refresh successful', {
        userId: user.id,
        email: user.email
      });

      return {
        success: true,
        accessToken
      };
    } catch (error) {
      logger.error('Error during token refresh', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        success: false,
        error: 'Internal server error during token refresh'
      };
    }
  }

  /**
   * Logout user (invalidate refresh token)
   */
  static async logout(refreshToken?: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (refreshToken) {
        // Verify the refresh token to get expiration time
        const { verifyToken } = await import('../utils/crypto');
        const tokenData = verifyToken(refreshToken);
        
        if (tokenData) {
          // Add refresh token to blacklist
          const expirationTime = tokenData.exp ? tokenData.exp * 1000 : undefined;
          await tokenBlacklistService.addToBlacklist(refreshToken, expirationTime);
          
          logger.info('User logout', {
            userId: tokenData.userId,
            email: tokenData.email
          });
        }
      }

      return {
        success: true
      };
    } catch (error) {
      logger.error('Error during logout', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        success: false,
        error: 'Internal server error during logout'
      };
    }
  }

  /**
   * Initiate password reset process
   */
  static async initiatePasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Find user by email
      const user = await mockDb.findUserByEmail(email.toLowerCase());
      if (!user) {
        // Don't reveal if email exists for security
        return {
          success: true
        };
      }

      // Check if account is active
      if (user.status !== AccountStatus.ACTIVE) {
        return {
          success: false,
          error: 'Account is not active'
        };
      }

      // Generate password reset token
      const resetToken = generatePasswordResetToken(user.id, user.email);

      // Send password reset email
      const emailSent = await emailService.sendPasswordResetEmail(
        user.email,
        resetToken,
        `${user.first_name} ${user.last_name}`
      );

      if (!emailSent) {
        return {
          success: false,
          error: 'Failed to send password reset email'
        };
      }

      logger.info('Password reset initiated', {
        userId: user.id,
        email: user.email
      });

      return {
        success: true
      };
    } catch (error) {
      logger.error('Error during password reset initiation', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        success: false,
        error: 'Internal server error during password reset'
      };
    }
  }

  /**
   * Reset password using token
   */
  static async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify the reset token
      const tokenData = verifyPasswordResetToken(token);
      if (!tokenData) {
        return {
          success: false,
          error: 'Invalid or expired reset token'
        };
      }

      // Find user by ID
      const user = await mockDb.findUserById(tokenData.userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Check if email matches
      if (user.email !== tokenData.email) {
        return {
          success: false,
          error: 'Invalid reset token'
        };
      }

      // Check if account is active
      if (user.status !== AccountStatus.ACTIVE) {
        return {
          success: false,
          error: 'Account is not active'
        };
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update user password
      await mockDb.updateUser(user.id, {
        password: hashedPassword,
        failed_login_attempts: 0
      });

      // Send password change notification
      await emailService.sendPasswordChangeNotification(
        user.email,
        `${user.first_name} ${user.last_name}`
      );

      logger.info('Password reset successful', {
        userId: user.id,
        email: user.email
      });

      return {
        success: true
      };
    } catch (error) {
      logger.error('Error during password reset', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        success: false,
        error: 'Internal server error during password reset'
      };
    }
  }

  /**
   * Change password for authenticated user
   */
  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Find user by ID
      const user = await mockDb.findUserById(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Check if account is active
      if (user.status !== AccountStatus.ACTIVE) {
        return {
          success: false,
          error: 'Account is not active'
        };
      }

      // Verify current password
      const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return {
          success: false,
          error: 'Current password is incorrect'
        };
      }

      // Check if new password is different from current password
      const isSamePassword = await comparePassword(newPassword, user.password);
      if (isSamePassword) {
        return {
          success: false,
          error: 'New password must be different from current password'
        };
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update user password
      await mockDb.updateUser(user.id, {
        password: hashedPassword,
        failed_login_attempts: 0
      });

      // Send password change notification
      await emailService.sendPasswordChangeNotification(
        user.email,
        `${user.first_name} ${user.last_name}`
      );

      logger.info('Password change successful', {
        userId: user.id,
        email: user.email
      });

      return {
        success: true
      };
    } catch (error) {
      logger.error('Error during password change', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        success: false,
        error: 'Internal server error during password change'
      };
    }
  }
}