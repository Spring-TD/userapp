import mongoose, { Schema, Document } from 'mongoose';
import { Subscription } from '../types/billingTypes';

export interface ISubscriptionDocument extends Omit<Subscription, 'id'>, Document { }

const SubscriptionSchema: Schema = new Schema({
    merchantId: { type: String, required: true },
    customerId: { type: String, required: true },
    planId: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: 'USD' },
    billingType: {
        type: String,
        enum: ['one-time', 'recurring'],
        required: true,
        default: 'recurring'
    },
    interval: {
        type: String,
        enum: ['day', 'week', 'month', 'year'],
        required: true,
        default: 'month'
    },
    intervalCount: { type: Number, required: true, default: 1 },
    status: {
        type: String,
        enum: ['active', 'paused', 'cancelled', 'expired'],
        default: 'active'
    },
    startDate: { type: Date, required: true, default: Date.now },
    endDate: { type: Date },
    nextBillingDate: { type: Date },
    trialEnd: { type: Date }
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

export const SubscriptionModel = mongoose.model<ISubscriptionDocument>('Subscription', SubscriptionSchema);
