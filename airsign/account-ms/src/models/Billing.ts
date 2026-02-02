import mongoose, { Schema, Document } from 'mongoose';

export enum BillingType {
    ONE_TIME = 'one-time',
    RECURRING = 'recurring'
}

// Invoice
export interface IInvoice extends Document {
    merchantId: string;
    customerId?: string;
    amount: number;
    currency: string;
    items: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }>;
    billingType: BillingType;
    status: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';
    dueDate?: Date;
    issuedDate: Date;
    paidDate?: Date;
    notes?: string;
}

const InvoiceSchema: Schema = new Schema({
    merchantId: { type: String, required: true },
    customerId: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    items: [{
        description: String,
        quantity: Number,
        unitPrice: Number,
        total: Number
    }],
    billingType: { type: String, enum: Object.values(BillingType), default: BillingType.ONE_TIME },
    status: { type: String, enum: ['draft', 'pending', 'paid', 'overdue', 'cancelled'], default: 'draft' },
    dueDate: Date,
    issuedDate: { type: Date, default: Date.now },
    paidDate: Date,
    notes: String
}, { timestamps: true });

export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema);

// Payment
export interface IPayment extends Document {
    invoiceId?: string;
    merchantId: string;
    customerId?: string;
    amount: number;
    currency: string;
    method: 'card' | 'bank_transfer' | 'paypal' | 'crypto';
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    transactionId?: string; // External transaction ID from gateway
}

const PaymentSchema: Schema = new Schema({
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    merchantId: { type: String, required: true },
    customerId: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    method: { type: String, enum: ['card', 'bank_transfer', 'paypal', 'crypto'], required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
    transactionId: String
}, { timestamps: true });

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);

// Subscription
export interface ISubscription extends Document {
    merchantId: string;
    customerId: string;
    planId: string;
    amount: number;
    currency: string;
    interval: 'day' | 'week' | 'month' | 'year';
    status: 'active' | 'paused' | 'cancelled' | 'expired';
    startDate: Date;
    nextBillingDate: Date;
}

const SubscriptionSchema: Schema = new Schema({
    merchantId: { type: String, required: true },
    customerId: { type: String, required: true },
    planId: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    interval: { type: String, enum: ['day', 'week', 'month', 'year'], default: 'month' },
    status: { type: String, enum: ['active', 'paused', 'cancelled', 'expired'], default: 'active' },
    startDate: { type: Date, default: Date.now },
    nextBillingDate: { type: Date }
}, { timestamps: true });

export const Subscription = mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
