import mongoose, { Schema, Document, Model } from 'mongoose';
import { Transaction, TransactionType, TransactionStatus } from './Wallet';

export interface ITransactionDocument extends Omit<Transaction, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const TransactionSchema = new Schema<ITransactionDocument>(
  {
    walletId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: Object.values(TransactionType), required: true },
    status: { type: String, enum: Object.values(TransactionStatus), default: TransactionStatus.PENDING },
    description: { type: String, required: true },
    referenceId: { type: String },
    balanceBefore: { type: Number },
    balanceAfter: { type: Number },
    category: { type: String },
    source: { type: String },
    metadata: { type: Schema.Types.Mixed },
    tags: [{ type: String }],
    externalReference: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = ret._id?.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

TransactionSchema.index({ walletId: 1, createdAt: -1 });

export const TransactionModel: Model<ITransactionDocument> =
  mongoose.models.Transaction ?? mongoose.model<ITransactionDocument>('Transaction', TransactionSchema);

export function toTransaction(doc: ITransactionDocument): Transaction {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  return {
    id: (obj._id ?? doc._id).toString(),
    walletId: obj.walletId,
    amount: obj.amount,
    type: obj.type as TransactionType,
    status: obj.status as TransactionStatus,
    description: obj.description,
    referenceId: obj.referenceId,
    balanceBefore: obj.balanceBefore,
    balanceAfter: obj.balanceAfter,
    category: obj.category,
    source: obj.source,
    metadata: obj.metadata,
    tags: obj.tags,
    externalReference: obj.externalReference,
    ipAddress: obj.ipAddress,
    userAgent: obj.userAgent,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt
  };
}
