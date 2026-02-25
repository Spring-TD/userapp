import {
  MerchantRecord,
  MerchantUserRecord,
  RecordType,
  LedgerEntry,
  LedgerEntryType,
  TransactionStatus,
  LedgerQueryParams,
  LedgerSummary,
  LedgerSortField,
  SortOrder
} from '../types/record';
import { MerchantRecordModel } from './MerchantRecordModel';
import { MerchantUserRecordModel } from './MerchantUserRecordModel';
import { LedgerEntryModel } from './LedgerEntryModel';

function docToMerchantRecord(doc: any): MerchantRecord {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    recordId: o.recordId,
    recordType: RecordType.MERCHANT,
    userId: o.userId,
    email: o.email,
    firstName: o.firstName,
    lastName: o.lastName,
    userMerchantId: o.userMerchantId,
    country: o.country,
    phone: o.phone,
    currentBalance: o.currentBalance ?? 0,
    currency: o.currency,
    totalDebits: o.totalDebits ?? 0,
    totalCredits: o.totalCredits ?? 0,
    isActive: o.isActive ?? true,
    verifiedAt: o.verifiedAt,
    metadata: o.metadata,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt
  };
}

function docToMerchantUserRecord(doc: any): MerchantUserRecord {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    recordId: o.recordId,
    recordType: RecordType.MERCHANT_USER,
    userId: o.userId,
    email: o.email,
    firstName: o.firstName,
    lastName: o.lastName,
    userMerchantId: o.userMerchantId,
    country: o.country,
    phone: o.phone,
    currentBalance: o.currentBalance ?? 0,
    currency: o.currency,
    totalDebits: o.totalDebits ?? 0,
    totalCredits: o.totalCredits ?? 0,
    isActive: o.isActive ?? true,
    verifiedAt: o.verifiedAt,
    metadata: o.metadata,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt
  };
}

function docToLedgerEntry(doc: any): LedgerEntry {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    ledgerEntryId: o.ledgerEntryId ?? o._id?.toString(),
    recordId: o.recordId,
    entryType: o.entryType as LedgerEntryType,
    transactionType: o.transactionType as any,
    financialCategory: o.financialCategory as any,
    status: o.status as TransactionStatus,
    balance_bf: o.balance_bf,
    debit_amount_local: o.debit_amount_local,
    balance_after: o.balance_after,
    transaction_timestamp: o.transaction_timestamp,
    txn_ref: o.txn_ref,
    session_id: o.session_id,
    third_party_ref_id: o.third_party_ref_id,
    transaction_description: o.transaction_description,
    from_currency: o.from_currency,
    to_currency: o.to_currency,
    beneficiary_info: o.beneficiary_info,
    sender_info: o.sender_info,
    fee_breakdown: o.fee_breakdown,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt
  };
}

