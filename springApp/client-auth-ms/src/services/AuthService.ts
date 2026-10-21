import { User, Merchant, UserType, AccountStatus, UserAccount, Role, Permission, CreateRoleRequest } from '../models/User';
import { db as mockDb } from '../utils/mongoDatabase';
import { hashPassword, comparePassword } from '../utils/crypto';
import { v4 as uuidv4 } from 'uuid';
import { RoleService } from './RoleService';
import axios from 'axios';
import { config } from '../config/environment';
import notificationService, { SendNotificationResponse } from './NotificationService';
import { sendStorefrontInAppPrompt, sendStorefrontNotification } from './storefrontNotificationHelper';
import { SessionService } from './SessionService';
import { fuspayModularService } from './FuspayModularService';
import { resolveFuspayBrandingForApp } from '../utils/fuspayBranding';
import { complianceService } from './ComplianceService';
import { provisionUserWalletAfterSignup, type ProvisionedUserWallet } from './WalletMsService';
import { normalizeCountryToAlpha2 } from '../utils/countryCode';
import type { ResolvedTenantContext } from '../utils/tenantHostResolver';
import { resolveAppDisplayName } from '../utils/tenantHostResolver';
import {
  uploadProfilePictureToSpaces,
  type ProfilePictureUpload
} from './spacesService';

// Type for user response without password
export type UserResponse = Omit<UserAccount, 'password'>;

// Login response interface
export interface LoginResponse {
  success: boolean;
  user?: UserResponse;
  accessToken?: string;
  refreshToken?: string;
  sessionId?: string;
  error?: string;
  emailVerified?: boolean;
  /** Retail storefront users only: current Fuspay/compliance KYC status (e.g. pending, approved). */
  kycStatus?: string;
  /** Retail storefront users only: true when KYC is approved/completed. */
  kycCompleted?: boolean;
}

export interface UserRegistrationData {
  email: string;
  password?: string;
  first_name: string;
  last_name: string;
  phone?: string;
  user_merchant_id?: string;
  country: string;
  user_ref?: string;
  /** Set from `x-tenant-app-id` by registration controller when present; not accepted from public body alone. */
  app_id?: string;
  /** Tenant app display name used for branded signup notifications. */
  appName?: string;
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

type BootstrapApiKeyResult = {
  success: boolean;
  apiKey?: {
    id: string;
    merchant_id: string;
    name: string;
    public_key: string;
    environment: 'test' | 'live';
    status: 'active' | 'revoked' | 'expired';
  };
  secretKey?: string | null;
  error?: string;
};

export interface AdminRegistrationData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  country: string;
}

type LoginMeta = {
  userAgent?: string;
  ip?: string;
  tenant?: ResolvedTenantContext;
};

export class AuthService {
  private static canLoginFromTenant(user: UserAccount, tenant?: ResolvedTenantContext): boolean {
    if (user.user_type !== UserType.USER) {
      return true;
    }

    if (!tenant) {
      return false;
    }

    const appId = 'app_id' in user ? user.app_id?.trim() : '';
    const merchantId = 'user_merchant_id' in user ? user.user_merchant_id?.trim() : '';

    if (appId) {
      return appId === tenant.appId;
    }

    return !!merchantId && merchantId === tenant.merchantId;
  }

  /** Compliance KYC statuses that count as "completed" for storefront access. */
  private static kycCompletedStatuses: Set<string> = new Set(['approved', 'completed']);

  /**
   * Resolve a retail user's KYC summary from compliance-ms for storefront UX.
   * Returns null for non-retail accounts (merchants/admins). Never throws — a
   * compliance outage yields `{ kycStatus: 'unknown', kycCompleted: false }`.
   */
  static async resolveKycSummary(
    user: { id: string; user_type: UserType }
  ): Promise<{ kycStatus: string; kycCompleted: boolean } | null> {
    if (user.user_type !== UserType.USER) {
      return null;
    }
    const kyc = await complianceService.getKycStatus(user.id);
    if (kyc.success && kyc.status) {
      return {
        kycStatus: kyc.status,
        kycCompleted: AuthService.kycCompletedStatuses.has(kyc.status.toLowerCase())
      };
    }
    // No profile yet (notFound) or compliance unavailable: treat as not completed.
    return { kycStatus: kyc.notFound ? 'none' : 'unknown', kycCompleted: false };
  }

  private static otpPurposeLabel: Record<string, string> = {
    verification: 'Verification',
    'password-reset': 'Password Reset',
    'password-change': 'Password Change',
    login: 'Login'
  };

  private static async notifyStorefrontOtpPrompt(
    user: Pick<UserAccount, 'id' | 'user_type'>,
    purpose: 'verification' | 'password-reset' | 'password-change' | 'login',
    appName?: string
  ): Promise<void> {
    if (user.user_type !== UserType.USER) {
      return;
    }
    await sendStorefrontInAppPrompt({
      userId: user.id,
      template: 'otp-prompt',
      data: {
        purpose: AuthService.otpPurposeLabel[purpose] ?? purpose,
        appName: appName?.trim() || 'SpringTD'
      }
    });
  }

