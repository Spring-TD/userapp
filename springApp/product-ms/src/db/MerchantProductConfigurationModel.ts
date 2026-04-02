import mongoose, { Document, Schema } from 'mongoose';
import { MerchantProductConfiguration } from '../types/productConfiguration';

export interface IMerchantProductConfiguration extends Document {
  _id: mongoose.Types.ObjectId;
  productId: string;
  appId: string;
  isActive: boolean;
  pricingType?: string;
  pricingCondition?: string;
  upperCap?: number;
  lowerCap?: number;
  springTDFee?: number;
  serviceFee?: number;
  markupRate?: number;
  customTerms?: Record<string, unknown>;
  enabledFeatures?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const MerchantProductConfigurationSchema = new Schema<IMerchantProductConfiguration>(
  {
    productId: { type: String, required: true, index: true },
    appId: { type: String, required: true, index: true },
    isActive: { type: Boolean, required: true, default: false },
    pricingType: { type: String },
    pricingCondition: { type: String },
    upperCap: { type: Number },
    lowerCap: { type: Number },
    springTDFee: { type: Number },
    serviceFee: { type: Number },
    markupRate: { type: Number, default: 0 },
    customTerms: { type: Schema.Types.Mixed },
    enabledFeatures: { type: [String], default: [] }
  },
  { timestamps: true }
);

// Compound index for app + product lookups
MerchantProductConfigurationSchema.index({ appId: 1, productId: 1 }, { unique: true });

export default mongoose.model<IMerchantProductConfiguration>(
  'MerchantProductConfiguration',
  MerchantProductConfigurationSchema
);
