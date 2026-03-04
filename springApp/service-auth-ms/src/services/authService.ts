import { User, Merchant, UserType, AccountStatus, UserAccount } from '../models/User';
import { Session } from '../models/Session';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database';
import { hashPassword, comparePassword, generatePasswordResetToken, verifyPasswordResetToken, verifyEmailVerificationToken, generateAccessToken, generateRefreshToken, verifyToken } from '../utils/crypto';
import { logger } from '../utils/logger';
import { config } from '../config/environment';
import { emailService } from './emailService';
import { tokenBlacklistService } from './tokenBlacklistService';
import { redisCacheService } from '../services/redisCacheService';
import { OTPRecord, GenerateOTPRequest, VerifyOTPRequest, ResendOTPRequest } from '../types/otpTypes';
import paymentService from './paymentService';

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

// Interface for verify account request
export interface VerifyAccountRequest {
  token?: string;
  verificationToken?: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  static async registerUser(userData: UserRegistrationData): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // Check if email already exists
      const existingUser = await db.findUserByEmail(userData.email);
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

      const createdUser = await db.createUser(userToCreate) as User;

      // Email verification link disabled - using OTP verification only
      // const verificationToken = generateEmailVerificationToken(createdUser.id, createdUser.email);
      // await emailService.sendEmailVerificationEmail(
      //   createdUser.email,
      //   verificationToken,
      //   `${createdUser.first_name} ${createdUser.last_name}`
      // );

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
      const existingUser = await db.findUserByEmail(merchantData.email);
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

      const createdMerchant = await db.createUser(merchantToCreate) as Merchant;

      // Email verification link disabled - using OTP verification only
      // const verificationToken = generateEmailVerificationToken(createdMerchant.id, createdMerchant.email);
      // await emailService.sendEmailVerificationEmail(
      //   createdMerchant.email,
      //   verificationToken,
      //   `${createdMerchant.first_name} ${createdMerchant.last_name}`
      // );

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
      const existingUser = await db.findUserByEmail(adminData.email);
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

