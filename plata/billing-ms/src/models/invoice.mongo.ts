import mongoose, { Schema, Document } from 'mongoose';
import { Invoice } from '../types/billingTypes';

export interface IInvoiceDocument extends Omit<Invoice, 'id'>, Document { }

const InvoiceSchema: Schema = new Schema({
    merchantId: { type: String, required: true },
    customerId: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: 'USD' },
    items: [{
        id: { type: String, required: true },
        description: { type: String, required: true },
        quantity: { type: Number, required: true },
        unitPrice: { type: Number, required: true },
        total: { type: Number, required: true }
    }],
    billingType: {
        type: String,
        enum: ['one-time', 'recurring'],
        required: true
    },
    status: {
        type: String,
        enum: ['draft', 'pending', 'paid', 'overdue', 'cancelled'],
        default: 'pending'
    },
    dueDate: { type: Date },
    issuedDate: { type: Date, required: true, default: Date.now },
    paidDate: { type: Date },
    notes: { type: String }
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

export const InvoiceModel = mongoose.model<IInvoiceDocument>('Invoice', InvoiceSchema);
