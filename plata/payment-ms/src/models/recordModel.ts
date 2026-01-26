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

/**
 * In-memory storage for merchant records and ledger entries
 * In production, this should be replaced with actual database implementation
 */
class RecordStorage {
  private merchantRecords: Map<string, MerchantRecord> = new Map();
  private merchantUserRecords: Map<string, MerchantUserRecord> = new Map();
  private ledgerEntries: Map<string, LedgerEntry[]> = new Map(); // recordId -> entries[]
  private userIdToRecordId: Map<string, string> = new Map(); // userId -> recordId mapping

  /**
   * Create a merchant record
   */
  createMerchantRecord(record: MerchantRecord): MerchantRecord {
    this.merchantRecords.set(record.recordId, record);
    this.userIdToRecordId.set(record.userId, record.recordId);
    // Initialize empty ledger for this record
    this.ledgerEntries.set(record.recordId, []);
    return record;
  }

  /**
   * Create a merchant-user record
   */
  createMerchantUserRecord(record: MerchantUserRecord): MerchantUserRecord {
    this.merchantUserRecords.set(record.recordId, record);
    this.userIdToRecordId.set(record.userId, record.recordId);
    // Initialize empty ledger for this record
    this.ledgerEntries.set(record.recordId, []);
    return record;
  }

  /**
   * Find record by ID
   */
  findRecordById(recordId: string): MerchantRecord | MerchantUserRecord | null {
    const merchantRecord = this.merchantRecords.get(recordId);
    if (merchantRecord) return merchantRecord;

    const merchantUserRecord = this.merchantUserRecords.get(recordId);
    if (merchantUserRecord) return merchantUserRecord;

    return null;
  }

  /**
   * Find record by user ID
   */
  findRecordByUserId(userId: string): MerchantRecord | MerchantUserRecord | null {
    const recordId = this.userIdToRecordId.get(userId);
    if (!recordId) return null;
    return this.findRecordById(recordId);
  }

  /**
   * Find record by email
   */
  findRecordByEmail(email: string): MerchantRecord | MerchantUserRecord | null {
    // Check merchant records
    for (const record of this.merchantRecords.values()) {
      if (record.email.toLowerCase() === email.toLowerCase()) {
        return record;
      }
    }

    // Check merchant-user records
    for (const record of this.merchantUserRecords.values()) {
      if (record.email.toLowerCase() === email.toLowerCase()) {
        return record;
      }
    }

    return null;
  }

  /**
   * Update merchant record
   */
  updateMerchantRecord(recordId: string, updates: Partial<MerchantRecord>): MerchantRecord | null {
    const record = this.merchantRecords.get(recordId);
    if (!record) return null;

    const updatedRecord = {
      ...record,
      ...updates,
      updatedAt: new Date()
    };

    this.merchantRecords.set(recordId, updatedRecord);
    return updatedRecord;
  }

  /**
   * Update merchant-user record
   */
  updateMerchantUserRecord(recordId: string, updates: Partial<MerchantUserRecord>): MerchantUserRecord | null {
    const record = this.merchantUserRecords.get(recordId);
    if (!record) return null;

    const updatedRecord = {
      ...record,
      ...updates,
      updatedAt: new Date()
    };

    this.merchantUserRecords.set(recordId, updatedRecord);
    return updatedRecord;
  }

  /**
   * Add ledger entry
   */
  addLedgerEntry(entry: LedgerEntry): LedgerEntry {
    const entries = this.ledgerEntries.get(entry.recordId) || [];
    entries.push(entry);
    this.ledgerEntries.set(entry.recordId, entries);
    return entry;
  }

