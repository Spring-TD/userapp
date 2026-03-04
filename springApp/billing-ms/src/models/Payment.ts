import mongoose, { Document, Schema } from 'mongoose';
import { BillingType } from '../types/billingTypes';

export interface IPayment extends Document {
  _id: mongoose.Types.ObjectId;
  invoiceId?: string;
  merchantId: string;
  customerId?: string;
  amount: number;
  currency: string;
  billingType: string;
  method: 'card' | 'bank_transfer' | 'paypal' | 'crypto';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  processedAt?: Date;
  refundedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>({
  invoiceId: { type: String, index: true },
  merchantId: { type: String, required: true, index: true },
  customerId: { type: String },
  amount: { type: Number, required: true },
  currency: { type: String, required: true, default: 'USD' },
  billingType: { type: String, required: true, enum: Object.values(BillingType) },
  method: { type: String, required: true, enum: ['card', 'bank_transfer', 'paypal', 'crypto'] },
  status: { type: String, required: true, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  transactionId: { type: String },
  processedAt: { type: Date },
  refundedAt: { type: Date }
}, { timestamps: true });

PaymentSchema.index({ merchantId: 1, createdAt: -1 });

export default mongoose.model<IPayment>('Payment', PaymentSchema);
