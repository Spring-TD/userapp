import mongoose, { Document, Schema } from 'mongoose';

export enum LegalDocumentType {
  TERMS_OF_SERVICE = 'terms_of_service',
  PRIVACY_POLICY = 'privacy_policy',
}

export interface LegalDocumentDocument extends Document {
  document_type: LegalDocumentType;
  title: string;
  effective_date: Date;
  content: string;
  sort_order: number;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
}

const legalDocumentSchema = new Schema<LegalDocumentDocument>(
  {
    document_type: {
      type: String,
      enum: Object.values(LegalDocumentType),
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 250 },
    effective_date: { type: Date, required: true },
    content: { type: String, required: true, trim: true, maxlength: 100000 },
    sort_order: { type: Number, default: 0 },
    is_published: { type: Boolean, default: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

legalDocumentSchema.index({ document_type: 1, sort_order: 1, created_at: 1 });

export const LegalDocumentModel =
  (mongoose.models.LegalDocument as mongoose.Model<LegalDocumentDocument>) ||
  mongoose.model<LegalDocumentDocument>('LegalDocument', legalDocumentSchema);