  private static async notifyStorefrontDual(
    user: Pick<UserAccount, 'id' | 'email' | 'user_type'>,
    template: string,
    data: Record<string, unknown>,
    emailOverride?: string
  ): Promise<void> {
    if (user.user_type !== UserType.USER) {
      return;
    }
    await sendStorefrontNotification({
      userId: user.id,
      email: emailOverride ?? user.email,
      template,
      data
    });
  }

  private static async bootstrapMerchantApiKey(merchantId: string): Promise<BootstrapApiKeyResult> {
    try {
      const response = await axios.post(
        `${config.serviceAuthUrl}/internal/api/v1/keys/bootstrap`,
        {
          merchantId,
          name: 'Default Live Key',
          environment: 'live',
        },
        {
          headers: {
            'X-Internal-Token': config.serviceAuthInternalToken,
          },
          timeout: config.serviceAuthHttpTimeoutMs,
        }
      );

      const payload = response.data as {
        success?: boolean;
        data?: { apiKey?: BootstrapApiKeyResult['apiKey']; secretKey?: string | null };
        error?: string;
      };

      if (!payload.success || !payload.data?.apiKey) {
        return { success: false, error: payload.error || 'Failed to bootstrap merchant API key' };
      }

      return {
        success: true,
        apiKey: payload.data.apiKey,
        secretKey: payload.data.secretKey ?? null,
      };
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error || error.message)
        : 'Failed to bootstrap merchant API key';
      return { success: false, error: message };
    }
  }

  /**
   * Register a new user
   */
  static async registerUser(userData: UserRegistrationData): Promise<{
    success: boolean;
    user?: UserResponse;
    fuspayProfileCreated?: boolean;
    fuspayUserId?: string;
    fuspayUserRef?: string;
    verificationEmailSent?: boolean;
    verificationEmailError?: string;
    wallet?: ProvisionedUserWallet;
    walletProvisioningError?: string;
    error?: string;
  }> {
    try {
      // Optional logic: if password is empty, user_ref is required (enforced by validation)
      const hasPassword = userData.password != null && userData.password.trim() !== '';
      if (!hasPassword && !userData.user_ref) {
        return {
          success: false,
          error: 'user_ref is required when password is not provided'
        };
      }

      // Check if email already exists on this storefront app. The same email is
      // allowed to register on other apps as a separate account.
      const signupAppId = userData.app_id?.trim() || undefined;
      const existingUser = await mockDb.findUserByEmailAndApp(userData.email, signupAppId);
      if (existingUser) {
        return {
          success: false,
          error: 'Email address is already registered'
        };
      }

      const countryCode = normalizeCountryToAlpha2(userData.country);
      if (!countryCode) {
        return {
          success: false,
          error:
            'Invalid country. Use a recognized English country name or ISO code (e.g. Nigeria or NG).'
        };
      }

      // Hash the password when provided; otherwise use a non-login placeholder for user_ref-only accounts
      const hashedPassword = hasPassword
        ? await hashPassword(userData.password!)
        : await hashPassword(`__no_password_${userData.user_ref}_${Date.now()}__`);

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
        country: countryCode,
        ...(userData.user_ref && { user_ref: userData.user_ref }),
        ...(userData.app_id?.trim() ? { app_id: userData.app_id.trim() } : {}),
        created_at: new Date(),
        updated_at: new Date(),
        last_login_at: undefined,
        deactivated_at: null,
        failed_login_attempts: 0,
        locked_until: undefined
      };

      const user = await mockDb.createUser(newUser as Omit<UserAccount, 'id' | 'created_at' | 'updated_at' | 'failed_login_attempts'>);

      // For subdomain/tenant signup flows, create user profile on Fuspay immediately.
      let fuspayProfileCreated = false;
      let fuspayUserId: string | undefined;
      let fuspayUserRef: string | undefined;
      if (fuspayModularService.isEnabled()) {
        const signupBranding = userData.app_id?.trim()
          ? await resolveFuspayBrandingForApp(config.createAppServiceUrl, userData.app_id.trim())
          : undefined;
        const fuspayResult = await fuspayModularService.createUser({
          email: user.email,
          phone: user.phone || '',
          country: user.country || 'NG',
          userRef: user.id,
          ...(signupBranding ? { branding: signupBranding } : {})
        });
        if (!fuspayResult.success) {
          await mockDb.deleteUser(user.id);
          return {
            success: false,
            error: `User registration failed during Fuspay profile creation: ${fuspayResult.error || 'Unknown error'}`
          };
        }
        fuspayProfileCreated = true;
        fuspayUserId = (fuspayResult.data as any)?.customer_id;
        fuspayUserRef = (fuspayResult.data as any)?.user_ref;
      }

      const complianceResult = await complianceService.createMinimalProfile({
        userId: user.id,
        userType: 'individual',
        ...(fuspayUserId || fuspayUserRef
          ? {
              fuspay: {
                customerId: fuspayUserId,
                userRef: fuspayUserRef || user.id,
                appId: config.fuspayModularAppId || undefined,
                country: user.country || undefined,
                email: user.email || undefined,
                phone: user.phone || undefined
              }
            }
          : {})
      });
      if (!complianceResult.success) {
        await mockDb.deleteUser(user.id);
        return {
          success: false,
          error: `User registration failed during compliance profile creation: ${complianceResult.error || 'Unknown error'}`
        };
      }

      let wallet: ProvisionedUserWallet | undefined;
      let walletProvisioningError: string | undefined;
      if (user.user_merchant_id) {
        const merchantOwner = await mockDb.findMerchantOwnerByTenantMerchantId(user.user_merchant_id);
        const walletResult = await provisionUserWalletAfterSignup({
          userId: user.id,
          merchantId: user.user_merchant_id,
          displayName: `${user.first_name} ${user.last_name}`.trim() || user.email,
          ...(merchantOwner?.id ? { complianceShareholderUserId: merchantOwner.id } : {})
        });
        if (walletResult.success && walletResult.wallet) {
          wallet = walletResult.wallet;
        } else if (walletResult.error && walletResult.error !== 'Wallet provisioning is not configured') {
          walletProvisioningError = walletResult.error;
          console.error('User wallet provisioning failed after signup (user kept):', walletResult.error);
        }
      }

      // Send one-time verification code email via notifications-ms
      let verificationEmailSent = false;
      let verificationEmailError: string | undefined;
      try {
        await AuthService.sendVerificationOtpEmail(
          user.email,
          `${user.first_name} ${user.last_name}`.trim() || 'User',
          userData.appName,
          signupAppId
        );
        verificationEmailSent = true;
        void sendStorefrontInAppPrompt({
          userId: user.id,
          template: 'user-registered',
          data: {
            userName: `${user.first_name} ${user.last_name}`.trim() || 'User',
            appName: userData.appName?.trim() || 'SpringTD'
          }
        });
      } catch (notifError) {
        console.error('Failed to send verification OTP to new user:', notifError);
        verificationEmailError =
          notifError instanceof Error ? notifError.message : 'Failed to send verification email';
      }

      // Return user without password
      const { password, ...userWithoutPassword } = user;
      return {
        success: true,
        user: userWithoutPassword,
        fuspayProfileCreated,
        ...(fuspayUserId ? { fuspayUserId } : {}),
        ...(fuspayUserRef ? { fuspayUserRef } : {}),
        verificationEmailSent,
        ...(wallet ? { wallet } : {}),
        ...(walletProvisioningError ? { walletProvisioningError } : {})
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
  static async registerMerchant(merchantData: MerchantRegistrationData): Promise<{
    success: boolean;
    merchant?: UserResponse;
    verificationEmailSent?: boolean;
    apiKey?: { publicKey: string; secretKey: string | null; environment: 'test' | 'live' };
    /** Present when merchant was created but service-auth bootstrap failed (e.g. timeout). */
    apiKeyBootstrapError?: string;
    error?: string;
  }> {
    try {
      // Merchants are global accounts (no app scope); ensure the email is free
      // among other merchants/admins.
      const existingUser = await mockDb.findUserByEmailAndApp(merchantData.email, undefined);
      if (existingUser) {
        return {
          success: false,
          error: 'Email address is already registered'
        };
      }

      const merchantCountryCode = normalizeCountryToAlpha2(merchantData.country);
      if (!merchantCountryCode) {
        return {
          success: false,
          error:
            'Invalid country. Use a recognized English country name or ISO code (e.g. Nigeria or NG).'
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
        country: merchantCountryCode,
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

      // Bootstrap default merchant API key in service-auth-ms (non-fatal: merchant stays if this fails)
      const bootstrapResult = await AuthService.bootstrapMerchantApiKey(merchant.id);
      let apiKey:
        | { publicKey: string; secretKey: string | null; environment: 'test' | 'live' }
        | undefined;
      let apiKeyBootstrapError: string | undefined;
      if (bootstrapResult.success && bootstrapResult.apiKey) {
        apiKey = {
          publicKey: bootstrapResult.apiKey.public_key,
          secretKey: bootstrapResult.secretKey ?? null,
          environment: bootstrapResult.apiKey.environment
        };
      } else {
        const msg = bootstrapResult.error || 'unknown error';
        console.error('Merchant API key bootstrap failed; merchant account kept:', msg);
        apiKeyBootstrapError = msg;
      }

      // Send one-time verification code email via notifications-ms
      let verificationEmailSent = false;
      let verificationEmailError: string | undefined;
      try {
        await AuthService.sendVerificationOtpEmail(
          merchant.email,
          `${merchant.first_name} ${merchant.last_name}`.trim() || 'Merchant'
        );
        verificationEmailSent = true;
      } catch (notifError) {
        console.error('Failed to send verification OTP to new merchant:', notifError);
        verificationEmailError =
          notifError instanceof Error ? notifError.message : 'Failed to send verification email';
      }

      // Return merchant without password
      const { password, ...merchantWithoutPassword } = merchant;
      return {
        success: true,
        merchant: merchantWithoutPassword,
        verificationEmailSent,
        ...(apiKey ? { apiKey } : {}),
        ...(apiKeyBootstrapError ? { apiKeyBootstrapError } : {})
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
      // Admins are global accounts (no app scope); ensure the email is free
      // among other merchants/admins.
      const existingUser = await mockDb.findUserByEmailAndApp(adminData.email, undefined);
      if (existingUser) {
        return {
          success: false,
          error: 'Email address is already registered'
        };
      }

      const adminCountryCode = normalizeCountryToAlpha2(adminData.country);
      if (!adminCountryCode) {
        return {
          success: false,
          error:
            'Invalid country. Use a recognized English country name or ISO code (e.g. Nigeria or NG).'
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
        country: adminCountryCode,
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
   * Get user by email. When `appId` is provided the lookup is scoped to that
   * storefront app so the same email on other apps is not returned.
   */
  static async getUserByEmail(email: string, appId?: string): Promise<UserResponse | null> {
    const user = appId !== undefined
      ? await mockDb.findUserByEmailAndApp(email, appId)
      : await mockDb.findUserByEmail(email);
    if (!user) return null;

    // Return user without password
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Pick the account to authenticate when an email maps to several per-app
   * identities. Storefront logins resolve to the matching app account; dashboard
   * logins resolve to the global merchant/admin account.
   */
  private static selectLoginUser(
    candidates: UserAccount[],
    tenant?: ResolvedTenantContext
  ): UserAccount | null {
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    if (tenant?.appId) {
      const byApp = candidates.find(
        (c) => 'app_id' in c && c.app_id?.trim() === tenant.appId
      );
      if (byApp) return byApp;

      const byMerchant = candidates.find(
        (c) =>
          c.user_type === UserType.USER &&
          !('app_id' in c && c.app_id?.trim()) &&
          'user_merchant_id' in c &&
          c.user_merchant_id?.trim() === tenant.merchantId
      );
      if (byMerchant) return byMerchant;
    }

    // Dashboard / non-tenant login: prefer the global merchant/admin account.
    const nonApp = candidates.find((c) => c.user_type !== UserType.USER);
    if (nonApp) return nonApp;

    // Fall back to the first match; canLoginFromTenant enforces storefront rules.
    return candidates[0];
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
   * Sub-users (customers) for a merchant, excluding deactivated accounts.
   */
  static async getMerchantUsers(merchantId: string, appId?: string): Promise<{
    success: boolean;
    users?: (UserResponse & { roleName?: string })[];
    error?: string;
  }> {
    try {
      const users = await mockDb.findUsersByMerchantId(merchantId, appId);
      const activeUsers = users.filter((u) => u.status !== AccountStatus.DEACTIVATED);

      const userResponses = await Promise.all(
        activeUsers.map(async (user) => {
          const { password, ...userResponse } = user;
          let roleName: string | undefined;
          if ('role_id' in user && user.role_id) {
            const role = await mockDb.findRoleById(user.role_id);
            if (role) roleName = role.name;
          }
          return { ...userResponse, roleName } as UserResponse & { roleName?: string };
        })
      );

      return { success: true, users: userResponses };
    } catch (error) {
      console.error('Error getting merchant users:', error);
      return {
        success: false,
        error: 'Internal server error while retrieving merchant users'
      };
    }
  }

  /**
   * Platform operators (ADMIN + tenant id `admin`) or same-tenant merchant owners / staff (MERCHANT / USER).
   */
  private static canActorManageStaffUser(actor: UserAccount, target: UserAccount): boolean {
    if (target.user_type !== UserType.USER) {
      return false;
    }
    const isPlatformAdmin =
      actor.user_type === UserType.ADMIN &&
      'user_merchant_id' in actor &&
      actor.user_merchant_id === 'admin';
    if (isPlatformAdmin) {
      return true;
    }
    const sameTenant =
      'user_merchant_id' in actor &&
      'user_merchant_id' in target &&
      actor.user_merchant_id === target.user_merchant_id;
    const merchantSide = actor.user_type === UserType.MERCHANT || actor.user_type === UserType.USER;
    return sameTenant && merchantSide;
  }

  /**
   * Suspend a merchant staff account (`user_type` user). Revokes all sessions.
   */
  static async suspendStaffUser(
    actorUserId: string,
    targetUserId: string
  ): Promise<{ success: boolean; user?: UserResponse; error?: string }> {
    try {
      if (actorUserId === targetUserId) {
        return { success: false, error: 'You cannot suspend your own account' };
      }

      const [actor, target] = await Promise.all([
        mockDb.findUserById(actorUserId),
        mockDb.findUserById(targetUserId)
      ]);

      if (!actor) {
        return { success: false, error: 'Actor user not found' };
      }
      if (!target) {
        return { success: false, error: 'User not found' };
      }

      if (!AuthService.canActorManageStaffUser(actor, target)) {
        return { success: false, error: 'Insufficient permissions to suspend this user' };
      }

      if (target.status === AccountStatus.DEACTIVATED) {
        return { success: false, error: 'Cannot suspend a deactivated account' };
      }

      if (target.status === AccountStatus.SUSPENDED) {
        const { password: _p, ...userResponse } = target;
        return { success: true, user: userResponse };
      }

      const updated = await mockDb.updateUser(targetUserId, {
        status: AccountStatus.SUSPENDED
      });
      if (!updated) {
        return { success: false, error: 'Failed to update user' };
      }

      await SessionService.revokeAllForUser(targetUserId);

      try {
        await notificationService.sendEmailAndInApp({
          userId: targetUserId,
          email: updated.email,
          template: 'merchant-account-status',
          data: {
            merchantName: `${updated.first_name} ${updated.last_name}`.trim() || updated.email,
            action: 'suspended',
            detail: 'Your staff account has been suspended.'
          }
        });
      } catch (notifyErr) {
        console.error('Failed to send suspension notification:', notifyErr);
      }

      const { password: _pwd, ...userResponse } = updated;
      return { success: true, user: userResponse };
    } catch (error) {
      console.error('Error suspending staff user:', error);
      return { success: false, error: 'Internal server error while suspending user' };
    }
  }

  /**
   * Reactivate a suspended staff account (`user_type` user).
   */
  static async activateStaffUser(
    actorUserId: string,
    targetUserId: string
  ): Promise<{ success: boolean; user?: UserResponse; error?: string }> {
    try {
      if (actorUserId === targetUserId) {
        return {
          success: false,
          error: 'You cannot change your own account status through this endpoint'
        };
      }

      const [actor, target] = await Promise.all([
        mockDb.findUserById(actorUserId),
        mockDb.findUserById(targetUserId)
      ]);

      if (!actor) {
        return { success: false, error: 'Actor user not found' };
      }
      if (!target) {
        return { success: false, error: 'User not found' };
      }

      if (!AuthService.canActorManageStaffUser(actor, target)) {
        return { success: false, error: 'Insufficient permissions to activate this user' };
      }

      if (target.status !== AccountStatus.SUSPENDED) {
        return {
          success: false,
          error: 'Only suspended accounts can be reactivated'
        };
      }

      const updated = await mockDb.updateUser(targetUserId, {
        status: AccountStatus.ACTIVE
      });
      if (!updated) {
        return { success: false, error: 'Failed to update user' };
      }

      try {
        await notificationService.sendEmailAndInApp({
          userId: targetUserId,
          email: updated.email,
          template: 'merchant-account-status',
          data: {
            merchantName: `${updated.first_name} ${updated.last_name}`.trim() || updated.email,
            action: 'reactivated',
            detail: 'Your staff account has been reactivated.'
          }
        });
      } catch (notifyErr) {
        console.error('Failed to send reactivation notification:', notifyErr);
      }

      const { password: _pwd, ...userResponse } = updated;
      return { success: true, user: userResponse };
    } catch (error) {
      console.error('Error activating staff user:', error);
      return { success: false, error: 'Internal server error while activating user' };
    }
  }

  /**
   * Invited staff under a merchant (user_type user with role_id). Excludes retail/external users.
   */
  static async getTeamMembers(merchantId: string): Promise<{
    success: boolean;
    members?: (UserResponse & { roleName?: string })[];
    error?: string;
  }> {
    try {
      // No appId — staff invited via Teams typically have role_id and no storefront app_id.
      const users = await mockDb.findUsersByMerchantId(merchantId);
      const staff = users.filter(
        (u) =>
          u.user_type === UserType.USER &&
          'role_id' in u &&
          Boolean(u.role_id) &&
          u.status !== AccountStatus.DEACTIVATED
      );

      const members = await Promise.all(
        staff.map(async (user) => {
          const { password: _p, ...userResponse } = user;
          let roleName: string | undefined;
          if ('role_id' in user && user.role_id) {
            const role = await mockDb.findRoleById(user.role_id);
            if (role) roleName = role.name;
          }
          return { ...userResponse, roleName } as UserResponse & { roleName?: string };
        })
      );

      return { success: true, members };
    } catch (error) {
      console.error('Error getting team members:', error);
      return { success: false, error: 'Internal server error while retrieving team members' };
    }
  }

  /**
   * Change the role assigned to an invited staff member.
   */
  static async updateStaffUserRole(
    actorUserId: string,
    targetUserId: string,
    roleId: string
  ): Promise<{ success: boolean; member?: UserResponse & { roleName?: string }; error?: string }> {
    try {
      if (actorUserId === targetUserId) {
        return { success: false, error: 'You cannot change your own team role through this endpoint' };
      }

      const [actor, target, role] = await Promise.all([
        mockDb.findUserById(actorUserId),
        mockDb.findUserById(targetUserId),
        mockDb.findRoleById(roleId)
      ]);

      if (!actor) {
        return { success: false, error: 'Actor user not found' };
      }
      if (!target) {
        return { success: false, error: 'User not found' };
      }
      if (!role) {
        return { success: false, error: 'Role not found' };
      }

      if (!AuthService.canActorManageStaffUser(actor, target)) {
        return { success: false, error: 'Insufficient permissions to update this team member' };
      }

      if (!('role_id' in target) || !target.role_id) {
        return { success: false, error: 'Target user is not an invited team member' };
      }

      const merchantId =
        'user_merchant_id' in target ? target.user_merchant_id : undefined;
      if (!merchantId || role.merchant_id !== merchantId) {
        return { success: false, error: 'Role does not belong to this merchant' };
      }

      const updated = await mockDb.updateUser(targetUserId, { role_id: roleId } as Partial<UserAccount>);
      if (!updated) {
        return { success: false, error: 'Failed to update team member role' };
      }

      const { password: _p, ...userResponse } = updated;
      return {
        success: true,
        member: { ...userResponse, roleName: role.name }
      };
    } catch (error) {
      console.error('Error updating staff user role:', error);
      return { success: false, error: 'Internal server error while updating team member role' };
    }
  }

  /**
   * Login user
   */
  static async login(
    email: string,
    password: string,
    meta?: LoginMeta
  ): Promise<LoginResponse> {
    try {
      // Find the account for this email within the current storefront/tenant.
      // The same email can exist on multiple apps, so disambiguate via tenant.
      const candidates = await mockDb.findUsersByEmail(email);
      const user = AuthService.selectLoginUser(candidates, meta?.tenant);
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

      // Allow login for ACTIVE or PENDING (unverified email); block SUSPENDED and other states
      if (user.status !== AccountStatus.ACTIVE && user.status !== AccountStatus.PENDING) {
        return {
          success: false,
          error: 'Account is not active'
        };
      }

      if (!AuthService.canLoginFromTenant(user, meta?.tenant)) {
        return {
          success: false,
          error: 'User accounts can only sign in from their storefront'
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

      const { accessToken, refreshToken, sessionId } = await SessionService.issueTokensForNewSession(
        {
          userId: user.id,
          email: user.email,
          userType: user.user_type,
          userMerchantId: 'user_merchant_id' in user ? user.user_merchant_id : undefined,
        },
        { userAgent: meta?.userAgent, ip: meta?.ip }
      );

      // Security alert: new device/browser relative to other active sessions (UA match).
      try {
        const priorSessions = await SessionService.listActiveSessions(user.id);
        const otherSessions = priorSessions.filter((s) => s.id !== sessionId);
        const incomingUa = (meta?.userAgent || '').trim();
        const knownDevice =
          incomingUa.length > 0 &&
          otherSessions.some((s) => (s.userAgent || '').trim() === incomingUa);
        if (otherSessions.length > 0 && !knownDevice) {
          const userName =
            [user.first_name, user.last_name].filter(Boolean).join(' ').trim() ||
            user.email.split('@')[0];
          const device =
            incomingUa.length > 0
              ? incomingUa.length > 80
                ? `${incomingUa.slice(0, 77)}...`
                : incomingUa
              : 'an unrecognized device';
          void AuthService.notifyStorefrontDual(
            user,
            'new-device-login',
            {
              userName,
              device,
              ip: (meta?.ip || '').trim() || 'unknown'
            },
            user.email
          ).catch(() => undefined);
        }
      } catch (e) {
        console.error('Failed to send new-device-login notification:', e);
      }

      // Return user without password and include emailVerified flag for frontend UX
      const { password: pwd, ...userWithoutPassword } = user;

      // Surface KYC status so the storefront can route the user (e.g. to KYC vs
      // homepage). Retail users only; never block or fail login on this lookup.
      const kycSummary = await AuthService.resolveKycSummary(user);

      return {
        success: true,
        user: userWithoutPassword,
        accessToken,
        refreshToken,
        sessionId,
        emailVerified: user.email_verified,
        ...(kycSummary ?? {})
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
  static async initiatePasswordReset(
    email: string,
    appId?: string,
    appName?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Find the account for this email within the storefront app (or global).
      const user = appId !== undefined
        ? await mockDb.findUserByEmailAndApp(email.toLowerCase(), appId)
        : await mockDb.findUserByEmail(email.toLowerCase());
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

      // Password reset uses OTP sent via notifications service.
      const notificationResult = await AuthService.generateOTP({
        identifier: user.email,
        channel: 'email',
        purpose: 'password-reset',
        appId,
        appName
      });

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
   * Reset password with email + OTP
   */
  static async resetPassword(email: string, code: string, newPassword: string, appId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const identifier = email.toLowerCase();
      const otp = await mockDb.findActiveOtp(identifier, 'password-reset', appId);
      if (!otp) {
        return {
          success: false,
          error: 'Invalid or expired password reset code'
        };
      }

      const validCode = await comparePassword(code, otp.code);
      if (!validCode) {
        await mockDb.incrementOtpAttempts((otp as any)._id.toString());
        return {
          success: false,
          error: 'Invalid password reset code'
        };
      }
      await mockDb.markOtpVerified((otp as any)._id.toString());

      // Find the account for this email within the storefront app (or global).
      const user = appId !== undefined
        ? await mockDb.findUserByEmailAndApp(identifier, appId)
        : await mockDb.findUserByEmail(identifier);
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

      await SessionService.revokeAllForUser(user.id);

      console.log(`Password reset successful for ${user.email}`);

      try {
        const userName = `${user.first_name} ${user.last_name}`.trim() || 'User';
        if (user.user_type === UserType.USER) {
          await AuthService.notifyStorefrontDual(user, 'password-change', { userName });
        } else {
          const n = await notificationService.sendPasswordChangedConfirmation(user.email, userName);
          if (!n.success) {
            console.error('Failed to send password-changed confirmation email:', n.error);
          }
        }
      } catch (e) {
        console.error('Failed to send password-changed confirmation email:', e);
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
   * Change password
   */
  static async changePassword(userId: string, currentPassword: string, newPassword: string, code: string): Promise<{ success: boolean; error?: string }> {
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

      const changeAppId = 'app_id' in user ? user.app_id?.trim() : undefined;
      const otp = await mockDb.findActiveOtp(user.email.toLowerCase(), 'password-change', changeAppId);
      if (!otp) {
        return {
          success: false,
          error: 'Invalid or expired password change code'
        };
      }

      const validCode = await comparePassword(code, otp.code);
      if (!validCode) {
        await mockDb.incrementOtpAttempts((otp as any)._id.toString());
        return {
          success: false,
          error: 'Invalid password change code'
        };
      }
      await mockDb.markOtpVerified((otp as any)._id.toString());

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

      await SessionService.revokeAllForUser(user.id);

      console.log(`Password change successful for ${user.email}`);

      try {
        const userName = `${user.first_name} ${user.last_name}`.trim() || 'User';
        if (user.user_type === UserType.USER) {
          await AuthService.notifyStorefrontDual(user, 'password-change', { userName });
        } else {
          const n = await notificationService.sendPasswordChangedConfirmation(user.email, userName);
          if (!n.success) {
            console.error('Failed to send password-changed confirmation email:', n.error);
          }
        }
      } catch (e) {
        console.error('Failed to send password-changed confirmation email:', e);
      }

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
   * Send OTP for authenticated password change confirmation.
   */
  static async requestPasswordChangeOtp(userId: string, appName?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await mockDb.findUserById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }
      if (user.status !== AccountStatus.ACTIVE) {
        return { success: false, error: 'Account is not active' };
      }

      const userAppId = 'app_id' in user ? user.app_id?.trim() : undefined;
      const brandName =
        appName?.trim() || (userAppId ? await resolveAppDisplayName(userAppId) : undefined);

      const notificationResult = await AuthService.generateOTP({
        identifier: user.email,
        channel: 'email',
        purpose: 'password-change',
        appId: userAppId,
        appName: brandName
      });

      if (!notificationResult.success) {
        return { success: false, error: notificationResult.error || 'Failed to send OTP' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Internal server error during password change OTP request' };
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

      const emailAppId = 'app_id' in user ? user.app_id?.trim() : undefined;
      const existingUser = await mockDb.findUserByEmailAndApp(newEmail, emailAppId);
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
        const userName = `${updatedUser.first_name} ${updatedUser.last_name}`.trim() || 'User';
        if (updatedUser.user_type === UserType.USER) {
          await AuthService.notifyStorefrontDual(
            updatedUser,
            'email-verification',
            { userName, verificationUrl },
            updatedUser.email
          );
        } else {
          await notificationService.sendEmailVerificationEmail(updatedUser.email, verificationUrl, userName);
        }
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
   * Update current user's profile (first_name, last_name, phone, country, profile picture).
   * All fields are optional; account must be ACTIVE.
   */
  static async updateUserProfile(
    userId: string,
    profileData: {
      first_name?: string;
      last_name?: string;
      phone?: string;
      country?: string;
      profilePictureFile?: ProfilePictureUpload;
    }
  ): Promise<{ success: boolean; user?: UserResponse; error?: string }> {
    try {
      const user = await mockDb.findUserById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      if (user.status !== AccountStatus.ACTIVE) {
        return { success: false, error: 'Account is not active' };
      }

      const updateData: Partial<UserAccount> & { profile_picture_url?: string } = {
        ...(profileData.first_name !== undefined ? { first_name: profileData.first_name } : {}),
        ...(profileData.last_name !== undefined ? { last_name: profileData.last_name } : {}),
        ...(profileData.phone !== undefined ? { phone: profileData.phone } : {}),
      };

      if (profileData.country !== undefined) {
        const resolvedCountry = normalizeCountryToAlpha2(profileData.country);
        if (!resolvedCountry) {
          return {
            success: false,
            error:
              'Invalid country. Use a recognized English country name or ISO code (e.g. Nigeria or NG).'
          };
        }
        updateData.country = resolvedCountry;
      }

      if (profileData.profilePictureFile) {
        if (user.user_type !== UserType.USER) {
          return { success: false, error: 'Only users can upload a profile picture' };
        }

        try {
          const uploadResult = await uploadProfilePictureToSpaces(userId, profileData.profilePictureFile);
          updateData.profile_picture_url = uploadResult.url;
        } catch (uploadError) {
          const message = uploadError instanceof Error ? uploadError.message : 'Failed to upload profile picture';
          return { success: false, error: message };
        }
      }

      await mockDb.updateUser(userId, updateData);

      const updatedUser = await mockDb.findUserById(userId);
      if (!updatedUser) {
        return { success: false, error: 'Failed to retrieve updated user' };
      }

      const { password: _p, ...userResponse } = updatedUser;
      return { success: true, user: userResponse };
    } catch (error) {
      console.error('Error updating user profile:', error);
      return { success: false, error: 'Internal server error while updating user profile' };
    }
  }

  /**
   * Deactivate current user's account.
   */
  static async deactivateAccount(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await mockDb.findUserById(userId);
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

      await mockDb.updateUser(userId, {
        status: AccountStatus.DEACTIVATED,
        deactivated_at: new Date()
      });

      // Invalidate all active sessions once account is deactivated.
      await SessionService.revokeAllForUser(userId);

      return {
        success: true
      };
    } catch (error) {
      console.error('Error deactivating account:', error);
      return {
        success: false,
        error: 'Internal server error while deactivating account'
      };
    }
  }

  /**
   * Send a one-time verification code email (used after signup).
   * Generates OTP, stores it in DB, and sends via notifications-ms.
   */
  static async sendVerificationOtpEmail(email: string, userName: string, appName?: string, appId?: string): Promise<void> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = await hashPassword(code);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const identifier = email.toLowerCase();

    await mockDb.deleteOtpsByIdentifier(identifier, 'verification', appId);
    await mockDb.createOtp({
      identifier,
      code: hashedCode,
      channel: 'email',
      purpose: 'verification',
      expiresAt,
      appId
    });

    const result = await notificationService.sendOTP(email, code, 'verification', 'email', appName);
    if (!result.success) {
      throw new Error(result.error || 'Failed to send OTP');
    }
  }

  /**
   * Generate OTP: store in DB and send via notifications-ms.
   */
  static async generateOTP(request: {
    identifier: string;
    channel: 'email' | 'sms';
    purpose: 'verification' | 'password-reset' | 'password-change' | 'login';
    appId?: string;
    appName?: string;
  }): Promise<{ success: boolean; reference?: string; expiresIn?: number; error?: string }> {
    try {
      const { identifier, channel, purpose, appId, appName } = request;
      const brandName = appName?.trim() || 'SpringTD';
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedCode = await hashPassword(code);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      const idLower = identifier.toLowerCase();

      await mockDb.deleteOtpsByIdentifier(idLower, purpose, appId);
      await mockDb.createOtp({
        identifier: idLower,
        code: hashedCode,
        channel,
        purpose,
        expiresAt,
        appId
      });

      if (channel === 'email') {
        const notificationResult = await notificationService.sendOTP(
          identifier,
          code,
          purpose,
          'email',
          brandName
        );
        if (!notificationResult.success) {
          console.error('Failed to send OTP email:', notificationResult.error);
          return { success: false, error: 'Failed to send OTP' };
        }
        const user = await mockDb.findUserByEmailAndApp(idLower, appId);
        if (user) {
          void AuthService.notifyStorefrontOtpPrompt(user, purpose, brandName);
        }
      } else {
        const notificationResult = await notificationService.sendOTP(
          identifier,
          code,
          purpose,
          'sms',
          brandName
        );
        if (!notificationResult.success) {
          console.error('Failed to send OTP SMS:', notificationResult.error);
          return { success: false, error: 'Failed to send OTP' };
        }
      }

      return {
        success: true,
        reference: `otp_${Date.now()}`,
        expiresIn: 300
      };
    } catch (error) {
      console.error('Error in generateOTP:', error);
      return {
        success: false,
        error: 'Failed to generate OTP'
      };
    }
  }

  /**
   * Verify OTP: check stored OTP; if purpose is 'verification', mark user email_verified and ACTIVE.
   */
  static async verifyOTP(request: { identifier: string; code: string; appId?: string }): Promise<{ success: boolean; valid: boolean; error?: string }> {
    try {
      const { identifier, code, appId } = request;
      const idLower = identifier.toLowerCase();
      const purposes: Array<'verification' | 'password-reset' | 'password-change' | 'login'> = ['verification', 'password-reset', 'password-change', 'login'];

      for (const purpose of purposes) {
        const otp = await mockDb.findActiveOtp(idLower, purpose, appId);
        if (!otp) continue;

        const valid = await comparePassword(code, otp.code);
        if (!valid) {
          await mockDb.incrementOtpAttempts((otp as any)._id.toString());
          return { success: true, valid: false };
        }

        await mockDb.markOtpVerified((otp as any)._id.toString());

        if (purpose === 'verification') {
          const user = await mockDb.findUserByEmailAndApp(idLower, appId);
          if (user) {
            await mockDb.updateUser(user.id, { email_verified: true, status: AccountStatus.ACTIVE });
          }
        }

        return { success: true, valid: true };
      }

      return { success: true, valid: false };
    } catch (error) {
      console.error('Error in verifyOTP:', error);
      return {
        success: false,
        valid: false,
        error: 'Failed to verify OTP'
      };
    }
  }

  /**
   * Resend OTP: generate a new OTP, store it, and send via email/SMS.
   * For email verification, uses the same path as signup (sendVerificationOtpEmail) so behaviour matches exactly.
   */
  static async resendOTP(request: {
    identifier: string;
    channel: 'email' | 'sms';
    purpose: 'verification' | 'password-reset' | 'password-change' | 'login';
    appId?: string;
    appName?: string;
  }): Promise<{ success: boolean; reference?: string; expiresIn?: number; error?: string }> {
    try {
      const { identifier, channel, purpose, appId, appName } = request;
      if (!identifier || !channel || !purpose) {
        return { success: false, error: 'Identifier, channel, and purpose are required' };
      }

      // Email verification resend: use the exact same flow as signup so OTP is stored and sent identically
      if (channel === 'email' && purpose === 'verification') {
        try {
          await AuthService.sendVerificationOtpEmail(identifier, 'User', appName, appId);
          const user = await mockDb.findUserByEmailAndApp(identifier.toLowerCase(), appId);
          if (user) {
            void AuthService.notifyStorefrontOtpPrompt(user, 'verification', appName);
          }
          return {
            success: true,
            reference: `otp_${Date.now()}`,
            expiresIn: 300
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to send OTP';
          return { success: false, error: message };
        }
      }

      return await AuthService.generateOTP({ identifier, channel, purpose, appId, appName });
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

      // Check if user already exists. Invited sub-users are dashboard accounts
      // (no storefront app scope).
      const existingUser = await mockDb.findUserByEmailAndApp(request.email, undefined);
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