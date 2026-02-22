import mongoose, { Schema, Document } from 'mongoose';
import { Transaction } from '../types/billingTypes';

export interface ITransactionDocument extends Omit<Transaction, 'id'>, Document { }

const TransactionSchema: Schema = new Schema({
    merchantId: { type: String, required: true },
    customerId: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: 'USD' },
    billingType: {
        type: String,
        enum: ['one-time', 'recurring'],
        required: true
    },
    type: {
        type: String,
        enum: ['payment', 'refund', 'payout', 'transfer'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'reversed'],
        default: 'pending'
    },
    description: { type: String },
    referenceId: { type: String }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function (_doc, ret: any) {
            if (ret._id) {
                ret.id = ret._id.toString();
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

export const TransactionModel = mongoose.model<ITransactionDocument>('Transaction', TransactionSchema);
