import mongoose, { Schema, Document, Model } from 'mongoose';
import type { SubMerchantUsageEventType } from '../types/subMerchantProductUsageEvent';

export interface ISubMerchantProductUsageEventDocument extends Document {
  plataMerchantId: string;
  apiKeyId?: string;
  gatewayEnvironment?: string;
  appId: string;
  productId: string;
  productNameSnapshot?: string;
  merchantId: string;
  merchantName: string;
  subMerchantId: string;
  subMerchantName: string;
  subMerchantEmail: string;
  subMerchantPhone: string;
  externalUserId: string;
  externalUserName: string;
  externalUserEmail: string;
  externalUserPhone: string;
  eventType: SubMerchantUsageEventType;
  startedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const subMerchantProductUsageEventSchema = new Schema<ISubMerchantProductUsageEventDocument>(
  {
    plataMerchantId: { type: String, required: true, index: true },
    apiKeyId: { type: String },
    gatewayEnvironment: { type: String },
    appId: { type: String, required: true, index: true },
    productId: { type: String, required: true, index: true },
    productNameSnapshot: { type: String },
    merchantId: { type: String, required: true, index: true },
    merchantName: { type: String, required: true },
    subMerchantId: { type: String, required: true },
    subMerchantName: { type: String, required: true },
    subMerchantEmail: { type: String, required: true },
    subMerchantPhone: { type: String, required: true },
    externalUserId: { type: String, required: true },
    externalUserName: { type: String, required: true },
    externalUserEmail: { type: String, required: true },
    externalUserPhone: { type: String, required: true },
    eventType: { type: String, required: true, enum: ['started_using_product'], index: true },
    startedAt: { type: Date, required: true, index: true }
  },
  { timestamps: true }
);

subMerchantProductUsageEventSchema.index(
  {
    plataMerchantId: 1,
    appId: 1,
    productId: 1,
    merchantId: 1,
    subMerchantId: 1,
    externalUserId: 1,
    eventType: 1
  },
  { unique: true }
);

export const SubMerchantProductUsageEventModel: Model<ISubMerchantProductUsageEventDocument> =
  mongoose.models.SubMerchantProductUsageEvent ||
  mongoose.model<ISubMerchantProductUsageEventDocument>(
    'SubMerchantProductUsageEvent',
    subMerchantProductUsageEventSchema
  );
