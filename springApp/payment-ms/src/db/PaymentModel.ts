import mongoose, { Document, Schema } from 'mongoose';
import { PaymentMethod, PaymentStatus } from '../types/payment';

export interface IPaymentDoc extends Document {
  _id: mongoose.Types.ObjectId;
  paymentId: string;
  userId: string;
  merchantId?: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  gatewayResponse?: unknown;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPaymentDoc>({
  paymentId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  merchantId: { type: String, index: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  method: { type: String, required: true, enum: Object.values(PaymentMethod) },
  status: { type: String, required: true, enum: Object.values(PaymentStatus) },
  transactionId: { type: String },
  gatewayResponse: { type: Schema.Types.Mixed },
  metadata: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

PaymentSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IPaymentDoc>('Payment', PaymentSchema);
