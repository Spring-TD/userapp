/** Payload for POST /api/v1/registration/user (account-ms → client-auth-ms). */
export interface MobileUserRegistrationDto {
  first_name: string
  last_name: string
  email: string
  phone: string
  /** ISO-2 (e.g. NG) or English name (e.g. Nigeria) — gateway normalizes. */
  country: string
  password: string
  /** Body hint when `x-tenant-subdomain` header is also sent. */
  subdomain?: string
  user_merchant_id?: string
  app_id?: string
}

export interface RegisteredUser {
  id: string
  email: string
  first_name?: string
  last_name?: string
  phone?: string
  user_type?: string
  status?: string
  email_verified?: boolean
  phone_verified?: boolean
  user_merchant_id?: string
  country?: string
  app_id?: string
  created_at?: string
  updated_at?: string
}

export interface RegisterUserWallet {
  id?: string
  merchantId?: string
  userId?: string
  currency?: string
  virtualNuban?: {
    accountNumber?: string
    provisionStatus?: string
  }
}

/** 201 Created — see MOBILE_REGISTRATION.md */
export interface RegisterUserResponse {
  success?: boolean
  user?: RegisteredUser
  fuspayProfileCreated?: boolean
  fuspayUserId?: string
  fuspayUserRef?: string
  verificationEmailSent?: boolean
  wallet?: RegisterUserWallet
  walletProvisioningError?: string
  error?: string
  details?: string | Record<string, unknown>
}

export interface OtpGenerateDto {
  identifier: string
  channel: "email" | "sms" | "whatsapp"
  purpose: string
}

export interface OtpVerifyDto {
  identifier: string
  code: string
  purpose?: string
}

export interface OtpVerifyResponse {
  success?: boolean
  valid?: boolean
  accessToken?: string
  refreshToken?: string
  data?: {
    accessToken?: string
    refreshToken?: string
  }
  error?: string
}

export interface ForgotPasswordDto {
  email: string
}
