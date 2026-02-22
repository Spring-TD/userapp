import mongoose, { Schema, Document } from 'mongoose';
import { RecurringBilling } from '../types/billingTypes';

export interface IRecurringBillingDocument extends Omit<RecurringBilling, 'id'>, Document { }

const RecurringBillingSchema: Schema = new Schema({
    amount: { type: Number, required: true },
    billingType: {
        type: String,
        enum: ['one-time', 'recurring'],
        required: true,
        default: 'recurring'
    },
    billingCycle: { type: Number, required: true, default: 30 },
    billingTarget: { type: Number },
    billingCount: { type: Number, required: true, default: 0 },
    billTo: { type: String, required: true },
    billingFor: { type: String, required: true },
    billingTitle: { type: String, required: true },
    billingException: {
        maxAttempts: { type: Number, default: 3 },
        currentAttempts: { type: Number, default: 0 }
    },
    status: {
        type: String,
        enum: ['active', 'paused', 'completed', 'suspended', 'cancelled'],
        default: 'active'
    },
    startDate: { type: Date, required: true, default: Date.now },
    nextBillingDate: { type: Date },
    endDate: { type: Date },
    totalBilled: { type: Number, default: 0 }
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

export const RecurringBillingModel = mongoose.model<IRecurringBillingDocument>('RecurringBilling', RecurringBillingSchema);
