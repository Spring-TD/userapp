import mongoose, { Document, Schema } from 'mongoose';
import { DnsConfiguration } from '../types/app';

const DnsConfigurationSchema = new Schema(
  {
    aRecord: {
      type: { type: String, enum: ['A'] },
      name: String,
      value: String
    },
    cnameRecords: [
      {
        type: { type: String, enum: ['CNAME'] },
        name: String,
        value: String
      }
    ],
    txtRecords: [
      {
        type: { type: String, enum: ['TXT'] },
        name: String,
        value: String
      }
    ],
    baseUrl: String
  },
  { _id: false }
);

export interface IAppDocument extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  websiteUrl: string;
  alias: string;
  description: string;
  merchantId: string;
  subdomain: string;
  customDomain?: string;
  customDomainActive?: boolean;
  customDomainVerified?: boolean;
  customDomainVerifiedAt?: string;
  dnsConfiguration?: DnsConfiguration;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'incomplete';
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  productKeys?: string[];
  activeConfigurationId?: string;
}

const AppSchema = new Schema<IAppDocument>(
  {
    name: { type: String, required: true },
    websiteUrl: { type: String, required: true },
    alias: { type: String, required: true },
    description: { type: String, required: true },
    merchantId: { type: String, required: true },
    subdomain: { type: String, required: true },
    customDomain: { type: String },
    customDomainActive: { type: Boolean, default: false },
    customDomainVerified: { type: Boolean, default: false },
    customDomainVerifiedAt: { type: String },
    dnsConfiguration: { type: DnsConfigurationSchema },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'rejected', 'incomplete'],
      default: 'draft'
    },
    submittedAt: { type: String },
    approvedAt: { type: String },
    rejectedAt: { type: String },
    rejectionReason: { type: String },
    productKeys: { type: [String], default: [] },
    activeConfigurationId: { type: String }
  },
  {
    timestamps: true,
    toJSON: { virtuals: false },
    toObject: { virtuals: false }
  }
);

AppSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

AppSchema.index({ subdomain: 1 });
AppSchema.index({ customDomain: 1 });
AppSchema.index({ merchantId: 1 });

export default mongoose.model<IAppDocument>('App', AppSchema);
