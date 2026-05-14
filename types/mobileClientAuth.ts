/** Payload for POST /api/v1/registration/user (proxied as POST /api/v1/auth/register). */
export interface MobileUserRegistrationDto {
  /** Omitted when `x-tenant-merchant-id` is set (subdomain / tenant resolution). */
  user_merchant_id?: string
  first_name: string
  last_name: string
  email: string
  phone: string
  country: string
  password: string
}

export interface OtpGenerateDto {
  identifier: string
  channel: 'email' | 'sms'
  purpose: string
}

export interface OtpVerifyDto {
  identifier: string
  code: string
  purpose?: string
}

export interface ForgotPasswordDto {
  email: string
}
