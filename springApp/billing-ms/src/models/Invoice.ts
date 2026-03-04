import mongoose, { Document, Schema } from 'mongoose';
import { BillingType } from '../types/billingTypes';

const InvoiceItemSchema = new Schema({
  id: { type: String, required: true },
  description: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  total: { type: Number, required: true }
}, { _id: false });

export interface IInvoice extends Document {
  _id: mongoose.Types.ObjectId;
  merchantId: string;
  customerId?: string;
  amount: number;
  currency: string;
  items: Array<{ id: string; description: string; quantity: number; unitPrice: number; total: number }>;
  billingType: string;
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';
  dueDate?: Date;
  issuedDate: Date;
  paidDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>({
  merchantId: { type: String, required: true, index: true },
  customerId: { type: String },
  amount: { type: Number, required: true },
  currency: { type: String, required: true, default: 'USD' },
  items: { type: [InvoiceItemSchema], default: [] },
  billingType: { type: String, required: true, enum: Object.values(BillingType) },
  status: { type: String, required: true, enum: ['draft', 'pending', 'paid', 'overdue', 'cancelled'], default: 'pending' },
  dueDate: { type: Date },
  issuedDate: { type: Date, required: true, default: Date.now },
  paidDate: { type: Date },
  notes: { type: String }
}, { timestamps: true });

InvoiceSchema.index({ merchantId: 1, createdAt: -1 });
InvoiceSchema.index({ status: 1 });

export default mongoose.model<IInvoice>('Invoice', InvoiceSchema);
