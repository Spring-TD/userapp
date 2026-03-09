import { User, Merchant, UserType, AccountStatus, UserAccount, Role, Permission, CreateRoleRequest } from '../models/User';
import { db as mockDb } from '../utils/mongoDatabase';
import { hashPassword, comparePassword, generateAccessToken, generateRefreshToken, verifyToken, generatePasswordResetToken } from '../utils/crypto';
import { v4 as uuidv4 } from 'uuid';
import { RoleService } from './RoleService';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';
import notificationService, { SendNotificationResponse } from './NotificationService';

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
  user_merchant_id?: string;
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
  /**
   * Register a new user
   */
  static async registerUser(userData: UserRegistrationData): Promise<{ success: boolean; user?: UserResponse; error?: string }> {
    try {
      // Check if email already exists
      const existingUser = await mockDb.findUserByEmail(userData.email);
      if (existingUser) {
        return {
          success: false,
          error: 'Email address is already registered'
        };
      }

      // Hash the password
      const hashedPassword = await hashPassword(userData.password);

      // Create the user
      const newUser: Omit<User, 'id'> & { created_at: Date; updated_at: Date; failed_login_attempts: number } = {
        email: userData.email,
        password: hashedPassword,
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone: userData.phone,
        user_type: UserType.USER,
        status: AccountStatus.PENDING, // User needs to verify email
        email_verified: false,
        phone_verified: false,
        user_merchant_id: userData.user_merchant_id || '',
        country: userData.country,
        created_at: new Date(),
        updated_at: new Date(),
        last_login_at: undefined,
        deactivated_at: null,
        failed_login_attempts: 0,
        locked_until: undefined
      };

      const user = await mockDb.createUser(newUser as Omit<UserAccount, 'id' | 'created_at' | 'updated_at' | 'failed_login_attempts'>);

      // Return user without password
      const { password, ...userWithoutPassword } = user;
      return {
        success: true,
        user: userWithoutPassword
      };
    } catch (error) {
      console.error('Error registering user:', error);
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Register a new merchant
   */
  static async registerMerchant(merchantData: MerchantRegistrationData): Promise<{ success: boolean; merchant?: UserResponse; error?: string }> {
    try {
      // Check if email already exists
      const existingUser = await mockDb.findUserByEmail(merchantData.email);
      if (existingUser) {
        return {
          success: false,
          error: 'Email address is already registered'
        };
      }

      // Hash the password
      const hashedPassword = await hashPassword(merchantData.password);

      // Create the merchant
      const newMerchant: Omit<Merchant, 'id'> & { created_at: Date; updated_at: Date; failed_login_attempts: number } = {
        email: merchantData.email,
        password: hashedPassword,
        first_name: merchantData.first_name,
        last_name: merchantData.last_name,
        phone: merchantData.phone,
        user_type: UserType.MERCHANT,
        status: AccountStatus.PENDING, // Merchant needs to verify email
        email_verified: false,
        phone_verified: false,
        user_merchant_id: merchantData.user_merchant_id,
        country: merchantData.country,
        callback_url: undefined,
        error_logs_url: undefined,
        created_at: new Date(),
        updated_at: new Date(),
        last_login_at: undefined,
        deactivated_at: null,
        failed_login_attempts: 0,
        locked_until: undefined
      };

      const merchant = await mockDb.createUser(newMerchant as Omit<UserAccount, 'id' | 'created_at' | 'updated_at' | 'failed_login_attempts'>);

      // Return merchant without password
      const { password, ...merchantWithoutPassword } = merchant;
      return {
        success: true,
        merchant: merchantWithoutPassword
      };
    } catch (error) {
      console.error('Error registering merchant:', error);
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Register a new admin
   */
  static async registerAdmin(adminData: AdminRegistrationData): Promise<{ success: boolean; user?: UserResponse; error?: string }> {
    try {
      // Check if email already exists
      const existingUser = await mockDb.findUserByEmail(adminData.email);
      if (existingUser) {
        return {
          success: false,
          error: 'Email address is already registered'
        };
      }

      // Hash the password
      const hashedPassword = await hashPassword(adminData.password);

      // Create the admin
      const newAdmin: Omit<User, 'id'> & { created_at: Date; updated_at: Date; failed_login_attempts: number } = {
        email: adminData.email,
        password: hashedPassword,
        first_name: adminData.first_name,
        last_name: adminData.last_name,
        phone: adminData.phone,
        user_type: UserType.ADMIN,
        status: AccountStatus.ACTIVE, // Admins are active by default
        email_verified: true, // Admins are verified by default
        phone_verified: false,
        user_merchant_id: 'admin', // Fixed value for admins
        country: adminData.country,
        created_at: new Date(),
        updated_at: new Date(),
        last_login_at: undefined,
        deactivated_at: null,
        failed_login_attempts: 0,
        locked_until: undefined
      };

      const admin = await mockDb.createUser(newAdmin as Omit<UserAccount, 'id' | 'created_at' | 'updated_at' | 'failed_login_attempts'>);

      // Return admin without password
      const { password, ...adminWithoutPassword } = admin;
      return {
        success: true,
        user: adminWithoutPassword
      };
    } catch (error) {
      console.error('Error registering admin:', error);
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<UserResponse | null> {
    const user = await mockDb.findUserByEmail(email);
    if (!user) return null;

    // Return user without password
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Get user by ID
   */
  static async getUserById(id: string): Promise<UserResponse | null> {
    const user = await mockDb.findUserById(id);
    if (!user) return null;

    // Return user without password
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Login user
   */
  static async login(email: string, password: string): Promise<LoginResponse> {
    try {
      // Find user by email
      const user = await mockDb.findUserByEmail(email);
      if (!user) {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      // Check if account is locked
      if (user.locked_until && user.locked_until > new Date()) {
        return {
          success: false,
          error: 'Account is temporarily locked due to multiple failed login attempts'
        };
      }

      // Compare passwords
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        // Update failed login attempts
        const newFailedAttempts = user.failed_login_attempts + 1;
        let lockedUntil: Date | undefined;

        if (newFailedAttempts >= 5) { // Assuming 5 attempts is the threshold
          lockedUntil = new Date();
          lockedUntil.setTime(lockedUntil.getTime() + 30 * 60 * 1000); // Lock for 30 minutes
        }

        await mockDb.updateUser(user.id, {
          failed_login_attempts: newFailedAttempts,
          locked_until: lockedUntil
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
          error: 'Account is not active'
        };
      }

      // Check if email is verified
      if (!user.email_verified) {
        return {
          success: false,
          error: 'Email not verified'
        };
      }

      // Reset failed login attempts on successful login
      await mockDb.updateUser(user.id, {
        failed_login_attempts: 0,
        locked_until: undefined,
        last_login_at: new Date()
      });

      // Generate tokens
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        userType: user.user_type,
        userMerchantId: 'user_merchant_id' in user ? user.user_merchant_id : undefined
      };

      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      // Return user without password
      const { password: pwd, ...userWithoutPassword } = user;

      return {
        success: true,
        user: userWithoutPassword,
        accessToken,
        refreshToken
      };
    } catch (error) {
      console.error('Error during login:', error);
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Verify email
   */
  static async verifyEmail(token: string): Promise<{ success: boolean; user?: UserResponse; error?: string }> {
    // In a real implementation, you would verify the email token
    // For now, we'll simulate by updating a user's email_verified status
    // This is a simplified implementation for demonstration
    return {
      success: false,
      error: 'Email verification not implemented in this simplified version'
    };
  }

  /**
   * Initiate password reset
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
      const resetToken = generatePasswordResetToken({ userId: user.id, email: user.email, userType: user.user_type, userMerchantId: 'user_merchant_id' in user ? user.user_merchant_id : undefined });

      // Send password reset email via notifications service
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
      const notificationResult = await notificationService.sendPasswordResetEmail(
        user.email,
        resetUrl,
        `${user.first_name} ${user.last_name}`
      );

      if (!notificationResult.success) {
        console.error('Failed to send password reset email:', notificationResult.error);
        // Still return success to prevent email enumeration attacks
      } else {
        console.log(`Password reset email sent to ${user.email}`);
      }

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: 'Internal server error during password reset'
      };
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify the password reset token
      let tokenData;
      try {
        const decoded = jwt.verify(token, config.jwt.secret) as any;

        if (decoded.type !== 'password_reset') {
          return {
            success: false,
            error: 'Invalid password reset token'
          };
        }

        // We'll use the decoded payload as tokenData
        tokenData = { valid: true, payload: decoded };
      } catch (error) {
        return {
          success: false,
          error: 'Invalid or expired password reset token'
        };
      }

      // Find user by ID
      const user = await mockDb.findUserById(tokenData.payload.userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Check if email matches
      if (user.email !== tokenData.payload.email) {
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
      await mockDb.updateUser(user.id, {
        password: hashedPassword,
        failed_login_attempts: 0 // Reset failed login attempts
      });

      console.log(`Password reset successful for ${user.email}`);

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: 'Internal server error during password reset'
      };
    }
  }

  /**
   * Change password
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

      console.log(`Password change successful for ${user.email}`);

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: 'Internal server error during password change'
      };
    }
  }

  /**
   * Update email for authenticated user.
   * Requires current password. Sets email_verified to false until new email is verified.
   */
  static async updateEmail(userId: string, currentPassword: string, newEmail: string): Promise<{ success: boolean; user?: UserResponse; error?: string }> {
    try {
      const user = await mockDb.findUserById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      if (user.status !== AccountStatus.ACTIVE) {
        return { success: false, error: 'Account is not active' };
      }

      const isPasswordValid = await comparePassword(currentPassword, user.password);
      if (!isPasswordValid) {
        return { success: false, error: 'Current password is incorrect' };
      }

      const normalizedNew = newEmail.trim().toLowerCase();
      if (normalizedNew === user.email.toLowerCase()) {
        return { success: false, error: 'New email is the same as your current email' };
      }

      const existingUser = await mockDb.findUserByEmail(newEmail);
      if (existingUser) {
        return { success: false, error: 'Email address is already in use' };
      }

      const updatedUser = await mockDb.updateUser(userId, {
        email: newEmail.trim(),
        email_verified: false
      });
      if (!updatedUser) {
        return { success: false, error: 'Failed to update email' };
      }

      // Send verification email to new address (optional; don't fail the request if it fails)
      try {
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?email=${encodeURIComponent(updatedUser.email)}`;
        await notificationService.sendEmailVerificationEmail(
          updatedUser.email,
          verificationUrl,
          `${updatedUser.first_name} ${updatedUser.last_name}`.trim() || 'User'
        );
      } catch (notifError) {
        console.error('Failed to send email verification to new address:', notifError);
      }

      const { password: _p, ...userResponse } = updatedUser;
      return { success: true, user: userResponse };
    } catch (error) {
      console.error('Error updating email:', error);
      return { success: false, error: 'Internal server error while updating email' };
    }
  }

  /**
   * Generate OTP
   */
  static async generateOTP(request: { identifier: string; channel: 'email' | 'sms'; purpose: 'verification' | 'password-reset' | 'login' }): Promise<{ success: boolean; reference?: string; expiresIn?: number; error?: string }> {
    try {
      // Mock implementation - in production, generate actual OTP and send via email/SMS
      const { identifier, channel, purpose } = request;

      // Generate a 6-digit OTP code
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Set expiration (5 minutes)
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      // Log the OTP generation for debugging
      console.log('OTP generated', { identifier, channel, purpose, code });

      // Send OTP via notifications service
      if (channel === 'email') {
        const notificationResult = await notificationService.sendOTP(identifier, code, purpose);
        if (!notificationResult.success) {
          console.error('Failed to send OTP email:', notificationResult.error);
          return {
            success: false,
            error: 'Failed to send OTP'
          };
        }
      } else if (channel === 'sms') {
        // For SMS, we would need to implement SMS sending via notifications service
        console.log(`OTP ${code} sent to phone ${identifier}`);
      }

      return {
        success: true,
        reference: `otp_${Date.now()}`, // Mock reference
        expiresIn: 300 // 5 minutes in seconds
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to generate OTP'
      };
    }
  }

  /**
   * Verify OTP
   */
  static async verifyOTP(request: { identifier: string; code: string }): Promise<{ success: boolean; valid: boolean; error?: string }> {
    try {
      const { identifier, code } = request;

      // Log OTP verification for debugging
      console.log('OTP verification requested', { identifier, code });

      // Mock response - in a real implementation, you would check against stored OTP
      return {
        success: true,
        valid: true // Mock response - always valid in this mock implementation
      };
    } catch (error) {
      return {
        success: false,
        valid: false,
        error: 'Failed to verify OTP'
      };
    }
  }

  /**
   * Resend OTP
   */
  static async resendOTP(request: { identifier: string }): Promise<{ success: boolean; reference?: string; expiresIn?: number; error?: string }> {
    try {
      const { identifier } = request;

      // Log OTP resend for debugging
      console.log('OTP resend requested', { identifier });

      return {
        success: true,
        reference: `otp_${Date.now()}`, // Mock reference
        expiresIn: 300 // 5 minutes in seconds
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to resend OTP'
      };
    }
  }

  /**
   * Create invitation
   */
  static async createInvitation(merchantId: string, request: { email: string; roleId: string }): Promise<{ success: boolean; invitation?: any; error?: string }> {
    try {
      // Validate role exists and belongs to merchant
      const role = await mockDb.findRoleById(request.roleId);
      if (!role) {
        return {
          success: false,
          error: 'Role not found'
        };
      }

      // Ensure merchant owns the role
      if (role.merchant_id !== merchantId) {
        return {
          success: false,
          error: 'Unauthorized to assign this role'
        };
      }

      // Check if user already exists
      const existingUser = await mockDb.findUserByEmail(request.email);
      if (existingUser) {
        return {
          success: false,
          error: 'User already exists'
        };
      }

      const token = uuidv4();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours

      const invitation: any = {
        id: uuidv4(),
        email: request.email,
        roleId: request.roleId,
        merchantId: merchantId,
        token,
        status: 'pending' as const,
        expiresAt,
        createdAt: now,
        updatedAt: now
      };

      await mockDb.createInvitation(invitation);

      // Get merchant details to include in invitation email
      const merchant = await mockDb.findUserById(merchantId);

      // Send invitation email via notifications service
      const invitationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/accept-invitation?token=${token}`;
      const notificationResult = await notificationService.sendInvitationEmail(
        request.email,
        invitationUrl,
        merchant ? `${merchant.first_name} ${merchant.last_name}` : 'Merchant',
        role.name
      );

      if (!notificationResult.success) {
        console.error('Failed to send invitation email:', notificationResult.error);
      } else {
        console.log(`Invitation email sent to ${request.email}`);
      }

      return {
        success: true,
        invitation
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to create invitation'
      };
    }
  }

  /**
   * Get invitations for a merchant
   */
  static async getInvitations(merchantId: string): Promise<{ success: boolean; invitations?: any[]; error?: string }> {
    try {
      const invitations = await mockDb.findInvitationsByMerchantId(merchantId);

      return {
        success: true,
        invitations
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get invitations'
      };
    }
  }

  /**
   * Validate invitation token
   */
  static async validateInvitationToken(token: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const invitation = await mockDb.findInvitationByToken(token);
      if (!invitation || invitation.status !== 'pending' || new Date() > invitation.expiresAt) {
        return {
          success: false,
          error: 'Invalid or expired invitation token'
        };
      }

      const role = await mockDb.findRoleById(invitation.roleId);
      const merchant = await mockDb.findUserById(invitation.merchantId);

      return {
        success: true,
        data: {
          email: invitation.email,
          roleName: role ? role.name : 'Unknown Role',
          merchantName: merchant ? `${merchant.first_name} ${merchant.last_name}` : 'Merchant'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to validate invitation token'
      };
    }
  }

  /**
   * Accept invitation and register user
   */
  static async acceptInvitation(request: { token: string; password: string; firstName: string; lastName: string; phone?: string }): Promise<{ success: boolean; user?: UserResponse; error?: string }> {
    try {
      const invitation = await mockDb.findInvitationByToken(request.token);

      if (!invitation) {
        return {
          success: false,
          error: 'Invalid invitation token'
        };
      }

      if (invitation.status !== 'pending') {
        return {
          success: false,
          error: `Invitation is ${invitation.status}`
        };
      }

      if (new Date() > invitation.expiresAt) {
        await mockDb.updateInvitation(invitation.id, { status: 'expired' });
        return {
          success: false,
          error: 'Invitation expired'
        };
      }

      // Create the user
      const hashedPassword = await hashPassword(request.password);

      const newUser: Omit<User, 'id' | 'created_at' | 'updated_at' | 'failed_login_attempts'> = {
        email: invitation.email,
        password: hashedPassword,
        first_name: request.firstName,
        last_name: request.lastName,
        ...(request.phone && { phone: request.phone }),
        user_type: UserType.USER,
        status: AccountStatus.ACTIVE, // active immediately as they verified via invitation
        email_verified: true,
        phone_verified: false,
        user_merchant_id: invitation.merchantId,
        country: 'US', // Default or need to ask in form
        role_id: invitation.roleId
      };

      const createdUser = await mockDb.createUser(newUser) as User;

      // Update invitation status
      await mockDb.updateInvitation(invitation.id, { status: 'accepted' });

      // Remove password from response
      const { password, ...userResponse } = createdUser;

      return {
        success: true,
        user: userResponse
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to accept invitation'
      };
    }
  }
}