import mongoose, { Document, Schema } from 'mongoose';
import { BillingType } from '../types/billingTypes';

export interface ITransaction extends Document {
  _id: mongoose.Types.ObjectId;
  merchantId: string;
  customerId?: string;
  amount: number;
  currency: string;
  billingType: string;
  type: 'payment' | 'refund' | 'payout' | 'transfer';
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  description?: string;
  referenceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>({
  merchantId: { type: String, required: true, index: true },
  customerId: { type: String },
  amount: { type: Number, required: true },
  currency: { type: String, required: true, default: 'USD' },
  billingType: { type: String, required: true, enum: Object.values(BillingType) },
  type: { type: String, required: true, enum: ['payment', 'refund', 'payout', 'transfer'] },
  status: { type: String, required: true, enum: ['pending', 'completed', 'failed', 'reversed'], default: 'pending' },
  description: { type: String },
  referenceId: { type: String, index: true }
}, { timestamps: true });

TransactionSchema.index({ merchantId: 1, createdAt: -1 });

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
