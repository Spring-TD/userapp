import mongoose, { Schema, Document } from 'mongoose';

export interface FaqDocument extends Document {
  question: string;
  answer: string;
  sort_order: number;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
}

const faqSchema = new Schema<FaqDocument>(
  {
    question: { type: String, required: true, trim: true, maxlength: 500 },
    answer: { type: String, required: true, trim: true, maxlength: 50000 },
    sort_order: { type: Number, default: 0 },
    is_published: { type: Boolean, default: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

faqSchema.index({ sort_order: 1, created_at: 1 });

export const FaqModel =
  (mongoose.models.Faq as mongoose.Model<FaqDocument>) ||
  mongoose.model<FaqDocument>('Faq', faqSchema);
