import mongoose, { Schema, Document, Model } from 'mongoose';
import type {
  SubMerchantComplianceDocument,
  SubMerchantComplianceStatus,
  SubMerchantProductActivationStatus
} from '../types/subMerchantProductActivation';

export interface ISubMerchantProductActivationDocument extends Document {
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
  status: SubMerchantProductActivationStatus;
  complianceStatus: SubMerchantComplianceStatus;
  complianceDocuments: SubMerchantComplianceDocument[];
  createdAt: Date;
  updatedAt: Date;
}

const subMerchantProductActivationSchema = new Schema<ISubMerchantProductActivationDocument>(
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
    status: {
      type: String,
      required: true,
      enum: ['active', 'deactivated'],
      index: true
    },
    complianceStatus: {
      type: String,
      required: true,
      enum: ['not_started', 'pending', 'completed'],
      default: 'not_started',
      index: true
    },
    complianceDocuments: {
      type: [
        {
          url: { type: String, required: true },
          name: { type: String },
          uploadedAt: { type: String }
        }
      ],
      default: []
    }
  },
  { timestamps: true }
);

subMerchantProductActivationSchema.index(
  {
    plataMerchantId: 1,
    appId: 1,
    productId: 1,
    merchantId: 1,
    subMerchantId: 1
  },
  { unique: true }
);

export const SubMerchantProductActivationModel: Model<ISubMerchantProductActivationDocument> =
  mongoose.models.SubMerchantProductActivation ||
  mongoose.model<ISubMerchantProductActivationDocument>(
    'SubMerchantProductActivation',
    subMerchantProductActivationSchema
  );
