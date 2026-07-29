import mongoose, { Schema, Document } from 'mongoose';
import { Transaction } from '../types/app';

interface ITransactionDocument extends Omit<Transaction, 'id'>, Document { }

const TransactionSchema = new Schema<ITransactionDocument>({
    appId: { type: String, required: true, index: true },
    productId: { type: String, required: false, index: true },
    userId: { type: String, required: false, index: true },
    walletId: { type: String, required: false, index: true },
    reference: { type: String, required: false, index: true },
    metaRef: { type: String, required: false, index: true },
    provider: { type: String, required: false, index: true },
    providerReference: { type: String, required: false, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'cancelled'],
        default: 'pending'
    },
    description: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, required: false },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() }
}, {
    timestamps: false,
    toJSON: {
        virtuals: true,
        transform: function (doc, ret: any) {
            if (ret._id) {
                ret.id = ret._id;
                delete ret._id;
            }
            if (ret.__v !== undefined) {
                delete ret.__v;
            }
        }
    },
    toObject: {
        virtuals: true
    }
});

TransactionSchema.index(
    { appId: 1, provider: 1, providerReference: 1 },
    {
        unique: true,
        partialFilterExpression: {
            provider: { $exists: true },
            providerReference: { $exists: true }
        }
    }
);

TransactionSchema.pre<ITransactionDocument>('save', function () {
    this.updatedAt = new Date().toISOString();
    if (this.isNew && !this.createdAt) {
        this.createdAt = new Date().toISOString();
    }
});

export const TransactionMongoModel = mongoose.model<ITransactionDocument>('Transaction', TransactionSchema);
