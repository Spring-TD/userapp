import mongoose, { Document, Schema } from 'mongoose';

export interface IAccount extends Document {
  userId: string;
  accountNumber: string;
  accountType: string;
  balance: number;
  currency: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  accountNumber: { type: String, required: true, unique: true },
  accountType: { type: String, required: true },
  balance: { type: Number, default: 0 },
  currency: { type: String, required: true },
  status: { type: String, default: 'active' },
}, {
  timestamps: true
});

// Add indexes
AccountSchema.index({ userId: 1 });
AccountSchema.index({ accountNumber: 1 });

export default mongoose.model<IAccount>('Account', AccountSchema);