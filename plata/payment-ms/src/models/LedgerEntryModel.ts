import mongoose, { Schema, Document, Model } from 'mongoose';
import {
  LedgerEntry,
  LedgerEntryType,
  TransactionType,
  TransactionStatus,
  FinancialCategory
} from '../types/record';

export interface ILedgerEntryDocument extends Omit<LedgerEntry, 'ledgerEntryId'>, Document {
  ledgerEntryId: string;
  _id: mongoose.Types.ObjectId;
}

const LedgerEntrySchema = new Schema<ILedgerEntryDocument>(
  {
    ledgerEntryId: { type: String, required: true },
    recordId: { type: String, required: true, index: true },
    entryType: { type: String, enum: Object.values(LedgerEntryType), required: true },
    transactionType: { type: String, enum: Object.values(TransactionType), required: true },
    financialCategory: { type: String, enum: Object.values(FinancialCategory), required: true },
    status: { type: String, enum: Object.values(TransactionStatus), required: true },
    balance_bf: { type: Number, required: true },
    debit_amount_local: { type: Number, required: true },
    balance_after: { type: Number, required: true },
    transaction_timestamp: { type: Date, required: true },
    txn_ref: { type: String, required: true },
    session_id: { type: String, required: true },
    third_party_ref_id: { type: String },
    transaction_description: { type: String, required: true },
    from_currency: { type: String, required: true },
    to_currency: { type: String, required: true },
    beneficiary_info: { type: Schema.Types.Mixed },
    sender_info: { type: Schema.Types.Mixed, required: true },
    fee_breakdown: { type: Schema.Types.Mixed, required: true }
  },
  { timestamps: true }
);

LedgerEntrySchema.index({ recordId: 1, createdAt: -1 });

export const LedgerEntryModel: Model<ILedgerEntryDocument> =
  mongoose.models.LedgerEntry ?? mongoose.model<ILedgerEntryDocument>('LedgerEntry', LedgerEntrySchema);
