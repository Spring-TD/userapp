import mongoose, { Schema, Document } from 'mongoose';

export interface SupportContactDocument extends Document {
  title: string;
  link_url: string;
  icon_type?: string;
  sort_order: number;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
}

const supportContactSchema = new Schema<SupportContactDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    link_url: { type: String, required: true, trim: true, maxlength: 2000 },
    icon_type: { type: String, trim: true, maxlength: 64 },
    sort_order: { type: Number, default: 0 },
    is_published: { type: Boolean, default: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

supportContactSchema.index({ sort_order: 1, created_at: 1 });

export const SupportContactModel =
  (mongoose.models.SupportContact as mongoose.Model<SupportContactDocument>) ||
  mongoose.model<SupportContactDocument>('SupportContact', supportContactSchema);
