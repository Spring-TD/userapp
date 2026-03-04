import mongoose from 'mongoose';
import MerchantRecordModel from './MerchantRecordModel';
import MerchantUserRecordModel from './MerchantUserRecordModel';
import LedgerEntryModel from './LedgerEntryModel';
import PaymentModel from './PaymentModel';
import {
  MerchantRecord,
  MerchantUserRecord,
  LedgerEntry,
  LedgerQueryParams,
  LedgerSummary,
  RecordType,
  TransactionStatus,
  LedgerSortField,
  SortOrder
} from '../types/record';
import { Payment } from '../types/payment';

type RecordDoc = mongoose.Document & Record<string, unknown>;
type RecordUnion = MerchantRecord | MerchantUserRecord;

function docToMerchantRecord(doc: RecordDoc | null): MerchantRecord | null {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc as Record<string, unknown>;
  const { _id, __v, ...rest } = o as Record<string, unknown> & { _id: mongoose.Types.ObjectId };
  return rest as unknown as MerchantRecord;
}

function docToMerchantUserRecord(doc: RecordDoc | null): MerchantUserRecord | null {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc as Record<string, unknown>;
  const { _id, __v, ...rest } = o as Record<string, unknown> & { _id: mongoose.Types.ObjectId };
  return rest as unknown as MerchantUserRecord;
}

function docToLedgerEntry(doc: RecordDoc | null): LedgerEntry | null {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc as Record<string, unknown>;
  const { _id, __v, ...rest } = o as Record<string, unknown> & { _id: mongoose.Types.ObjectId };
  return rest as unknown as LedgerEntry;
}

function docToPayment(doc: RecordDoc | null): Payment | null {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc as Record<string, unknown>;
  const { _id, __v, ...rest } = o as Record<string, unknown> & { _id: mongoose.Types.ObjectId };
  return rest as unknown as Payment;
}

/**
 * Database layer using MongoDB via Mongoose.
 * Replaces in-memory recordStorage for production (Digital Ocean MongoDB).
 */
