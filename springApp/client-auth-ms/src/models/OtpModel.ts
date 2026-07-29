import mongoose, { Schema, Document } from 'mongoose';

export interface OtpDocument extends Document {
  identifier: string;   // email or phone number
  app_id?: string;       // storefront app scope (absent for merchant/admin/global OTPs)
  code: string;          // bcrypt-hashed 6-digit code
  channel: 'email' | 'sms';
  purpose: 'verification' | 'password-reset' | 'password-change' | 'login';
  expiresAt: Date;
  attempts: number;      // verification attempt counter
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const otpSchema = new Schema<OtpDocument>(
  {
    identifier: { type: String, required: true, lowercase: true, trim: true },
    app_id: { type: String, trim: true },
    code: { type: String, required: true },
    channel: { type: String, enum: ['email', 'sms'], required: true },
    purpose: { type: String, enum: ['verification', 'password-reset', 'password-change', 'login'], required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Auto-delete expired documents
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Fast lookup by identifier + purpose (+ app scope)
otpSchema.index({ identifier: 1, purpose: 1, app_id: 1 });

export const OtpModel = mongoose.model<OtpDocument>('Otp', otpSchema);
