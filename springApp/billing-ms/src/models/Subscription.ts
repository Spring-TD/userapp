import mongoose, { Document, Schema } from 'mongoose';
import { BillingType } from '../types/billingTypes';

export interface ISubscription extends Document {
  _id: mongoose.Types.ObjectId;
  merchantId: string;
  customerId: string;
  planId: string;
  amount: number;
  currency: string;
  billingType: string;
  interval: 'day' | 'week' | 'month' | 'year';
  intervalCount: number;
  status: 'active' | 'paused' | 'cancelled' | 'expired';
  startDate: Date;
  endDate?: Date;
  nextBillingDate?: Date;
  trialEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>({
  merchantId: { type: String, required: true, index: true },
  customerId: { type: String, required: true, index: true },
  planId: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true, default: 'USD' },
  billingType: { type: String, required: true, enum: Object.values(BillingType) },
  interval: { type: String, required: true, enum: ['day', 'week', 'month', 'year'] },
  intervalCount: { type: Number, required: true, default: 1 },
  status: { type: String, required: true, enum: ['active', 'paused', 'cancelled', 'expired'], default: 'active' },
  startDate: { type: Date, required: true, default: Date.now },
  endDate: { type: Date },
  nextBillingDate: { type: Date },
  trialEnd: { type: Date }
}, { timestamps: true });

SubscriptionSchema.index({ merchantId: 1, customerId: 1 });

export default mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
