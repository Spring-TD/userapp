import mongoose, { Schema, Document } from 'mongoose';
import { OneTimeBilling } from '../types/billingTypes';

export interface IOneTimeBillingDocument extends OneTimeBilling, Document { }

const OneTimeBillingSchema: Schema = new Schema({
    amount: { type: Number, required: true },
    type: { type: String, required: true, default: 'one-time' },
    billingCycle: { type: String, default: '' },
    billTo: { type: String, required: true },
    billingFor: { type: String, required: true },
    billingTitle: { type: String, required: true }
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

export const OneTimeBillingModel = mongoose.model<IOneTimeBillingDocument>('OneTimeBilling', OneTimeBillingSchema);
