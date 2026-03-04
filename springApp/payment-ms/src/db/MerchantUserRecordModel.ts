import mongoose, { Document, Schema } from 'mongoose';
import { RecordType } from '../types/record';

export interface IMerchantUserRecordDoc extends Document {
  _id: mongoose.Types.ObjectId;
  recordId: string;
  recordType: RecordType.MERCHANT_USER;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  userMerchantId: string;
  country: string;
  phone?: string;
  currentBalance: number;
  currency: string;
  totalDebits: number;
  totalCredits: number;
  isActive: boolean;
  verifiedAt: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const MerchantUserRecordSchema = new Schema<IMerchantUserRecordDoc>({
  recordId: { type: String, required: true, unique: true, index: true },
  recordType: { type: String, required: true, enum: [RecordType.MERCHANT_USER] },
  userId: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, lowercase: true, index: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  userMerchantId: { type: String, required: true, index: true },
  country: { type: String, required: true },
  phone: { type: String },
  currentBalance: { type: Number, default: 0 },
  currency: { type: String, required: true, default: 'USD' },
  totalDebits: { type: Number, default: 0 },
  totalCredits: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  verifiedAt: { type: Date, required: true },
  metadata: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model<IMerchantUserRecordDoc>('MerchantUserRecord', MerchantUserRecordSchema);
