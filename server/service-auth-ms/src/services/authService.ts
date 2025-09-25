import { User, Merchant, UserType, AccountStatus, UserAccount } from '../models/User';
import { mockDb } from '../utils/mockDatabase';
import { hashPassword, comparePassword, generatePasswordResetToken, verifyPasswordResetToken, generateEmailVerificationToken, verifyEmailVerificationToken, generateAccessToken, generateRefreshToken, verifyToken } from '../utils/crypto';
import { logger } from '../utils/logger';
import { config } from '../config/environment';
import { emailService } from './emailService';
import { tokenBlacklistService } from './tokenBlacklistService';
import { redisCacheService } from '../services/redisCacheService';
import { OTPRecord, GenerateOTPRequest, VerifyOTPRequest, ResendOTPRequest } from '../types/otpTypes';
import { v4 as uuidv4 } from 'uuid';

// Add axios for HTTP requests
import axios from 'axios';

// Type for user response without password
export type UserResponse = Omit<UserAccount, 'password'>;

// Login response interface
export interface LoginResponse {
  success: boolean;
  user?: UserResponse;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
  needsCompliance?: boolean; // Add compliance fields
  complianceStatus?: string; // Add compliance fields
}

// Add interface for compliance status response
interface ComplianceStatusResponse {
  success: boolean;
  data?: {
    userId: string;
    userType: string;
    status: string;
    documentCount: number;
    submittedAt?: string;
    completedAt?: string;
    riskLevel?: string;
  };
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

export interface AdminRegistrationData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
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
   * Register a new admin user
   */
  static async registerAdmin(adminData: AdminRegistrationData): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // Check if email already exists
      const existingUser = await mockDb.findUserByEmail(adminData.email);
      if (existingUser) {
        return {
          success: false,
          error: 'Email address is already registered'
        };
      }

      // Hash password
      const hashedPassword = await hashPassword(adminData.password);

      // Create admin object
      const adminToCreate: Omit<User, 'id' | 'created_at' | 'updated_at' | 'failed_login_attempts'> = {
        email: adminData.email.toLowerCase(),
        password: hashedPassword,
        first_name: adminData.first_name,
        last_name: adminData.last_name,
        user_type: UserType.ADMIN,
        status: AccountStatus.ACTIVE, // Admin accounts are active by default
        email_verified: true, // Admin accounts are verified by default
        phone_verified: false,
        user_merchant_id: 'admin', // Admin users don't belong to a merchant
        country: adminData.country,
        ...(adminData.phone && { phone: adminData.phone })
      };

      const createdAdmin = await mockDb.createUser(adminToCreate) as User;

      logger.info('Admin registered successfully', {
        userId: createdAdmin.id,
        email: createdAdmin.email,
        user_type: createdAdmin.user_type
      });

