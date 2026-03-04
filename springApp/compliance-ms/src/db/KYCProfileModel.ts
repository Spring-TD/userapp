import mongoose, { Document, Schema } from 'mongoose';
import { KYCStatus, UserType } from '../types/kycTypes';

const KYCDocumentSchema = new Schema({
  type: { type: String, required: true },
  fileName: { type: String, required: true },
  fileType: { type: String, required: true },
  fileSize: { type: Number, required: true },
  uploadDate: { type: Date, required: true, default: Date.now },
  status: { type: String, required: true, enum: Object.values(KYCStatus) },
  rejectionReason: { type: String }
}, { _id: true });

export interface IKYCProfileDoc extends Document {
  _id: mongoose.Types.ObjectId;
  userId: string;
  userType: string;
  documents: mongoose.Types.DocumentArray<unknown>;
  status: string;
  submittedAt?: Date;
  completedAt?: Date;
  reviewedBy?: string;
  reviewDate?: Date;
  rejectionReason?: string;
  isBlocked?: boolean;
  blockedReason?: string;
  blockedBy?: string;
  blockedAt?: Date;
  unblockedBy?: string;
  unblockedAt?: Date;
  approvalNotes?: string;
  messages?: unknown[];
  shareholders?: unknown[];
  personalInfo?: unknown;
  riskAssessment?: unknown;
  riskLevel?: string;
  workflowStatus?: string;
  businessInfo?: unknown;
  businessSurvey?: unknown;
  beneficialOwners?: unknown[];
  directors?: unknown[];
}

const KYCProfileSchema = new Schema<IKYCProfileDoc>({
  userId: { type: String, required: true, index: true },
  userType: { type: String, required: true, enum: Object.values(UserType) },
  documents: { type: [KYCDocumentSchema], default: [] },
  status: { type: String, required: true, enum: Object.values(KYCStatus) },
  submittedAt: { type: Date },
  completedAt: { type: Date },
  reviewedBy: { type: String },
  reviewDate: { type: Date },
  rejectionReason: { type: String },
  isBlocked: { type: Boolean },
  blockedReason: { type: String },
  blockedBy: { type: String },
  blockedAt: { type: Date },
  unblockedBy: { type: String },
  unblockedAt: { type: Date },
  approvalNotes: { type: String },
  messages: { type: [Schema.Types.Mixed] },
  shareholders: { type: [Schema.Types.Mixed] },
  personalInfo: { type: Schema.Types.Mixed },
  riskAssessment: { type: Schema.Types.Mixed },
  riskLevel: { type: String },
  workflowStatus: { type: String },
  businessInfo: { type: Schema.Types.Mixed },
  businessSurvey: { type: Schema.Types.Mixed },
  beneficialOwners: { type: [Schema.Types.Mixed] },
  directors: { type: [Schema.Types.Mixed] }
}, { strict: false });

KYCProfileSchema.index({ status: 1 });
KYCProfileSchema.index({ userType: 1 });

export default mongoose.model<IKYCProfileDoc>('KYCProfile', KYCProfileSchema);
