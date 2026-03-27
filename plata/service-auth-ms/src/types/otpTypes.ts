// OTP types
export type OTPType = 'email_verification' | 'password_reset' | 'login';

// OTP channel
export type OTPChannel = 'email' | 'sms';

// OTP purpose
export type OTTPurpose = 'verification' | 'password-reset' | 'login';

// OTP storage interface
export interface OTPRecord {
  code: string;
  userId: string;
  email: string;
  phone?: string;
  type: OTPType;
  expiresAt: Date;
  attempts: number;
  lockedUntil?: Date;
  channelId?: string; // Twilio channel ID for SMS tracking
}

// Request types
export interface GenerateOTPRequest {
  identifier: string; // email or phone number
  channel: OTPChannel;
  purpose: OTTPurpose;
}

export interface VerifyOTPRequest {
  identifier: string; // email or phone number
  code: string;
}

export interface ResendOTPRequest {
  identifier: string; // email or phone number
}