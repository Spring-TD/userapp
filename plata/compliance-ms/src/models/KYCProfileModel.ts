import mongoose, { Schema, Document, Model } from 'mongoose';
import { KYCProfile, KYCDocument, KYCStatus, UserType } from '../types/kycTypes';

const KYCDocumentSchema = new Schema(
  {
    type: { type: String, required: true },
    fileName: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    uploadDate: { type: Date, required: true },
    status: { type: String, enum: Object.values(KYCStatus), default: KYCStatus.PENDING },
    rejectionReason: { type: String }
  },
  { _id: true }
);

export interface IKYCProfileDocument extends Omit<KYCProfile, 'documents'>, Document {
  documents: (KYCDocument & { _id: mongoose.Types.ObjectId })[];
}

const KYCProfileSchema = new Schema<IKYCProfileDocument>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    userType: { type: String, enum: Object.values(UserType), required: true },
    documents: { type: [KYCDocumentSchema], default: [] },
    status: { type: String, enum: Object.values(KYCStatus), default: KYCStatus.PENDING },
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
    messages: { type: Schema.Types.Mixed },
    shareholders: { type: Schema.Types.Mixed },
    personalInfo: { type: Schema.Types.Mixed },
    riskAssessment: { type: Schema.Types.Mixed },
    riskLevel: { type: String },
    workflowStatus: { type: String },
    businessInfo: { type: Schema.Types.Mixed },
    businessSurvey: { type: Schema.Types.Mixed },
    beneficialOwners: { type: Schema.Types.Mixed },
    directors: { type: Schema.Types.Mixed }
  },
  { timestamps: false }
);

KYCProfileSchema.index({ userId: 1 });
KYCProfileSchema.index({ status: 1 });
KYCProfileSchema.index({ userType: 1 });
KYCProfileSchema.index({ submittedAt: 1 });

export const KYCProfileModel: Model<IKYCProfileDocument> =
  mongoose.models.KYCProfile ?? mongoose.model<IKYCProfileDocument>('KYCProfile', KYCProfileSchema);

function toPlainProfile(doc: IKYCProfileDocument | null): (KYCProfile & { _id: string }) | null {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  const docs = (o.documents || []).map((d: any) => ({
    ...d,
    _id: d._id?.toString?.() ?? d._id
  }));
  return {
    ...o,
    _id: (o._id ?? doc._id)?.toString?.() ?? '',
    documents: docs
  } as KYCProfile & { _id: string };
}

export { toPlainProfile };
