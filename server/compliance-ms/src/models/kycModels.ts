// src/models/KYCDocument.ts
import { model, Schema, Document } from 'mongoose';
import { KYCDocument } from '../types/kycTypes';

// MongoDB schema for KYC documents
const KYCDocumentSchema = new Schema<KYCDocument & Document>({
  type: {
    type: String,
    enum: Object.values(DocumentType),
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: Object.values(KYCStatus),
    default: KYCStatus.PENDING
  },
  rejectionReason: {
    type: String
  }
});

export const KYCDocumentModel = model<KYCDocument & Document>('KYCDocument', KYCDocumentSchema);

// src/models/KYCProfile.ts
import { model, Schema, Document } from 'mongoose';
import { KYCProfile } from '../types/kycTypes';
import { KYCDocumentModel } from './KYCDocument';

// MongoDB schema for KYC profiles
const KYCProfileSchema = new Schema<KYCProfile & Document>({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  userType: {
    type: String,
    enum: Object.values(UserType),
    required: true
  },
  documents: {
    type: [KYCDocumentSchema],
    required: true,
    default: []
  },
  status: {
    type: String,
    enum: Object.values(KYCStatus),
    default: KYCStatus.PENDING
  },
  submittedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  reviewedBy: {
    type: String
  },
  reviewDate: {
    type: Date
  },
  rejectionReason: {
    type: String
  }
});

export const KYCProfileModel = model<KYCProfile & Document>('KYCProfile', KYCProfileSchema);