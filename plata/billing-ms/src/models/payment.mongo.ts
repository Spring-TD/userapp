import mongoose, { Schema, Document } from 'mongoose';
import { Payment } from '../types/billingTypes';

export interface IPaymentDocument extends Omit<Payment, 'id'>, Document { }

const PaymentSchema: Schema = new Schema({
    invoiceId: { type: String },
    merchantId: { type: String, required: true },
    customerId: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: 'USD' },
    billingType: {
        type: String,
        enum: ['one-time', 'recurring'],
        required: true
    },
    method: {
        type: String,
        enum: ['card', 'bank_transfer', 'paypal', 'crypto'],
        required: true,
        default: 'card'
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    transactionId: { type: String },
    processedAt: { type: Date },
    refundedAt: { type: Date }
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

export const PaymentModel = mongoose.model<IPaymentDocument>('Payment', PaymentSchema);
