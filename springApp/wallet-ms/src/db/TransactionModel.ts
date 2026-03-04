import mongoose, { Document, Schema } from 'mongoose';
import { TransactionType, TransactionStatus } from '../models/Wallet';

export interface ITransactionDoc extends Document {
  _id: mongoose.Types.ObjectId;
  walletId: string;
  amount: number;
  type: string;
  status: string;
  description: string;
  referenceId?: string;
  balanceBefore?: number;
  balanceAfter?: number;
  category?: string;
  source?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  externalReference?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransactionDoc>(
  {
    walletId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    type: { type: String, required: true, enum: Object.values(TransactionType) },
    status: { type: String, required: true, enum: Object.values(TransactionStatus), default: TransactionStatus.PENDING },
    description: { type: String, required: true },
    referenceId: { type: String },
    balanceBefore: { type: Number },
    balanceAfter: { type: Number },
    category: { type: String },
    source: { type: String },
    metadata: { type: Schema.Types.Mixed },
    tags: [String],
    externalReference: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String }
  },
  { timestamps: true }
);

TransactionSchema.index({ walletId: 1, createdAt: -1 });

export default mongoose.model<ITransactionDoc>('Transaction', TransactionSchema);
