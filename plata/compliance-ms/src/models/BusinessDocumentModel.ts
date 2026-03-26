import mongoose, { Schema, Document, Model } from 'mongoose';
import { BusinessDocumentType, KYCStatus } from '../types/kycTypes';

/**
 * Business document stored in its own collection.
 * File is stored in DigitalOcean Spaces; this table holds the URL and metadata.
 * Each row references the merchant (userId) who owns the document.
 */
export interface IBusinessDocumentDocument extends Document {
  userId: string;
  documentType: BusinessDocumentType;
  /** Display name for the document type (e.g. "COI (Certificate of Incorporation)") */
  displayName: string;
  /** URL of the document in DigitalOcean Spaces */
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
  status: KYCStatus;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BusinessDocumentSchema = new Schema<IBusinessDocumentDocument>(
  {
    userId: { type: String, required: true, index: true },
    documentType: { type: String, required: true, enum: Object.values(BusinessDocumentType) },
    displayName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    uploadedAt: { type: Date, required: true, default: Date.now },
    status: { type: String, enum: Object.values(KYCStatus), default: KYCStatus.PENDING },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

BusinessDocumentSchema.index({ userId: 1 });
BusinessDocumentSchema.index({ userId: 1, documentType: 1 }, { unique: true });

export const BusinessDocumentModel: Model<IBusinessDocumentDocument> =
  mongoose.models.BusinessDocument ??
  mongoose.model<IBusinessDocumentDocument>('BusinessDocument', BusinessDocumentSchema);
