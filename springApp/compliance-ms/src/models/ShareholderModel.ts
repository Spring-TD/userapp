import mongoose, { Schema, Document, Model } from 'mongoose';
import { KYCStatus } from '../types/kycTypes';

/**
 * Shareholder (beneficial owner) information stored in its own collection.
 * Documents are stored in DigitalOcean Spaces; this table holds their URLs and metadata.
 * Each row references the merchant (userId) who owns the shareholder record.
 */
export interface IShareholderDocument extends Document {
  /** Merchant who owns this shareholder record */
  userId: string;
  fullName: string;
  email?: string;
  phoneNumber?: string;
  /** Bank Verification Number */
  bvn?: string;
  bankAccount?: string;
  ownershipPercentage: number;
  /** Ultimate Beneficial Owner (UBO) document – URL in DigitalOcean Spaces */
  uboDocumentUrl?: string;
  uboDocumentFileName?: string;
  uboDocumentFileSize?: number;
  uboDocumentUploadedAt?: Date;
  /** Bank Statement document – URL in DigitalOcean Spaces */
  bankStatementDocumentUrl?: string;
  bankStatementDocumentFileName?: string;
  bankStatementDocumentFileSize?: number;
  bankStatementDocumentUploadedAt?: Date;
  status: KYCStatus;
  submittedAt?: Date;
  /** Liveness verification (url, expiresAt, status, result) */
  kyc?: {
    url: string;
    expiresAt: Date;
    status: string;
    providerReference?: string;
    result?: {
      success: boolean;
      score?: number;
      details?: string;
      completedAt?: Date;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const ShareholderSchema = new Schema<IShareholderDocument>(
  {
    userId: { type: String, required: true, index: true },
    fullName: { type: String, required: true },
    email: { type: String },
    phoneNumber: { type: String },
    bvn: { type: String },
    bankAccount: { type: String },
    ownershipPercentage: { type: Number, required: true },
    uboDocumentUrl: { type: String },
    uboDocumentFileName: { type: String },
    uboDocumentFileSize: { type: Number },
    uboDocumentUploadedAt: { type: Date },
    bankStatementDocumentUrl: { type: String },
    bankStatementDocumentFileName: { type: String },
    bankStatementDocumentFileSize: { type: Number },
    bankStatementDocumentUploadedAt: { type: Date },
    status: { type: String, enum: Object.values(KYCStatus), default: KYCStatus.PENDING },
    submittedAt: { type: Date },
    kyc: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

ShareholderSchema.index({ userId: 1 });

export const ShareholderModel: Model<IShareholderDocument> =
  mongoose.models.Shareholder ??
  mongoose.model<IShareholderDocument>('Shareholder', ShareholderSchema);
