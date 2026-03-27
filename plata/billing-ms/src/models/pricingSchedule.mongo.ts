import mongoose, { Schema, Document } from 'mongoose';
import { PricingSchedule } from '../services/pricingService';

export interface IPricingScheduleDocument extends Omit<PricingSchedule, 'id'>, Document { }

const BillingExceptionSchema = new Schema({
    exceptionType: { type: String, default: 'Counts' },
    action: { type: String, default: 'Suspend' },
    maxExceptionCount: { type: Number, required: true },
    currentExceptionCount: { type: Number, default: 0 }
}, { _id: false });

const PricingConditionsSchema = new Schema({
    billingTarget: { type: Number },
    maxOccurrences: { type: Number },
    billToType: { type: String, enum: ['merchant', 'user'], required: true },
    billToIds: [{ type: String }],
    userGroup: { type: String },
    minimumBalance: { type: Number },
    maximumBalance: { type: Number },
    validDays: [{ type: Number }],
    validHours: {
        start: { type: Number },
        end: { type: Number }
    },
    maxRetries: { type: Number },
    retryInterval: { type: Number },
    billingException: BillingExceptionSchema
}, { _id: false });

const PricingTriggerSchema = new Schema({
    type: {
        type: String,
        enum: ['perProduct', 'walletFunding', 'merchantUsersCount', 'generic'],
        required: true
    },
    walletTypes: [{ type: String, enum: ['user', 'merchant'] }],
    minimumAmount: { type: Number },
    userCountThreshold: { type: Number },
    triggerPerUser: { type: Boolean }
}, { _id: false });

const PricingScheduleSchema: Schema = new Schema({
    productId: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, required: true, default: 'recurring' },
    billingCycle: { type: Number, required: true, default: 30 },
    billingTarget: { type: Number },
    billingCount: { type: Number, required: true, default: 1 },
    billToType: { type: String, enum: ['merchant', 'user'], required: true },
    billToIds: [{ type: String }],
    billingFor: { type: String, required: true },
    billingTitle: { type: String, required: true },
    billingException: BillingExceptionSchema,
    description: { type: String, required: true },
    startDate: { type: Date, required: true, default: Date.now },
    endDate: { type: Date },
    nextBillingDate: { type: Date, required: true },
    status: {
        type: String,
        enum: ['active', 'paused', 'cancelled'],
        default: 'active'
    },
    conditions: PricingConditionsSchema,
    trigger: PricingTriggerSchema,
    totalBilled: { type: Number, default: 0 },
    lastError: { type: String },
    retryCount: { type: Number, default: 0 }
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

export const PricingScheduleModel = mongoose.model<IPricingScheduleDocument>('PricingSchedule', PricingScheduleSchema);
