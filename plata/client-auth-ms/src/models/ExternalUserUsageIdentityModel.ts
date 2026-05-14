import mongoose, { Schema, Document } from 'mongoose';

export interface ExternalUserUsageIdentityDocument extends Document {
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
  eventType: 'started_using_product';
  startedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const externalUserUsageIdentitySchema = new Schema<ExternalUserUsageIdentityDocument>(
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

externalUserUsageIdentitySchema.index(
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

export const ExternalUserUsageIdentityModel =
  mongoose.models.ExternalUserUsageIdentity ||
  mongoose.model<ExternalUserUsageIdentityDocument>(
    'ExternalUserUsageIdentity',
    externalUserUsageIdentitySchema
  );
