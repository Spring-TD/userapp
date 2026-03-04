import mongoose, { Document, Schema } from 'mongoose';
import { BillingType } from '../types/billingTypes';

const BillingExceptionSchema = new Schema({
  maxAttempts: { type: Number, required: true, default: 3 },
  currentAttempts: { type: Number, required: true, default: 0 }
}, { _id: false });

export interface IRecurringBilling extends Document {
  _id: mongoose.Types.ObjectId;
  amount: number;
  billingType: string;
  billingCycle: number;
  billingTarget?: number;
  billingCount: number;
  billTo: string;
  billingFor: string;
  billingTitle: string;
  billingException?: { maxAttempts: number; currentAttempts: number };
  status: 'active' | 'paused' | 'completed' | 'suspended' | 'cancelled';
  startDate: Date;
  nextBillingDate?: Date;
  endDate?: Date;
  totalBilled?: number;
  createdAt: Date;
  updatedAt: Date;
}

const RecurringBillingSchema = new Schema<IRecurringBilling>({
  amount: { type: Number, required: true },
  billingType: { type: String, required: true, enum: Object.values(BillingType), default: BillingType.RECURRING },
  billingCycle: { type: Number, required: true, default: 30 },
  billingTarget: { type: Number },
  billingCount: { type: Number, required: true, default: 0 },
  billTo: { type: String, required: true, index: true },
  billingFor: { type: String, required: true },
  billingTitle: { type: String, required: true },
  billingException: { type: BillingExceptionSchema, default: () => ({ maxAttempts: 3, currentAttempts: 0 }) },
  status: { type: String, required: true, enum: ['active', 'paused', 'completed', 'suspended', 'cancelled'], default: 'active' },
  startDate: { type: Date, required: true, default: Date.now },
  nextBillingDate: { type: Date },
  endDate: { type: Date },
  totalBilled: { type: Number, default: 0 }
}, { timestamps: true });

RecurringBillingSchema.index({ status: 1, nextBillingDate: 1 });

export default mongoose.model<IRecurringBilling>('RecurringBilling', RecurringBillingSchema);