export const recordStorageMongo = {
  async createMerchantRecord(record: MerchantRecord): Promise<MerchantRecord> {
    await MerchantRecordModel.create(record);
    return record;
  },

  async createMerchantUserRecord(record: MerchantUserRecord): Promise<MerchantUserRecord> {
    await MerchantUserRecordModel.create(record);
    return record;
  },

  async findRecordById(recordId: string): Promise<MerchantRecord | MerchantUserRecord | null> {
    const merchant = await MerchantRecordModel.findOne({ recordId }).lean();
    if (merchant) return docToMerchantRecord(merchant);
    const user = await MerchantUserRecordModel.findOne({ recordId }).lean();
    if (user) return docToMerchantUserRecord(user);
    return null;
  },

  async findRecordByUserId(userId: string): Promise<MerchantRecord | MerchantUserRecord | null> {
    const merchant = await MerchantRecordModel.findOne({ userId }).lean();
    if (merchant) return docToMerchantRecord(merchant);
    const user = await MerchantUserRecordModel.findOne({ userId }).lean();
    if (user) return docToMerchantUserRecord(user);
    return null;
  },

  async findRecordByEmail(email: string): Promise<MerchantRecord | MerchantUserRecord | null> {
    const lower = email.toLowerCase();
    const merchant = await MerchantRecordModel.findOne({ email: lower }).lean();
    if (merchant) return docToMerchantRecord(merchant);
    const user = await MerchantUserRecordModel.findOne({ email: lower }).lean();
    if (user) return docToMerchantUserRecord(user);
    return null;
  },

  async updateMerchantRecord(recordId: string, updates: Partial<MerchantRecord>): Promise<MerchantRecord | null> {
    const doc = await MerchantRecordModel.findOneAndUpdate(
      { recordId },
      { $set: { ...updates, updatedAt: new Date() } },
      { new: true }
    ).lean();
    return doc ? docToMerchantRecord(doc) : null;
  },

  async updateMerchantUserRecord(recordId: string, updates: Partial<MerchantUserRecord>): Promise<MerchantUserRecord | null> {
    const doc = await MerchantUserRecordModel.findOneAndUpdate(
      { recordId },
      { $set: { ...updates, updatedAt: new Date() } },
      { new: true }
    ).lean();
    return doc ? docToMerchantUserRecord(doc) : null;
  },

  async addLedgerEntry(entry: LedgerEntry): Promise<LedgerEntry> {
    const doc = await LedgerEntryModel.create(entry);
    return docToLedgerEntry(doc);
  },

  async getLedgerEntries(query: LedgerQueryParams): Promise<LedgerEntry[]> {
    const filter: Record<string, unknown> = { recordId: query.recordId };
    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) (filter.createdAt as Record<string, Date>).$gte = query.startDate;
      if (query.endDate) (filter.createdAt as Record<string, Date>).$lte = query.endDate;
    }
    if (query.entryType) filter.entryType = query.entryType;
    if (query.financialCategory) filter.financialCategory = query.financialCategory;
    if (query.transactionType) filter.transactionType = query.transactionType;
    if (query.minAmount !== undefined || query.maxAmount !== undefined) {
      filter.debit_amount_local = {};
      if (query.minAmount !== undefined) (filter.debit_amount_local as Record<string, number>).$gte = query.minAmount;
      if (query.maxAmount !== undefined) (filter.debit_amount_local as Record<string, number>).$lte = query.maxAmount;
    }
    const sortField = query.sortBy === LedgerSortField.DATE ? 'createdAt' : query.sortBy === LedgerSortField.AMOUNT ? 'debit_amount_local' : 'createdAt';
    const sortOrder = query.sortOrder === SortOrder.ASC ? 1 : -1;
    const docs = await LedgerEntryModel.find(filter)
      .sort({ [sortField]: sortOrder })
      .skip(query.offset ?? 0)
      .limit(query.limit ?? 100)
      .lean();
    return docs.map((d) => docToLedgerEntry(d));
  },

  async getLedgerSummary(recordId: string): Promise<LedgerSummary | null> {
    const record = await this.findRecordById(recordId);
    if (!record) return null;
    const completed = await LedgerEntryModel.find({ recordId, status: TransactionStatus.COMPLETED })
      .sort({ createdAt: -1 })
      .limit(1)
      .lean();
    return {
      recordId,
      currentBalance: record.currentBalance,
      totalDebits: record.totalDebits,
      totalCredits: record.totalCredits,
      currency: record.currency,
      lastTransactionAt: completed[0]?.createdAt,
      transactionCount: await LedgerEntryModel.countDocuments({ recordId, status: TransactionStatus.COMPLETED })
    };
  },

  async getAllMerchantRecords(): Promise<MerchantRecord[]> {
    const docs = await MerchantRecordModel.find({}).lean();
    return docs.map(docToMerchantRecord);
  },

  async getAllMerchantUserRecords(): Promise<MerchantUserRecord[]> {
    const docs = await MerchantUserRecordModel.find({}).lean();
    return docs.map(docToMerchantUserRecord);
  },

  async getMerchantUsersByMerchantId(userMerchantId: string): Promise<MerchantUserRecord[]> {
    const docs = await MerchantUserRecordModel.find({ userMerchantId }).lean();
    return docs.map(docToMerchantUserRecord);
  },

  async clear(): Promise<void> {
    await Promise.all([
      MerchantRecordModel.deleteMany({}),
      MerchantUserRecordModel.deleteMany({}),
      LedgerEntryModel.deleteMany({})
    ]);
  },

  async getStats(): Promise<{ merchantRecords: number; merchantUserRecords: number; totalRecords: number; totalLedgerEntries: number }> {
    const [merchantRecords, merchantUserRecords, totalLedgerEntries] = await Promise.all([
      MerchantRecordModel.countDocuments(),
      MerchantUserRecordModel.countDocuments(),
      LedgerEntryModel.countDocuments()
    ]);
    return { merchantRecords, merchantUserRecords, totalRecords: merchantRecords + merchantUserRecords, totalLedgerEntries };
  }
};