export const db = {
  // --- Merchant records ---
  async createMerchantRecord(record: MerchantRecord): Promise<MerchantRecord> {
    const doc = await MerchantRecordModel.create(record);
    return docToMerchantRecord(doc)!;
  },

  async createMerchantUserRecord(record: MerchantUserRecord): Promise<MerchantUserRecord> {
    const doc = await MerchantUserRecordModel.create(record);
    return docToMerchantUserRecord(doc)!;
  },

  async findRecordById(recordId: string): Promise<RecordUnion | null> {
    let doc = await MerchantRecordModel.findOne({ recordId });
    if (doc) return docToMerchantRecord(doc);
    doc = await MerchantUserRecordModel.findOne({ recordId }) as RecordDoc | null;
    if (doc) return docToMerchantUserRecord(doc);
    return null;
  },

  async findRecordByUserId(userId: string): Promise<RecordUnion | null> {
    let doc = await MerchantRecordModel.findOne({ userId });
    if (doc) return docToMerchantRecord(doc);
    doc = await MerchantUserRecordModel.findOne({ userId }) as RecordDoc | null;
    if (doc) return docToMerchantUserRecord(doc);
    return null;
  },

  async findRecordByEmail(email: string): Promise<RecordUnion | null> {
    const norm = email.toLowerCase();
    let doc = await MerchantRecordModel.findOne({ email: norm });
    if (doc) return docToMerchantRecord(doc);
    doc = await MerchantUserRecordModel.findOne({ email: norm }) as RecordDoc | null;
    if (doc) return docToMerchantUserRecord(doc);
    return null;
  },

  async updateMerchantRecord(recordId: string, updates: Partial<MerchantRecord>): Promise<MerchantRecord | null> {
    const { recordId: _r, ...safe } = updates as Partial<MerchantRecord> & { recordId?: string };
    const doc = await MerchantRecordModel.findOneAndUpdate(
      { recordId },
      { $set: { ...safe, updatedAt: new Date() } },
      { new: true }
    );
    return docToMerchantRecord(doc);
  },

  async updateMerchantUserRecord(recordId: string, updates: Partial<MerchantUserRecord>): Promise<MerchantUserRecord | null> {
    const { recordId: _r, ...safe } = updates as Partial<MerchantUserRecord> & { recordId?: string };
    const doc = await MerchantUserRecordModel.findOneAndUpdate(
      { recordId },
      { $set: { ...safe, updatedAt: new Date() } },
      { new: true }
    );
    return docToMerchantUserRecord(doc);
  },

  // --- Ledger entries ---
  async addLedgerEntry(entry: LedgerEntry): Promise<LedgerEntry> {
    const doc = await LedgerEntryModel.create(entry);
    return docToLedgerEntry(doc)!;
  },

  async getLedgerEntries(query: LedgerQueryParams): Promise<LedgerEntry[]> {
    const filter: Record<string, unknown> = { recordId: query.recordId };
    if (query.entryType) filter.entryType = query.entryType;
    if (query.financialCategory) filter.financialCategory = query.financialCategory;
    if (query.transactionType) filter.transactionType = query.transactionType;
    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) (filter.createdAt as Record<string, Date>).$gte = query.startDate;
      if (query.endDate) (filter.createdAt as Record<string, Date>).$lte = query.endDate;
    }
    if (query.minAmount !== undefined || query.maxAmount !== undefined) {
      filter.debit_amount_local = {};
      if (query.minAmount !== undefined) (filter.debit_amount_local as Record<string, number>).$gte = query.minAmount;
      if (query.maxAmount !== undefined) (filter.debit_amount_local as Record<string, number>).$lte = query.maxAmount;
    }

    let q = LedgerEntryModel.find(filter);
    const sortField = query.sortBy || LedgerSortField.DATE;
    const sortOrder = query.sortOrder || SortOrder.DESC;
    const sortDir = sortOrder === SortOrder.ASC ? 1 : -1;
    const sortKey = sortField === LedgerSortField.DATE ? 'createdAt'
      : sortField === LedgerSortField.AMOUNT ? 'debit_amount_local'
      : sortField === LedgerSortField.BALANCE ? 'balance_after'
      : sortField === LedgerSortField.TRANSACTION_TYPE ? 'transactionType'
      : sortField === LedgerSortField.FINANCIAL_CATEGORY ? 'financialCategory'
      : sortField === LedgerSortField.ENTRY_TYPE ? 'entryType'
      : 'createdAt';
    q = q.sort({ [sortKey]: sortDir });
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 100;
    q = q.skip(offset).limit(limit);
    const docs = await q.lean().exec();
    return docs.map((d: Record<string, unknown>) => {
      const { _id, __v, ...rest } = d;
      return rest as unknown as LedgerEntry;
    });
  },

  async getLedgerSummary(recordId: string): Promise<LedgerSummary | null> {
    const record = await this.findRecordById(recordId);
    if (!record) return null;
    const entries = await LedgerEntryModel.find({ recordId, status: TransactionStatus.COMPLETED })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    const lastTx = entries[0] as { createdAt?: Date } | undefined;
    return {
      recordId,
      currentBalance: record.currentBalance,
      totalDebits: record.totalDebits,
      totalCredits: record.totalCredits,
      currency: record.currency,
      lastTransactionAt: lastTx?.createdAt,
      transactionCount: entries.length
    };
  },

  async getAllMerchantRecords(): Promise<MerchantRecord[]> {
    const docs = await MerchantRecordModel.find({}).lean().exec();
    return docs.map((d: Record<string, unknown>) => {
      const { _id, __v, ...rest } = d;
      return rest as unknown as MerchantRecord;
    });
  },

  async getMerchantUsersByMerchantId(userMerchantId: string): Promise<MerchantUserRecord[]> {
    const docs = await MerchantUserRecordModel.find({ userMerchantId }).lean().exec();
    return docs.map((d: Record<string, unknown>) => {
      const { _id, __v, ...rest } = d;
      return rest as unknown as MerchantUserRecord;
    });
  },

  // --- Payments ---
  async createPayment(payment: Payment): Promise<Payment> {
    const doc = await PaymentModel.create(payment);
    return docToPayment(doc)!;
  },

  async findPaymentById(paymentId: string): Promise<Payment | null> {
    const doc = await PaymentModel.findOne({ paymentId });
    return docToPayment(doc);
  },

  async updatePayment(paymentId: string, updates: Partial<Payment>): Promise<Payment | null> {
    const doc = await PaymentModel.findOneAndUpdate(
      { paymentId },
      { $set: { ...updates, updatedAt: new Date() } },
      { new: true }
    );
    return docToPayment(doc);
  },

  /** Clear all collections (for tests only) */
  async clearAll(): Promise<void> {
    await Promise.all([
      MerchantRecordModel.deleteMany({}),
      MerchantUserRecordModel.deleteMany({}),
      LedgerEntryModel.deleteMany({}),
      PaymentModel.deleteMany({})
    ]);
  }
};