  /**
   * Get ledger entries for a record
   */
  getLedgerEntries(query: LedgerQueryParams): LedgerEntry[] {
    const entries = this.ledgerEntries.get(query.recordId) || [];
    
    let filteredEntries = entries;

    // Filter by entry type
    if (query.entryType) {
      filteredEntries = filteredEntries.filter(e => e.entryType === query.entryType);
    }

    // Filter by financial category
    if (query.financialCategory) {
      filteredEntries = filteredEntries.filter(e => e.financialCategory === query.financialCategory);
    }

    // Filter by transaction type
    if (query.transactionType) {
      filteredEntries = filteredEntries.filter(e => e.transactionType === query.transactionType);
    }

    // Filter by date range
    if (query.startDate) {
      filteredEntries = filteredEntries.filter(e => e.createdAt >= query.startDate!);
    }
    if (query.endDate) {
      filteredEntries = filteredEntries.filter(e => e.createdAt <= query.endDate!);
    }

    // Filter by amount range
    if (query.minAmount !== undefined) {
      filteredEntries = filteredEntries.filter(e => e.debit_amount_local >= query.minAmount!);
    }
    if (query.maxAmount !== undefined) {
      filteredEntries = filteredEntries.filter(e => e.debit_amount_local <= query.maxAmount!);
    }

    // Sort entries
    const sortField = query.sortBy || LedgerSortField.DATE;
    const sortOrder = query.sortOrder || SortOrder.DESC;

    filteredEntries.sort((a, b) => {
      let compareValue = 0;

      switch (sortField) {
        case LedgerSortField.DATE:
          compareValue = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case LedgerSortField.AMOUNT:
          compareValue = a.debit_amount_local - b.debit_amount_local;
          break;
        case LedgerSortField.TRANSACTION_TYPE:
          compareValue = a.transactionType.localeCompare(b.transactionType);
          break;
        case LedgerSortField.FINANCIAL_CATEGORY:
          compareValue = a.financialCategory.localeCompare(b.financialCategory);
          break;
        case LedgerSortField.ENTRY_TYPE:
          compareValue = a.entryType.localeCompare(b.entryType);
          break;
        case LedgerSortField.BALANCE:
          compareValue = a.balance_after - b.balance_after;
          break;
        default:
          compareValue = a.createdAt.getTime() - b.createdAt.getTime();
      }

      return sortOrder === SortOrder.ASC ? compareValue : -compareValue;
    });

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    
    return filteredEntries.slice(offset, offset + limit);
  }

  /**
   * Get ledger summary
   */
  getLedgerSummary(recordId: string): LedgerSummary | null {
    const record = this.findRecordById(recordId);
    if (!record) return null;

    const entries = this.ledgerEntries.get(recordId) || [];
    const completedEntries = entries.filter(e => e.status === TransactionStatus.COMPLETED);

    return {
      recordId,
      currentBalance: record.currentBalance,
      totalDebits: record.totalDebits,
      totalCredits: record.totalCredits,
      currency: record.currency,
      lastTransactionAt: completedEntries.length > 0 
        ? completedEntries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt 
        : undefined,
      transactionCount: completedEntries.length
    };
  }

  /**
   * Get all merchant records
   */
  getAllMerchantRecords(): MerchantRecord[] {
    return Array.from(this.merchantRecords.values());
  }

  /**
   * Get all merchant-user records
   */
  getAllMerchantUserRecords(): MerchantUserRecord[] {
    return Array.from(this.merchantUserRecords.values());
  }

  /**
   * Get merchant-user records by merchant ID
   */
  getMerchantUsersByMerchantId(userMerchantId: string): MerchantUserRecord[] {
    return Array.from(this.merchantUserRecords.values())
      .filter(record => record.userMerchantId === userMerchantId);
  }

  /**
   * Clear all storage (for testing)
   */
  clear(): void {
    this.merchantRecords.clear();
    this.merchantUserRecords.clear();
    this.ledgerEntries.clear();
    this.userIdToRecordId.clear();
  }

  /**
   * Get storage statistics
   */
  getStats() {
    return {
      merchantRecords: this.merchantRecords.size,
      merchantUserRecords: this.merchantUserRecords.size,
      totalRecords: this.merchantRecords.size + this.merchantUserRecords.size,
      totalLedgerEntries: Array.from(this.ledgerEntries.values()).reduce((sum, entries) => sum + entries.length, 0)
    };
  }
}

// Export singleton instance
export const recordStorage = new RecordStorage();
export default recordStorage;
