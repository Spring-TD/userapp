import mongoose, { Schema, Document, Model } from 'mongoose';
import { AboutTheBusinessData } from '../types/kycTypes';

export interface IBusinessInfoDocument extends AboutTheBusinessData, Document {
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

const BusinessInfoSchema = new Schema<IBusinessInfoDocument>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    companyName: { type: String, required: true },
    industry: { type: String, required: true },
    countryOfIncorporation: { type: String, required: true },
    website: { type: String, required: true },
    companyRegId: { type: String, required: true },
    companyLogoUrl: { type: String, required: true }
  },
  { timestamps: true }
);

BusinessInfoSchema.index({ userId: 1 });

export const BusinessInfoModel: Model<IBusinessInfoDocument> =
  mongoose.models.BusinessInfo ??
  mongoose.model<IBusinessInfoDocument>('BusinessInfo', BusinessInfoSchema);