      const createdAdmin = await db.createUser(adminToCreate) as User;

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
   * Verify account using either 'token' or 'verificationToken' field
   */
  static async verifyAccount(request: VerifyAccountRequest): Promise<{ success: boolean; user?: UserResponse; error?: string }> {
    try {
      // Use the token from either field
      const verificationTokenToUse = request.token || request.verificationToken;

      if (!verificationTokenToUse) {
        return {
          success: false,
          error: 'Verification token is required. Provide either "token" or "verificationToken" field.'
        };
      }

      // Verify the email verification token
      const tokenData = verifyEmailVerificationToken(verificationTokenToUse);
      if (!tokenData) {
        return {
          success: false,
          error: 'Invalid or expired verification token'
        };
      }

      // Find user by ID
      const user = await db.findUserById(tokenData.userId);
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
      await db.updateUser(user.id, {
        email_verified: true,
        status: AccountStatus.ACTIVE
      });

      // Get updated user
      const updatedUser = await db.findUserById(user.id);
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

      // Notify payment service to create record (non-blocking)
      // This happens asynchronously and won't affect the verification response
      paymentService.createRecordAfterVerification(updatedUser).catch(error => {
        logger.warn('Failed to notify payment service', {
          userId: updatedUser.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
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
   * Verify email using token from email verification link
   */
  static async verifyEmailToken(token: string): Promise<{ success: boolean; error?: string }> {
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
      const user = await db.findUserById(tokenData.userId);
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
          error: 'Email is already verified'
        };
      }

      // Update user to mark email as verified and activate account
      await db.updateUser(user.id, {
        email_verified: true,
        status: AccountStatus.ACTIVE
      });

      // Get updated user
      const updatedUser = await db.findUserById(user.id);
      if (!updatedUser) {
        return {
          success: false,
          error: 'Failed to retrieve updated user'
        };
      }

      logger.info('Email verification successful', {
        userId: updatedUser.id,
        email: updatedUser.email,
        userType: updatedUser.user_type
      });

      return {
        success: true
      };
    } catch (error) {
      logger.error('Error during email verification', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        success: false,
        error: 'Internal server error during email verification'
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
      const user = await db.findUserById(userId);
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
      const user = await db.findUserById(userId);
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

      await db.updateUser(userId, updateData);

      // Get updated user
      const updatedUser = await db.findUserById(userId);
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
      const user = await db.findUserById(userId);
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
      const user = await db.findUserById(userId);
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

      await db.updateUser(userId, updateData);

      // Get updated user
      const updatedUser = await db.findUserById(userId);
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
      const user = await db.findUserById(userId);
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
      await db.updateUser(userId, {
        status: AccountStatus.SUSPENDED,
        updated_at: new Date()
      });

      // Get updated user
      const updatedUser = await db.findUserById(userId);
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
      const user = await db.findUserById(userId);
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
      await db.updateUser(userId, {
        status: AccountStatus.ACTIVE,
        updated_at: new Date(),
        failed_login_attempts: 0 // Reset failed attempts on activation
      });

      // Remove lockout separately if it exists
      if (user.locked_until) {
        const { locked_until, ...updateData } = user;
        await db.updateUser(userId, {
          ...updateData,
          status: AccountStatus.ACTIVE,
          updated_at: new Date(),
          failed_login_attempts: 0
        });
      }

      // Get updated user
      const updatedUser = await db.findUserById(userId);
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
   * Update user status (generic)
   */
  static async updateUserStatus(userId: string, status: AccountStatus): Promise<{ success: boolean; user?: UserResponse; error?: string }> {
    try {
      const user = await db.findUserById(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Update user status
      await db.updateUser(userId, {
        status,
        updated_at: new Date(),
        ...(status === AccountStatus.ACTIVE ? { failed_login_attempts: 0 } : {}) // Reset failed attempts if activating
      });

      // Get updated user
      const updatedUser = await db.findUserById(userId);
      if (!updatedUser) {
        return {
          success: false,
          error: 'Failed to retrieve updated user'
        };
      }

      // Update Redis cache
      await redisCacheService.set(`user:${userId}`, updatedUser);

      logger.info('User status updated', {
        userId: updatedUser.id,
        email: updatedUser.email,
        newStatus: status
      });

      // Remove password from response
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userResponse } = updatedUser;

      return {
        success: true,
        user: userResponse as UserResponse
      };
    } catch (error) {
      logger.error('Error updating user status', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        success: false,
        error: 'Internal server error while updating user status'
      };
    }
  }

  /**
   * Deactivate user account
   */
  static async deactivateAccount(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await db.findUserById(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      if (user.status === AccountStatus.DEACTIVATED) {
        return {
          success: false,
          error: 'Account is already deactivated'
        };
      }

      // Pause subscriptions
      const subscriptionResult = await paymentService.pauseUserSubscriptions(userId);
      if (!subscriptionResult.success) {
        logger.warn('Failed to pause some subscriptions during deactivation', { errors: subscriptionResult.errors });
        // Proceed with deactivation
      }

      // Deactivate account
      await db.updateUser(userId, {
        status: AccountStatus.DEACTIVATED,
        deactivated_at: new Date(),
        updated_at: new Date()
      });

      // Update Redis cache
      await redisCacheService.delete(`user:${userId}`);

      logger.info('User account deactivated', { userId });

      return {
        success: true
      };
    } catch (error) {
      logger.error('Error deactivating account', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        success: false,
        error: 'Internal server error during account deactivation'
      };
    }
  }

  /**
   * Reactivate user account
   */
  static async reactivateAccount(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await db.findUserById(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      if (user.status !== AccountStatus.DEACTIVATED) {
        return {
          success: false,
          error: 'Account is not deactivated'
        };
      }

      // Check 90 days window
      if (user.deactivated_at) {
        const ninetyDaysInMs = 90 * 24 * 60 * 60 * 1000;
        const timeDiff = new Date().getTime() - new Date(user.deactivated_at).getTime();

        if (timeDiff > ninetyDaysInMs) {
          return {
            success: false,
            error: 'Account cannot be reactivated because 90 days have passed since deactivation.'
          };
        }
      }

      // Reactivate account
      await db.updateUser(userId, {
        status: AccountStatus.ACTIVE,
        deactivated_at: null, // Clear deactivation date
        updated_at: new Date(),
        failed_login_attempts: 0
      });

      // Update Redis cache
      await redisCacheService.delete(`user:${userId}`);

      logger.info('User account reactivated', { userId });

      return {
        success: true
      };
    } catch (error) {
      logger.error('Error reactivating account', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        success: false,
        error: 'Internal server error during account reactivation'
      };
    }
  }


  /**

   * Get users by merchant ID
   */
  static async getMerchantUsers(merchantId: string): Promise<{ success: boolean; users?: (UserResponse & { roleName?: string })[]; error?: string }> {
    try {
      const users = await db.findUsersByMerchantId(merchantId);
      const activeUsers = users.filter((u: any) => u.status !== AccountStatus.DEACTIVATED);

      // Fetch all roles to lookup names efficiently
      // In a real DB we would use a join, but here we can just fetch all roles for this merchant
      // However db.findRolesByMerchantId might be needed or we just iterate.
      // Let's assume we can resolve individual roles or improved the mock DB later.
      // For now, let's look up each role if role_id exists.

      const userResponses = await Promise.all(activeUsers.map(async (user) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...userResponse } = user;

        let roleName = undefined;
        if ('role_id' in user && user.role_id) {
          const role = await db.findRoleById(user.role_id);
          if (role) {
            roleName = role.name;
          }
        }

        return {
          ...userResponse,
          roleName
        } as UserResponse & { roleName?: string };
      }));

      return {
        success: true,
        users: userResponses
      };
    } catch (error) {
      logger.error('Error getting merchant users', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        success: false,
        error: 'Internal server error while retrieving merchant users'
      };
    }
  }

  /**
   * Check if email exists
   */
  static async emailExists(email: string): Promise<boolean> {
    const user = await db.findUserByEmail(email);
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
    const user = await db.findUserByEmail(email);
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
    const user = await db.findUserById(id);
    if (user) {
      // Cache user by ID
      await redisCacheService.set(`user:${id}`, user);
    }

    return user;
  }

  /**
   * Login user with email and password
   */
  static async login(email: string, password: string, ipAddress?: string, userAgent?: string): Promise<LoginResponse> {
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
        await db.updateUser(user.id, updateData);

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
        // Handle deactivated account reactivation
        if (user.status === AccountStatus.DEACTIVATED) {
          // Check if within 90 days
          if (user.deactivated_at) {
            const ninetyDaysInMs = 90 * 24 * 60 * 60 * 1000;
            const timeDiff = Date.now() - new Date(user.deactivated_at).getTime();

            if (timeDiff > ninetyDaysInMs) {
              return {
                success: false,
                error: 'Account has been permanently deleted.'
              };
            }

            // Auto-reactivate
            await db.updateUser(user.id, {
              status: AccountStatus.ACTIVE,
              deactivated_at: null,
              failed_login_attempts: 0,
              updated_at: new Date()
            });

            logger.info('User account auto-reactivated on login', { userId: user.id });
            // Continue to generate token
          } else {
            // Should not happen if deactivated properly, but just in case
            return {
              success: false,
              error: 'Account is deactivated and cannot be restored.'
            };
          }
        } else {
          return {
            success: false,
            error: `Account is ${user.status}. Please contact support.`
          };
        }
      }

      // Reset failed login attempts on successful login
      if (user.failed_login_attempts && user.failed_login_attempts > 0) {
        await db.updateUser(user.id, {
          failed_login_attempts: 0
        });
      }

      // Update last login time
      await db.updateUser(user.id, {
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

      logger.info('Checking compliance status', { userType: updatedUser.user_type, userId: updatedUser.id, expectedType: UserType.MERCHANT });
      if (updatedUser.user_type === UserType.MERCHANT) {
        const complianceCheck = await this.checkComplianceStatus(updatedUser.id, updatedUser.user_type);
        logger.info('Compliance check result', { complianceCheck });
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

      // Create Session
      const session: Session = {
        id: uuidv4(),
        userId: updatedUser.id,
        refreshToken: refreshToken,
        ipAddress: ipAddress || 'Unknown IP',
        deviceInfo: userAgent || 'Unknown Device', // Simple mapping for now, ideally parse User-Agent string
        createdAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiration for refresh token
        isValid: true
      };

      await db.createSession(session);

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

      // Invalidate session associated with refresh token
      if (refreshToken) {
        const session = await db.findSessionByRefreshToken(refreshToken);
        if (session) {
          await db.invalidateSession(session.id);
        }

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
      const user = await db.findUserById(decoded.userId);
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
      const user = await db.findUserById(userId);
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
      await db.updateUser(user.id, {
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
      const user = await db.findUserByEmail(email.toLowerCase());
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
      // Verify the password reset token
      const tokenData = verifyPasswordResetToken(token);
      if (!tokenData) {
        return {
          success: false,
          error: 'Invalid or expired password reset token'
        };
      }

      // Find user by ID
      const user = await db.findUserById(tokenData.userId);
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
          error: 'Invalid password reset token'
        };
      }

      // Check if account is active
      if (user.status !== AccountStatus.ACTIVE) {
        return {
          success: false,
          error: 'Account is not active'
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
      await db.updateUser(user.id, {
        password: hashedPassword,
        failed_login_attempts: 0 // Reset failed login attempts
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
   * Check compliance status for a user
   */
  static async checkComplianceStatus(userId: string, userType: string): Promise<{
    success: boolean;
    needsCompliance?: boolean;
    complianceStatus?: string;
    error?: string
  }> {
    try {
      logger.info('Checking compliance status for user', { userId, userType, expectedType: UserType.MERCHANT });
      // Only check compliance for merchants
      if (userType !== UserType.MERCHANT) {
        logger.info('User is not a merchant, skipping compliance check', { userType });
        return {
          success: true,
          needsCompliance: false
        };
      }

      // Call compliance service to check KYC status
      const complianceServiceUrl = config.compliance.serviceUrl;
      logger.info('Calling compliance service', { complianceServiceUrl, userId });

      // Prepare headers with service-to-service authentication if credential is available
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'service-auth-ms'
      };

      if (config.compliance.serviceCredential) {
        headers['Authorization'] = `Bearer ${config.compliance.serviceCredential}`;
        logger.info('Using service-to-service authentication for compliance service');
      } else {
        logger.warn('No service credential configured for compliance service');
      }

      const response = await axios.get<ComplianceStatusResponse>(
        `${complianceServiceUrl}/api/v1/kyc/status/${userId}`,
        {
          headers,
          timeout: 5000 // 5 second timeout
        }
      );
      logger.info('Compliance service response', { status: response.status, data: response.data });

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
        logger.info('Compliance completion check', { status: complianceData.status, isCompleted });

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
      logger.info('Error in compliance check', { userId, error: error instanceof Error ? error.message : 'Unknown error' });
      // Check if this is a 404 error from the compliance service
      // A 404 means no KYC profile exists for the user, which means they need to start compliance
      if (axios.isAxiosError(error)) {
        logger.info('Axios error details', {
          status: error.response?.status,
          data: error.response?.data,
          url: error.config?.url
        });
      }
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        logger.info('No KYC profile found for user, creating minimal profile', {
          userId
        });

        // Try to create a minimal KYC profile
        const createProfileResult = await this.createMinimalKYCProfile(userId, userType);

        if (createProfileResult.success) {
          logger.info('Minimal KYC profile created successfully', {
            userId
          });

          // Return that user needs to start compliance
          return {
            success: true,
            needsCompliance: true,
            complianceStatus: 'NOT_STARTED'
          };
        } else {
          logger.error('Failed to create minimal KYC profile', {
            userId,
            error: createProfileResult.error
          });

          // Still return that user needs compliance, but with an error status
          return {
            success: true,
            needsCompliance: true,
            complianceStatus: 'PROFILE_CREATION_FAILED'
          };
        }
      }

      // Handle 401 authentication errors specifically
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        logger.info('Authentication required for compliance service', {
          userId,
          status: error.response?.status,
          data: error.response?.data
        });

        return {
          success: true,
          needsCompliance: true,
          complianceStatus: 'AUTH_REQUIRED'
        };
      }

      // If we can't reach the compliance service, log the error but don't block login
      logger.error('Error checking compliance status', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      // Assume user needs compliance if we can't check
      return {
        success: true,
        needsCompliance: true,
        complianceStatus: 'CHECK_FAILED'
      };
    }
  }

  /**
   * Update user callback URLs
   */
  static async updateUserCallbackUrls(userId: string, urls: { callback_url?: string; error_logs_url?: string }): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    try {
      const user = await db.findUserById(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      const updatedUser = await db.updateUser(userId, {
        callback_url: urls.callback_url,
        error_logs_url: urls.error_logs_url,
        updated_at: new Date()
      });

      // Handle the case where updateUser might return null
      if (!updatedUser) {
        return {
          success: false,
          error: 'Failed to update user'
        };
      }

      return {
        success: true,
        user: updatedUser
      };
    } catch (error) {
      logger.error('Error updating callback URLs', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        success: false,
        error: 'Internal server error while updating callback URLs'
      };
    }
  }

  /**
   * Get active sessions for a user
   */
  static async getUserSessions(userId: string): Promise<{ success: boolean; sessions?: Session[]; error?: string }> {
    try {
      const sessions = await db.findSessionsByUserId(userId);
      return {
        success: true,
        sessions
      };
    } catch (error) {
      logger.error('Error getting user sessions', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        success: false,
        error: 'Internal server error while retrieving sessions'
      };
    }
  }

  /**
   * Revoke a specific session
   */
  static async revokeSession(userId: string, sessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const session = await db.findSessionById(sessionId);

      if (!session) {
        return {
          success: false,
          error: 'Session not found'
        };
      }

      if (session.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized to revoke this session'
        };
      }

      await db.invalidateSession(sessionId);

      // Also blacklist the associated refresh token if possible
      // We don't have the expiration available easily without parsing, so standard blacklist default applies
      await tokenBlacklistService.addToBlacklist(session.refreshToken);

      return {
        success: true
      };
    } catch (error) {
      logger.error('Error revoking session', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        success: false,
        error: 'Internal server error while revoking session'
      };
    }
  }

  /**
   * Generate OTP for email verification, password reset, or login
   */
  static async generateOTP(request: GenerateOTPRequest): Promise<{
    success: boolean;
    reference?: string;
    expiresIn?: number;
    error?: string
  }> {
    try {
      // Mock implementation - in production, generate actual OTP and send via email/SMS
      const { identifier, channel, purpose } = request;

      // Generate a 6-digit OTP code
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Set expiration (5 minutes)
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      // Store OTP (in production, use Redis or database)
      const otpRecord: OTPRecord = {
        code,
        userId: '', // Would be linked to actual user in real implementation
        email: channel === 'email' ? identifier : '',
        type: purpose === 'verification' ? 'email_verification' :
          purpose === 'password-reset' ? 'password_reset' : 'login',
        expiresAt,
        attempts: 0
      };

      // Add phone property only if channel is SMS
      if (channel === 'sms') {
        otpRecord.phone = identifier;
      }

      // In a real implementation, store this in Redis or database
      // For now, we'll just log it
      logger.info('OTP generated', { identifier, channel, purpose, code });

      // Send OTP via email or SMS (mock implementation)
      if (channel === 'email') {
        // In real implementation, send email with code
        logger.info(`OTP ${code} sent to email ${identifier}`);
      } else if (channel === 'sms') {
        // In real implementation, send SMS with code
        logger.info(`OTP ${code} sent to phone ${identifier}`);
      }

      return {
        success: true,
        reference: `otp_${Date.now()}`, // Mock reference
        expiresIn: 300 // 5 minutes in seconds
      };
    } catch (error) {
      logger.error('Error generating OTP', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        success: false,
        error: 'Failed to generate OTP'
      };
    }
  }

  /**
   * Verify OTP code
   */
  static async verifyOTP(request: VerifyOTPRequest): Promise<{
    success: boolean;
    valid: boolean;
    error?: string
  }> {
    try {
      const { identifier, code } = request;

      // Mock implementation - in production, check against stored OTP
      // This is just a placeholder that always returns success for demonstration
      logger.info('OTP verification requested', { identifier, code });

      // In a real implementation, you would:
      // 1. Retrieve stored OTP for identifier
      // 2. Check if code matches
      // 3. Check if OTP is expired
      // 4. Increment attempt count
      // 5. Handle locking after too many attempts

      return {
        success: true,
        valid: true // Mock response - always valid in this mock implementation
      };
    } catch (error) {
      logger.error('Error verifying OTP', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        success: false,
        valid: false,
        error: 'Failed to verify OTP'
      };
    }
  }

  /**
   * Resend OTP code
   */
  static async resendOTP(request: ResendOTPRequest): Promise<{
    success: boolean;
    reference?: string;
    expiresIn?: number;
    error?: string
  }> {
    try {
      const { identifier } = request;

      // Mock implementation - in production, regenerate OTP with same parameters
      logger.info('OTP resend requested', { identifier });

      // In a real implementation, you would:
      // 1. Retrieve the original OTP request parameters
      // 2. Generate a new code
      // 3. Update the stored OTP record
      // 4. Send the new code

      return {
        success: true,
        reference: `otp_${Date.now()}`, // Mock reference
        expiresIn: 300 // 5 minutes in seconds
      };
    } catch (error) {
      logger.error('Error resending OTP', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        success: false,
        error: 'Failed to resend OTP'
      };
    }
  }

  /**
   * Create a minimal KYC profile for a user
   */
  static async createMinimalKYCProfile(userId: string, userType: string): Promise<{
    success: boolean;
    error?: string
  }> {
    try {
      // Call compliance service to create minimal KYC profile
      const complianceServiceUrl = config.compliance.serviceUrl;
      logger.info('Creating minimal KYC profile', { complianceServiceUrl, userId, userType });

      // Prepare headers with service-to-service authentication if credential is available
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'service-auth-ms'
      };

      if (config.compliance.serviceCredential) {
        headers['Authorization'] = `Bearer ${config.compliance.serviceCredential}`;
        logger.info('Using service-to-service authentication for compliance service');
      } else {
        logger.warn('No service credential configured for compliance service');
      }

      const response = await axios.post(
        `${complianceServiceUrl}/api/v1/kyc/profile/${userId}`,
        { userType },
        {
          headers,
          timeout: 5000 // 5 second timeout
        }
      );

      logger.info('Minimal KYC profile creation response', { status: response.status, data: response.data });

      if (response.data.success) {
        return {
          success: true
        };
      } else {
        return {
          success: false,
          error: response.data.error
        };
      }
    } catch (error) {
      logger.error('Error creating minimal KYC profile', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: 'Failed to create minimal KYC profile'
      };
    }
  }
}