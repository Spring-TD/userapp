import mongoose, { Schema, Document } from 'mongoose';

export interface OtpDocument extends Document {
  identifier: string;
  code: string;
  channel: 'email' | 'sms';
  purpose: 'verification' | 'password-reset' | 'login';
  expiresAt: Date;
  attempts: number;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const otpSchema = new Schema<OtpDocument>(
  {
    identifier: { type: String, required: true, lowercase: true, trim: true },
    code: { type: String, required: true },
    channel: { type: String, enum: ['email', 'sms'], required: true },
    purpose: { type: String, enum: ['verification', 'password-reset', 'login'], required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ identifier: 1, purpose: 1 });

export const OtpModel = mongoose.model<OtpDocument>('Otp', otpSchema);
