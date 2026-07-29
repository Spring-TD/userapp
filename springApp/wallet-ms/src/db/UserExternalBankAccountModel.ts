import mongoose, { Document, Schema } from 'mongoose';

export interface IUserExternalBankAccountDoc extends Document {
  _id: mongoose.Types.ObjectId;
  userId: string;
  accountNumber: string;
  bankCode: string;
  bankName?: string;
  accountName: string;
  label?: string;
  currency: string;
  isDefault: boolean;
  status: 'active' | 'deleted';
  verifiedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserExternalBankAccountSchema = new Schema<IUserExternalBankAccountDoc>(
  {
    userId: { type: String, required: true, index: true },
    accountNumber: { type: String, required: true, trim: true },
    bankCode: { type: String, required: true, trim: true },
    bankName: { type: String, trim: true },
    accountName: { type: String, required: true, trim: true },
    label: { type: String, trim: true, maxlength: 80 },
    currency: { type: String, required: true, trim: true, uppercase: true, default: 'NGN' },
    isDefault: { type: Boolean, required: true, default: false },
    status: { type: String, enum: ['active', 'deleted'], required: true, default: 'active', index: true },
    verifiedAt: { type: Date, required: true }
  },
  { timestamps: true }
);

UserExternalBankAccountSchema.index(
  { userId: 1, accountNumber: 1, bankCode: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active' }
  }
);

UserExternalBankAccountSchema.index({ userId: 1, status: 1, isDefault: 1 });

export default mongoose.model<IUserExternalBankAccountDoc>(
  'UserExternalBankAccount',
  UserExternalBankAccountSchema
);
