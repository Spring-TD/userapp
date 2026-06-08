import type { ApiResponse } from "./api"

export interface AuthUser {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  country?: string
  user_type?: string
  status?: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken?: string
}

export interface LoginRequestDto {
  email: string
  password: string
  subdomain?: string
  app_id?: string
  appId?: string
  user_merchant_id?: string
  userMerchantId?: string
  merchantId?: string
}

export interface LoginResponseDto extends ApiResponse<{
  user: AuthUser
  tokens?: AuthTokens
  accessToken?: string
  refreshToken?: string
}> {}

export interface MerchantRegistrationRequestDto {
  first_name: string
  last_name: string
  email: string
  phone: string
  country: string
  password: string
  user_merchant_id: string
}

export interface RegistrationResponseDto extends ApiResponse<{
  user: AuthUser
}> {}

export interface ForgotPasswordRequestDto {
  email: string
}

export interface ResetPasswordRequestDto {
  token: string
  password: string
}

export interface VerifyAccountRequestDto {
  token: string
}

export interface VerifyEmailOtpRequestDto {
  email: string
  otp: string
}

export interface ResendEmailOtpRequestDto {
  email: string
}

export interface SessionDto {
  id: string
  deviceInfo?: string
  ipAddress?: string
  lastActiveAt?: string
  isCurrent?: boolean
}

export interface SessionsResponseDto extends ApiResponse<{
  sessions: SessionDto[]
}> {}