      // Remove password from response
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...adminResponse } = createdAdmin;

      return {
        success: true,
        user: adminResponse as User
      };
    } catch (error) {
      logger.error('Error registering admin', { error: error instanceof Error ? error.message : 'Unknown error' });
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
   * Get user profile by ID
   */
  static async getUserProfile(userId: string): Promise<{ success: boolean; user?: UserResponse; error?: string }> {
    try {
      // First check Redis cache
      const cachedUser = await redisCacheService.get<UserResponse>(`user:${userId}`);
      if (cachedUser) {
        return {
          success: true,
          user: cachedUser
        };
      }

      // If not in cache, get from database
      const user = await mockDb.findUserById(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Remove password from response
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userResponse } = user;

      // Store in Redis cache for 1 hour
      await redisCacheService.set(`user:${userId}`, userResponse);

      return {
        success: true,
        user: userResponse as UserResponse
      };
    } catch (error) {
      logger.error('Error getting user profile', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        success: false,
        error: 'Internal server error while retrieving user profile'
      };
    }
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(userId: string, profileData: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    country?: string;
  }): Promise<{ success: boolean; user?: UserResponse; error?: string }> {
    try {
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

      // Update user profile
      const updateData: Partial<UserAccount> = {
        ...profileData,
        updated_at: new Date()
      };

      await mockDb.updateUser(userId, updateData);

      // Get updated user
      const updatedUser = await mockDb.findUserById(userId);
      if (!updatedUser) {
        return {
          success: false,
          error: 'Failed to retrieve updated user'
        };
      }

      // Update Redis cache
      await redisCacheService.set(`user:${userId}`, updatedUser);

      logger.info('User profile updated successfully', {
        userId: updatedUser.id,
        email: updatedUser.email
      });

      // Remove password from response
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userResponse } = updatedUser;

      return {
        success: true,
        user: userResponse as UserResponse
      };
    } catch (error) {
      logger.error('Error updating user profile', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        success: false,
        error: 'Internal server error while updating user profile'
      };
    }
  }

  /**
   * Get detailed user information (admin only)
   */
  static async getUserInfo(userId: string): Promise<{ success: boolean; user?: UserResponse; error?: string }> {
    try {
      // First check Redis cache
      const cachedUser = await redisCacheService.get<UserResponse>(`user:${userId}`);
      if (cachedUser) {
        return {
          success: true,
          user: cachedUser
        };
      }

      // If not in cache, get from database
      const user = await mockDb.findUserById(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Update Redis cache
      await redisCacheService.set(`user:${userId}`, user);

      // Remove password from response
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userResponse } = user;

      logger.info('User info retrieved', {
        userId: user.id,
        requestedBy: 'admin'
      });

      return {
        success: true,
        user: userResponse as UserResponse
      };
    } catch (error) {
      logger.error('Error getting user info', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        success: false,
        error: 'Internal server error while retrieving user info'
      };
    }
  }

  /**
   * Verify user information (admin only)
   */
  static async verifyUserInfo(userId: string, verificationData: {
    email_verified?: boolean;
    phone_verified?: boolean;
    status?: AccountStatus;
    notes?: string;
  }): Promise<{ success: boolean; user?: UserResponse; error?: string }> {
    try {
      const user = await mockDb.findUserById(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Update verification status
      const updateData: Partial<UserAccount> = {
        ...verificationData,
        updated_at: new Date()
      };

      await mockDb.updateUser(userId, updateData);

      // Get updated user
      const updatedUser = await mockDb.findUserById(userId);
      if (!updatedUser) {
        return {
          success: false,
          error: 'Failed to retrieve updated user'
        };
      }

      logger.info('User information verified', {
        userId: updatedUser.id,
        email: updatedUser.email,
        verificationData
      });

      // Remove password from response
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userResponse } = updatedUser;

      return {
        success: true,
        user: userResponse as UserResponse
      };
    } catch (error) {
      logger.error('Error verifying user info', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        success: false,
        error: 'Internal server error while verifying user info'
      };
    }
  }

  /**
   * Suspend user account (admin only)
   */
  static async suspendUser(userId: string, reason?: string): Promise<{ success: boolean; user?: UserResponse; error?: string }> {
    try {
      const user = await mockDb.findUserById(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Check if account is already suspended or deactivated
      if (user.status === AccountStatus.SUSPENDED) {
        return {
          success: false,
          error: 'Account is already suspended'
        };
      }

      if (user.status === AccountStatus.DEACTIVATED) {
        return {
          success: false,
          error: 'Cannot suspend a deactivated account'
        };
      }

      // Suspend user account
      await mockDb.updateUser(userId, {
        status: AccountStatus.SUSPENDED,
        updated_at: new Date()
      });

      // Get updated user
      const updatedUser = await mockDb.findUserById(userId);
      if (!updatedUser) {
        return {
          success: false,
          error: 'Failed to retrieve updated user'
        };
      }

      logger.info('User account suspended', {
        userId: updatedUser.id,
        email: updatedUser.email,
        reason: reason || 'No reason provided'
      });

      // Remove password from response
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userResponse } = updatedUser;

      return {
        success: true,
        user: userResponse as UserResponse
      };
    } catch (error) {
      logger.error('Error suspending user', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        success: false,
        error: 'Internal server error while suspending user account'
      };
    }
  }

  /**
   * Activate user account (admin only)
   */
  static async activateUser(userId: string): Promise<{ success: boolean; user?: UserResponse; error?: string }> {
    try {
      const user = await mockDb.findUserById(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Check if account is already active
      if (user.status === AccountStatus.ACTIVE) {
        return {
          success: false,
          error: 'Account is already active'
        };
      }

      // Activate user account
      await mockDb.updateUser(userId, {
        status: AccountStatus.ACTIVE,
        updated_at: new Date(),
        failed_login_attempts: 0 // Reset failed attempts on activation
      });

      // Remove lockout separately if it exists
      if (user.locked_until) {
        const { locked_until, ...updateData } = user;
        await mockDb.updateUser(userId, {
          ...updateData,
          status: AccountStatus.ACTIVE,
          updated_at: new Date(),
          failed_login_attempts: 0
        });
      }

      // Get updated user
      const updatedUser = await mockDb.findUserById(userId);
      if (!updatedUser) {
        return {
          success: false,
          error: 'Failed to retrieve updated user'
        };
      }

      logger.info('User account activated', {
        userId: updatedUser.id,
        email: updatedUser.email
      });

      // Remove password from response
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userResponse } = updatedUser;

      return {
        success: true,
        user: userResponse as UserResponse
      };
    } catch (error) {
      logger.error('Error activating user', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        success: false,
        error: 'Internal server error while activating user account'
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
    // First check Redis cache
    const cachedUser = await redisCacheService.get<UserAccount>(`email:${email}`);
    if (cachedUser) {
      return cachedUser;
    }

    // If not in cache, get from database
    const user = await mockDb.findUserByEmail(email);
    if (user) {
      // Cache user by email
      await redisCacheService.set(`email:${email}`, user);
    }

    return user;
  }

  /**
   * Get user by ID
   */
  static async getUserById(id: string): Promise<UserAccount | null> {
    // First check Redis cache
    const cachedUser = await redisCacheService.get<UserAccount>(`user:${id}`);
    if (cachedUser) {
      return cachedUser;
    }

    // If not in cache, get from database
    const user = await mockDb.findUserById(id);
    if (user) {
      // Cache user by ID
      await redisCacheService.set(`user:${id}`, user);
    }

    return user;
  }

  /**
   * Login user with email and password
   */
  static async login(email: string, password: string): Promise<LoginResponse> {
    try {
      // Find user by email
      const user = await this.getUserByEmail(email.toLowerCase());
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

        // Update user record
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
          error: `Account is ${user.status}. Please contact support.`
        };
      }

      // Reset failed login attempts on successful login
      if (user.failed_login_attempts && user.failed_login_attempts > 0) {
        await mockDb.updateUser(user.id, {
          failed_login_attempts: 0
        });
      }

      // Update last login time
      await mockDb.updateUser(user.id, {
        last_login_at: new Date()
      });

      // Get updated user
      const updatedUser = await this.getUserById(user.id);
      if (!updatedUser) {
        return {
          success: false,
          error: 'User not found after login'
        };
      }

      // Check compliance status for merchants
      let needsCompliance = false;
      let complianceStatus = 'NOT_APPLICABLE';
      
      if (updatedUser.user_type === UserType.MERCHANT) {
        const complianceCheck = await this.checkComplianceStatus(updatedUser.id, updatedUser.user_type);
        if (complianceCheck.success) {
          needsCompliance = complianceCheck.needsCompliance || false;
          complianceStatus = complianceCheck.complianceStatus || 'UNKNOWN';
        }
      }

      // Generate tokens
      const accessToken = generateAccessToken(updatedUser);
      const refreshToken = generateRefreshToken(updatedUser);

      logger.info('User login successful', {
        userId: updatedUser.id,
        email: updatedUser.email,
        userType: updatedUser.user_type,
        needsCompliance: needsCompliance,
        complianceStatus: complianceStatus
      });

      // Remove password from response
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: userPassword, ...userResponse } = updatedUser;

      return {
        success: true,
        user: userResponse as UserResponse,
        accessToken,
        refreshToken,
        needsCompliance, // Add compliance info to response
        complianceStatus // Add compliance status to response
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
   * Check compliance status for a user
   */
  static async checkComplianceStatus(userId: string, userType: string): Promise<{ 
    success: boolean; 
    needsCompliance?: boolean; 
    complianceStatus?: string;
    error?: string 
  }> {
    try {
      // Only check compliance for merchants
      if (userType !== 'MERCHANT') {
        return {
          success: true,
          needsCompliance: false
        };
      }

      // Call compliance service to check KYC status
      const complianceServiceUrl = config.compliance.serviceUrl;
      const response = await axios.get<ComplianceStatusResponse>(
        `${complianceServiceUrl}/api/v1/kyc/status/${userId}`,
        {
          timeout: 5000 // 5 second timeout
        }
      );

      if (response.data.success) {
        const complianceData = response.data.data;
        
        // If no compliance profile exists, user needs to complete compliance
        if (!complianceData) {
          return {
            success: true,
            needsCompliance: true,
            complianceStatus: 'NOT_STARTED'
          };
        }

        // Check if compliance is completed
        const isCompleted = complianceData.status === 'APPROVED' || complianceData.status === 'COMPLETED';
        
        return {
          success: true,
          needsCompliance: !isCompleted,
          complianceStatus: complianceData.status
        };
      } else {
        // If compliance service returns an error, we'll assume user needs compliance
        logger.warn('Compliance service returned error', {
          userId,
          error: response.data.error
        });
        
        return {
          success: true,
          needsCompliance: true,
          complianceStatus: 'SERVICE_ERROR'
        };
      }
    } catch (error) {
      // If we can't reach the compliance service, log the error but don't block login
      logger.error('Error checking compliance status', { 
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Assume user needs compliance if we can't check
      return {
        success: true,
        needsCompliance: true,
        complianceStatus: 'CHECK_FAILED'
      };
    }
  }
}