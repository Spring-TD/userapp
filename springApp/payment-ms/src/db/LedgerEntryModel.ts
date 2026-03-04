import mongoose, { Document, Schema } from 'mongoose';
import {
  LedgerEntryType,
  TransactionStatus,
  TransactionType,
  FinancialCategory
} from '../types/record';

const BeneficiaryFiatInfoSchema = new Schema({
  beneficiary_fiat_ref: { type: String },
  bank_name: { type: String },
  bank_code: { type: String },
  account_number: { type: String },
  account_holder_name: { type: String },
  other_data: { type: Schema.Types.Mixed }
}, { _id: false });

const SenderInfoSchema = new Schema({
  full_name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true }
}, { _id: false });

const FeeBreakdownSchema = new Schema({
  payout_fee: { type: Number, required: true },
  merchant_commission: { type: Number, required: true },
  other_fee: [{
    name: { type: String },
    amount: { type: Number }
  }]
}, { _id: false });

export interface ILedgerEntryDoc extends Document {
  _id: mongoose.Types.ObjectId;
  ledgerEntryId: string;
  recordId: string;
  entryType: LedgerEntryType;
  transactionType: TransactionType;
  financialCategory: FinancialCategory;
  status: TransactionStatus;
  balance_bf: number;
  debit_amount_local: number;
  balance_after: number;
  transaction_timestamp: Date;
  txn_ref: string;
  session_id: string;
  third_party_ref_id?: string;
  transaction_description: string;
  from_currency: string;
  to_currency: string;
  beneficiary_info?: unknown;
  sender_info: unknown;
  fee_breakdown: unknown;
  createdAt: Date;
  updatedAt: Date;
}

const LedgerEntrySchema = new Schema<ILedgerEntryDoc>({
  ledgerEntryId: { type: String, required: true, unique: true, index: true },
  recordId: { type: String, required: true, index: true },
  entryType: { type: String, required: true, enum: Object.values(LedgerEntryType) },
  transactionType: { type: String, required: true, enum: Object.values(TransactionType) },
  financialCategory: { type: String, required: true, enum: Object.values(FinancialCategory) },
  status: { type: String, required: true, enum: Object.values(TransactionStatus) },
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
  beneficiary_info: { type: BeneficiaryFiatInfoSchema },
  sender_info: { type: SenderInfoSchema, required: true },
  fee_breakdown: { type: FeeBreakdownSchema, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

LedgerEntrySchema.index({ recordId: 1, createdAt: -1 });
LedgerEntrySchema.index({ recordId: 1, entryType: 1 });
LedgerEntrySchema.index({ recordId: 1, financialCategory: 1 });

export default mongoose.model<ILedgerEntryDoc>('LedgerEntry', LedgerEntrySchema);
