import mongoose, { Schema, Document, Model } from 'mongoose';
import { MerchantUserRecord, RecordType } from '../types/record';

export interface IMerchantUserRecordDocument extends Omit<MerchantUserRecord, 'recordId'>, Document {
  recordId: string;
  _id: mongoose.Types.ObjectId;
}

const MerchantUserRecordSchema = new Schema<IMerchantUserRecordDocument>(
  {
    recordId: { type: String, required: true, unique: true },
    recordType: { type: String, enum: [RecordType.MERCHANT_USER], default: RecordType.MERCHANT_USER },
    userId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, lowercase: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    userMerchantId: { type: String, required: true, index: true },
    country: { type: String, required: true },
    phone: { type: String },
    currentBalance: { type: Number, default: 0 },
    currency: { type: String, required: true },
    totalDebits: { type: Number, default: 0 },
    totalCredits: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    verifiedAt: { type: Date, required: true },
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

export const MerchantUserRecordModel: Model<IMerchantUserRecordDocument> =
  mongoose.models.MerchantUserRecord ?? mongoose.model<IMerchantUserRecordDocument>('MerchantUserRecord', MerchantUserRecordSchema);
