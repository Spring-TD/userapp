import mongoose, { Schema, Document, Model } from 'mongoose';
import { BusinessSurveyData } from '../types/kycTypes';

export interface IBusinessSurveyDocument extends BusinessSurveyData, Document {
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

const BusinessSurveySchema = new Schema<IBusinessSurveyDocument>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    businessType: { type: String, required: true },
    country: { type: String, required: true },
    businessModel: { type: String, required: true },
    monthlyProcessedVolume: { type: Number, required: true }
  },
  { timestamps: true }
);

BusinessSurveySchema.index({ userId: 1 });

export const BusinessSurveyModel: Model<IBusinessSurveyDocument> =
  mongoose.models.BusinessSurvey ??
  mongoose.model<IBusinessSurveyDocument>('BusinessSurvey', BusinessSurveySchema);
