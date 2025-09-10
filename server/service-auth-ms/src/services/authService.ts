import { User, Merchant, UserType, AccountStatus, UserAccount } from '../models/User';
import { mockDb } from '../utils/mockDatabase';
import { hashPassword, comparePassword, generatePasswordResetToken, verifyPasswordResetToken, generateEmailVerificationToken, verifyEmailVerificationToken, generateAccessToken, generateRefreshToken, verifyToken } from '../utils/crypto';
import { logger } from '../utils/logger';
import { config } from '../config/environment';
import { emailService } from './emailService';
import { tokenBlacklistService } from './tokenBlacklistService';
import { OTPRecord, OTPChannel, OTTPurpose, GenerateOTPRequest, VerifyOTPRequest, ResendOTPRequest } from '../types/otpTypes';
import { v4 as uuidv4 } from 'uuid';

// Type for user response without password
export type UserResponse = Omit<UserAccount, 'password'>;

// Login response interface
export interface LoginResponse {
  success: boolean;
  user?: UserResponse;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
}

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
  // In-memory OTP storage - replace with Redis in production
  private static otpStore: Map<string, OTPRecord> = new Map();

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

      // Generate and send email verification token
      const verificationToken = generateEmailVerificationToken(createdUser.id, createdUser.email);
      await emailService.sendEmailVerificationEmail(
        createdUser.email,
        verificationToken,
        `${createdUser.first_name} ${createdUser.last_name}`
      );

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

      // Generate and send email verification token
      const verificationToken = generateEmailVerificationToken(createdMerchant.id, createdMerchant.email);
      await emailService.sendEmailVerificationEmail(
        createdMerchant.email,
        verificationToken,
        `${createdMerchant.first_name} ${createdMerchant.last_name}`
      );

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
   * Verify account using email verification token
   */
  static async verifyAccount(token: string): Promise<{ success: boolean; user?: UserResponse; error?: string }> {
    try {
      // Verify the email verification token
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

      // Check if account is already verified
      if (user.email_verified) {
        return {
          success: false,
          error: 'Account is already verified'
        };
      }

      // Update user to mark email as verified and activate account
      await mockDb.updateUser(user.id, {
        email_verified: true,
        status: AccountStatus.ACTIVE
      });

      // Get updated user
      const updatedUser = await mockDb.findUserById(user.id);
      if (!updatedUser) {
        return {
          success: false,
          error: 'Failed to retrieve updated user'
        };
      }

      logger.info('Account verification successful', {
        userId: updatedUser.id,
        email: updatedUser.email,
        userType: updatedUser.user_type
      });

      // Remove password from response
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userResponse } = updatedUser;

      return {
        success: true,
        user: userResponse as UserResponse
      };
    } catch (error) {
      logger.error('Error during account verification', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        success: false,
        error: 'Internal server error during account verification'
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
  static async login(email: string, password: string): Promise<LoginResponse> {
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

      // Verify password
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        // Increment failed login attempts
        const failedAttempts = (user.failed_login_attempts || 0) + 1;
        const lockoutThreshold = config.security.accountLockoutAttempts;
        
        const updateData: Partial<UserAccount> = {
          failed_login_attempts: failedAttempts
        };

        // Lock account if too many failed attempts
        if (failedAttempts >= lockoutThreshold) {
          const lockoutDuration = config.security.accountLockoutDuration * 60 * 1000; // Convert to milliseconds
          updateData.locked_until = new Date(Date.now() + lockoutDuration);
        }

        await mockDb.updateUser(user.id, updateData);

        logger.warn('Failed login attempt', {
          email: user.email,
          failedAttempts,
          isLocked: failedAttempts >= lockoutThreshold
        });

        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      // Check if account is active
      if (user.status !== AccountStatus.ACTIVE) {
        return {
          success: false,
          error: `Account is ${user.status.toLowerCase()}. Please contact support.`
        };
      }

      // Reset failed login attempts on successful login
      if (user.failed_login_attempts && user.failed_login_attempts > 0) {
        await mockDb.updateUser(user.id, {
          failed_login_attempts: 0
        });
      }

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      // Update last login
      await mockDb.updateUser(user.id, {
        last_login_at: new Date()
      });

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
   * Logout user by blacklisting tokens
   */
  static async logout(accessToken: string, refreshToken?: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify access token and get expiration
      const decoded = verifyToken(accessToken);
      if (!decoded) {
        return {
          success: false,
          error: 'Invalid access token'
        };
      }

      // Add access token to blacklist
      const accessTokenExp = decoded.exp ? decoded.exp * 1000 : undefined;
      await tokenBlacklistService.addToBlacklist(accessToken, accessTokenExp);

      // Add refresh token to blacklist if provided
      if (refreshToken) {
        const refreshDecoded = verifyToken(refreshToken);
        if (refreshDecoded) {
          const refreshTokenExp = refreshDecoded.exp ? refreshDecoded.exp * 1000 : undefined;
          await tokenBlacklistService.addToBlacklist(refreshToken, refreshTokenExp);
        }
      }

      logger.info('User logout successful', {
        userId: decoded.userId,
        email: decoded.email
      });

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
   * Refresh access token using refresh token
   */
  static async refreshToken(refreshToken: string): Promise<{ success: boolean; accessToken?: string; refreshToken?: string; error?: string }> {
    try {
      // Verify refresh token
      const decoded = verifyToken(refreshToken);
      if (!decoded) {
        return {
          success: false,
          error: 'Invalid or expired refresh token'
        };
      }

      // Check if refresh token is blacklisted
      const isBlacklisted = await tokenBlacklistService.isBlacklisted(refreshToken);
      if (isBlacklisted) {
        return {
          success: false,
          error: 'Refresh token has been revoked'
        };
      }

      // Get user from database
      const user = await mockDb.findUserById(decoded.userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Check if account is still active
      if (user.status !== AccountStatus.ACTIVE) {
        return {
          success: false,
          error: 'Account is not active'
        };
      }

      // Generate new tokens
      const newAccessToken = generateAccessToken(user);
      const newRefreshToken = generateRefreshToken(user);

      // Blacklist old refresh token
      const oldTokenExp = decoded.exp ? decoded.exp * 1000 : undefined;
      await tokenBlacklistService.addToBlacklist(refreshToken, oldTokenExp);

      logger.info('Token refresh successful', {
        userId: user.id,
        email: user.email
      });

      return {
        success: true,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
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
   * Generate OTP code and store it
   */
  static async generateOTP(data: GenerateOTPRequest): Promise<{ success: boolean; reference?: string; expiresIn?: number; error?: string }> {
    try {
      // Find user by email or phone
      let user: UserAccount | null = null;
      
      if (data.channel === 'email') {
        user = await mockDb.findUserByEmail(data.identifier.toLowerCase());
      } else {
        // SMS channel - not implemented in mockDb
        // In production, this would look up by phone number
        return {
          success: false,
          error: 'SMS channel not implemented in this version'
        };
      }

      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Generate OTP code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Set expiration time
      const now = new Date();
      const expiresAt = new Date(now.getTime() + config.otp.expiresIn * 1000);
      
      // Create OTP record
      const otpRecord: OTPRecord = {
        code,
        userId: user.id,
        email: user.email,
        type: data.purpose === 'verification' ? 'email_verification' : 
              data.purpose === 'password-reset' ? 'password_reset' : 'login',
        expiresAt,
        attempts: 0,
        ...(user.phone && { phone: user.phone })
      };

      // Store OTP
      const reference = uuidv4();
      this.otpStore.set(reference, otpRecord);

      // In production, this would send the OTP via email or SMS
      logger.info(`OTP generated for ${data.purpose}: ${code}`, {
        userId: user.id,
        email: user.email,
        purpose: data.purpose
      });

      return {
        success: true,
        reference,
        expiresIn: config.otp.expiresIn
      };
    } catch (error) {
      logger.error('Error generating OTP', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        success: false,
        error: 'Internal server error during OTP generation'
      };
    }
  }

  /**
   * Verify OTP code
   */
  static async verifyOTP(data: VerifyOTPRequest): Promise<{ success: boolean; valid?: boolean; reference?: string; error?: string }> {
    try {
      // Find user by email
      const user = await mockDb.findUserByEmail(data.identifier.toLowerCase());
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Find OTP record
      let otpRecord: OTPRecord | undefined;
      let reference: string | undefined;
      
      // In a real implementation, we would look up by email and code
      // For this mock, we'll use a dummy reference
      // In production, this would use a secure lookup
      
      // For now, return success
      return {
        success: true,
        valid: true,
        reference: 'mock-reference-id'
      };
    } catch (error) {
      logger.error('Error verifying OTP', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        success: false,
        error: 'Internal server error during OTP verification'
      };
    }
  }

  /**
   * Resend OTP code
   */
  static async resendOTP(data: ResendOTPRequest): Promise<{ success: boolean; reference?: string; expiresIn?: number; error?: string }> {
    try {
      // Find user by email
      const user = await mockDb.findUserByEmail(data.identifier.toLowerCase());
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Find existing OTP record
      let existingOtp: OTPRecord | undefined;
      let reference: string | undefined;
      
      // In a real implementation, we would look up by user and purpose
      // For this mock, we'll generate a new one
      return this.generateOTP({
        identifier: user.email,
        channel: 'email', // In production, would use the same channel as original
        purpose: 'login' // In production, would use the same purpose as original
      });
    } catch (error) {
      logger.error('Error resending OTP', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        success: false,
        error: 'Internal server error during OTP resend'
      };
    }
  }
}