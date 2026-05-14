// ===== REGISTRATION TYPES =====
export interface MerchantRegistrationForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country: string;
  password: string;
}

export interface UserRegistrationForm {
  user_merchant_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country: string;
  password?: string; // optional: when empty, user_ref is required
  user_ref?: string;
}

export interface AdminRegistrationForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country: string;
  password: string;
}

// ===== AUTHENTICATION TYPES =====
export interface LoginRequest {
  email: string;
  password: string;
}

export interface VerifyAccountRequest {
  token: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// ===== OTP TYPES =====
export interface OTPGenerateRequest {
  identifier: string;
  channel: 'email' | 'sms';
  purpose: 'verification' | 'password-reset' | 'password-change' | 'login';
}

export interface OTPVerifyRequest {
  identifier: string;
  code: string;
}

export interface OTPResendRequest {
  identifier: string;
  channel: 'email' | 'sms';
  purpose: 'verification' | 'password-reset' | 'password-change' | 'login';
}

// ===== PASSWORD TYPES =====
export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  identifier: string;
  code: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  code: string;
}

// ===== USER TYPES =====
export interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
}

export interface VerifyUserInfoRequest {
  verificationData: any;
}

export interface SuspendUserRequest {
  reason?: string;
}

// ===== RESPONSE TYPES =====
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: string;
}

export interface AuthResponse {
  user: UserInfo;
  token?: string;
  refreshToken?: string;
}

export interface UserInfo {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: 'user' | 'merchant';
  status: 'pending' | 'active' | 'suspended' | 'deactivated';
  email_verified: boolean;
  phone_verified: boolean;
  created_at: string;
  user_merchant_id?: string;
  country?: string;
  phone?: string;
}

export interface OTPResponse {
  reference: string;
  expiresIn: number;
}

export interface TokenResponse {
  accessToken: string;
}