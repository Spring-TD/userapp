import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import { db } from '../db/database';
import {
  CreateRecordRequest,
  CreateRecordResponse,
  MerchantRecord,
  MerchantUserRecord,
  RecordType,
  LedgerEntry,
  LedgerEntryType,
  TransactionStatus,
  TransactionType,
  LedgerQueryParams,
  LedgerSummary,
  BeneficiaryFiatInfo,
  SenderInfo,
  FeeBreakdown,
  FinancialCategory,
  FundRecordRequest,
  DebitRecordRequest,
  FundDebitResponse,
  CategorySummary,
  AnalyticsSummary
} from '../types/record';

/**
 * RecordService
 * Handles creation and management of merchant and merchant-user records
 */
export class RecordService {
  /**
   * Create a record (Merchant or Merchant-User) after successful verification
   * This is triggered by a webhook from service-auth-ms
   */
  async createRecord(request: CreateRecordRequest): Promise<CreateRecordResponse> {
    try {
      logger.info('Creating record for verified user', {
        userId: request.userId,
        email: request.email,
        userType: request.userType
      });

      // Check if record already exists for this user
      const existingRecord = await db.findRecordByUserId(request.userId);
      if (existingRecord) {
        logger.warn('Record already exists for user', { userId: request.userId });
        return {
          success: false,
          error: 'Record already exists for this user'
        };
      }

      // Determine record type based on user type
      const recordType = request.userType === 'MERCHANT' 
        ? RecordType.MERCHANT 
        : RecordType.MERCHANT_USER;

      // Get default currency (can be configured based on country)
      const currency = this.getDefaultCurrency(request.country);

      const recordId = uuidv4();
      const now = new Date();
      const verifiedAt = new Date(request.verifiedAt);

      if (recordType === RecordType.MERCHANT) {
        // Create Merchant Record
        const merchantRecord: MerchantRecord = {
          recordId,
          recordType: RecordType.MERCHANT,
          userId: request.userId,
          email: request.email,
          firstName: request.firstName,
          lastName: request.lastName,
          userMerchantId: request.userMerchantId,
          country: request.country,
          phone: request.phone,
          currentBalance: 0,
          currency,
          totalDebits: 0,
          totalCredits: 0,
          isActive: true,
          verifiedAt,
          metadata: request.metadata || {},
          createdAt: now,
          updatedAt: now
        };

        const createdRecord = await db.createMerchantRecord(merchantRecord);

        logger.info('Merchant record created successfully', {
          recordId: createdRecord.recordId,
          userId: createdRecord.userId,
          userMerchantId: createdRecord.userMerchantId
        });

        return {
          success: true,
          data: {
            record: createdRecord,
            message: 'Merchant record created successfully with debit/credit ledger initialized'
          }
        };
      } else {
        // Create Merchant-User Record
        const merchantUserRecord: MerchantUserRecord = {
          recordId,
          recordType: RecordType.MERCHANT_USER,
          userId: request.userId,
          email: request.email,
          firstName: request.firstName,
          lastName: request.lastName,
          userMerchantId: request.userMerchantId, // References parent merchant
          country: request.country,
          phone: request.phone,
          currentBalance: 0,
          currency,
          totalDebits: 0,
          totalCredits: 0,
          isActive: true,
          verifiedAt,
          metadata: request.metadata || {},
          createdAt: now,
          updatedAt: now
        };

        const createdRecord = await db.createMerchantUserRecord(merchantUserRecord);

        logger.info('Merchant-user record created successfully', {
          recordId: createdRecord.recordId,
          userId: createdRecord.userId,
          userMerchantId: createdRecord.userMerchantId
        });

        return {
          success: true,
          data: {
            record: createdRecord,
            message: 'Merchant-user record created successfully with debit/credit ledger initialized'
          }
        };
      }
    } catch (error) {
      logger.error('Error creating record', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.userId
      });

      return {
        success: false,
        error: 'Failed to create record. Please try again later.'
      };
    }
  }

  /**
   * Get record by user ID
   */
  async getRecordByUserId(userId: string): Promise<MerchantRecord | MerchantUserRecord | null> {
    try {
      return await db.findRecordByUserId(userId);
    } catch (error) {
      logger.error('Error retrieving record by user ID', { error, userId });
      return null;
    }
  }

  /**
   * Get record by record ID
   */
  async getRecordById(recordId: string): Promise<MerchantRecord | MerchantUserRecord | null> {
    try {
      return await db.findRecordById(recordId);
    } catch (error) {
      logger.error('Error retrieving record by ID', { error, recordId });
      return null;
    }
  }

  /**
   * Get record by email
   */
  async getRecordByEmail(email: string): Promise<MerchantRecord | MerchantUserRecord | null> {
    try {
      return await db.findRecordByEmail(email);
    } catch (error) {
      logger.error('Error retrieving record by email', { error, email });
      return null;
    }
  }

  /**
   * Add a comprehensive ledger entry with full transaction details
   */
  async addLedgerEntry(
    recordId: string,
    entryType: LedgerEntryType,
    debitAmount: number,
    transactionDescription: string,
    options: {
      transactionType: TransactionType;
      financialCategory?: FinancialCategory;
      txnRef: string;
      sessionId: string;
      fromCurrency: string;
      toCurrency: string;
      senderInfo: SenderInfo;
      feeBreakdown: FeeBreakdown;
      thirdPartyRefId?: string;
      beneficiaryInfo?: BeneficiaryFiatInfo;
      status?: TransactionStatus;
    }
  ): Promise<LedgerEntry | null> {
    try {
      const record = await db.findRecordById(recordId);
      if (!record) {
        logger.error('Record not found for ledger entry', { recordId });
        return null;
      }

      // Calculate opening balance (balance before this transaction)
      const balanceBf = record.currentBalance;

      // Calculate closing balance after transaction
      let balanceAfter = balanceBf;
      if (entryType === LedgerEntryType.CREDIT) {
        balanceAfter += debitAmount;
      } else {
        balanceAfter -= debitAmount;
      }

      const now = new Date();

      const ledgerEntry: LedgerEntry = {
        // Primary identifiers
        ledgerEntryId: uuidv4(),
        recordId,
        
        // Entry classification
        entryType,
        transactionType: options.transactionType,
        financialCategory: options.financialCategory || FinancialCategory.WALLET,
        status: options.status || TransactionStatus.COMPLETED,
        
        // Core transaction fields
        balance_bf: balanceBf,
        debit_amount_local: debitAmount,
        balance_after: balanceAfter,
        transaction_timestamp: now,
        
        // Transaction references
        txn_ref: options.txnRef,
        session_id: options.sessionId,
        third_party_ref_id: options.thirdPartyRefId,
        
        // Transaction details
        transaction_description: transactionDescription,
        
        // Currency information
        from_currency: options.fromCurrency,
        to_currency: options.toCurrency,
        
        // Beneficiary information (for fiat transactions)
        beneficiary_info: options.beneficiaryInfo,
        
        // Sender information
        sender_info: options.senderInfo,
        
        // Fee breakdown
        fee_breakdown: options.feeBreakdown,
        
        // Audit trail
        createdAt: now,
        updatedAt: now
      };

      // Add entry to storage
      const createdEntry = await db.addLedgerEntry(ledgerEntry);

      // Update record balances
      const updates: Record<string, unknown> = {
        currentBalance: balanceAfter,
        updatedAt: now
      };

      if (entryType === LedgerEntryType.CREDIT) {
        updates.totalCredits = record.totalCredits + debitAmount;
      } else {
        updates.totalDebits = record.totalDebits + debitAmount;
      }

      if (record.recordType === RecordType.MERCHANT) {
        await db.updateMerchantRecord(recordId, updates as Partial<MerchantRecord>);
      } else {
        await db.updateMerchantUserRecord(recordId, updates as Partial<MerchantUserRecord>);
      }

      logger.info('Comprehensive ledger entry added', {
        recordId,
        ledgerEntryId: createdEntry.ledgerEntryId,
        entryType,
        transactionType: options.transactionType,
        financialCategory: options.financialCategory,
        debitAmount,
        balanceBf,
        balanceAfter,
        txnRef: options.txnRef
      });

      return createdEntry;
    } catch (error) {
      logger.error('Error adding ledger entry', { error, recordId });
      return null;
    }
  }

  /**
   * Get ledger entries for a record
   */
  async getLedgerEntries(query: LedgerQueryParams): Promise<LedgerEntry[]> {
    try {
      return await db.getLedgerEntries(query);
    } catch (error) {
      logger.error('Error retrieving ledger entries', { error, recordId: query.recordId });
      return [];
    }
  }

  /**
   * Find one ledger entry by idempotency reference.
   */
  async getLedgerEntryByTxnRef(recordId: string, txnRef: string): Promise<LedgerEntry | null> {
    try {
      return await db.findLedgerEntryByTxnRef(recordId, txnRef);
    } catch (error) {
      logger.error('Error retrieving ledger entry by txnRef', { error, recordId, txnRef });
      return null;
    }
  }

  /**
   * Get ledger summary for a record
   */
  async getLedgerSummary(recordId: string): Promise<LedgerSummary | null> {
    try {
      return await db.getLedgerSummary(recordId);
    } catch (error) {
      logger.error('Error retrieving ledger summary', { error, recordId });
      return null;
    }
  }

  /**
   * Get all merchant records
   */
  async getAllMerchantRecords(): Promise<MerchantRecord[]> {
    try {
      return await db.getAllMerchantRecords();
    } catch (error) {
      logger.error('Error retrieving merchant records', { error });
      return [];
    }
  }

  /**
   * Get merchant-user records by merchant ID
   */
  async getMerchantUsersByMerchantId(userMerchantId: string): Promise<MerchantUserRecord[]> {
    try {
      return await db.getMerchantUsersByMerchantId(userMerchantId);
    } catch (error) {
      logger.error('Error retrieving merchant-user records', { error, userMerchantId });
      return [];
    }
  }

  /**
   * Deactivate a record
   */
  async deactivateRecord(recordId: string): Promise<boolean> {
    try {
      const record = await db.findRecordById(recordId);
      if (!record) {
        logger.error('Record not found for deactivation', { recordId });
        return false;
      }

      if (record.recordType === RecordType.MERCHANT) {
        await db.updateMerchantRecord(recordId, { isActive: false });
      } else {
        await db.updateMerchantUserRecord(recordId, { isActive: false });
      }

      logger.info('Record deactivated', { recordId });
      return true;
    } catch (error) {
      logger.error('Error deactivating record', { error, recordId });
      return false;
    }
  }

  /**
   * Activate a record
   */
  async activateRecord(recordId: string): Promise<boolean> {
    try {
      const record = await db.findRecordById(recordId);
      if (!record) {
        logger.error('Record not found for activation', { recordId });
        return false;
      }

      if (record.recordType === RecordType.MERCHANT) {
        await db.updateMerchantRecord(recordId, { isActive: true });
      } else {
        await db.updateMerchantUserRecord(recordId, { isActive: true });
      }

      logger.info('Record activated', { recordId });
      return true;
    } catch (error) {
      logger.error('Error activating record', { error, recordId });
      return false;
    }
  }

  /**
   * Get default currency based on country
   * This can be extended with a more comprehensive country-to-currency mapping
   */
  private getDefaultCurrency(country: string): string {
    const currencyMap: Record<string, string> = {
      'USA': 'USD',
      'US': 'USD',
      'United States': 'USD',
      'UK': 'GBP',
      'United Kingdom': 'GBP',
      'Canada': 'CAD',
      'Australia': 'AUD',
      'Nigeria': 'NGN',
      'Ghana': 'GHS',
      'Kenya': 'KES',
      'South Africa': 'ZAR'
    };

    return currencyMap[country] || 'USD'; // Default to USD
  }

  /**
   * Fund a record in a specific financial category (CREDIT operation)
   * This adds money to the record in loan, savings, mortgage, commodity, or wallet categories
   */
  async fundRecord(request: FundRecordRequest): Promise<FundDebitResponse> {
    try {
      logger.info('Funding record', {
        recordId: request.recordId,
        category: request.category,
        amount: request.amount
      });

      // Verify record exists
      const record = await this.getRecordById(request.recordId);
      if (!record) {
        return {
          success: false,
          error: 'Record not found'
        };
      }

      // Check if record is active
      if (!record.isActive) {
        return {
          success: false,
          error: 'Record is not active'
        };
      }

      // Add ledger entry as CREDIT
      const entry = await this.addLedgerEntry(
        request.recordId,
        LedgerEntryType.CREDIT,
        request.amount,
        request.description,
        {
          transactionType: request.transactionType,
          financialCategory: request.category,
          txnRef: request.txnRef,
          sessionId: request.sessionId,
          fromCurrency: request.fromCurrency,
          toCurrency: request.toCurrency,
          senderInfo: request.senderInfo,
          feeBreakdown: request.feeBreakdown,
          thirdPartyRefId: request.thirdPartyRefId,
          beneficiaryInfo: request.beneficiaryInfo,
          status: TransactionStatus.COMPLETED
        }
      );

      if (!entry) {
        return {
          success: false,
          error: 'Failed to create funding entry'
        };
      }

      // Get updated record
      const updatedRecord = await this.getRecordById(request.recordId);

      logger.info('Record funded successfully', {
        recordId: request.recordId,
        category: request.category,
        amount: request.amount,
        newBalance: updatedRecord?.currentBalance
      });

      return {
        success: true,
        data: {
          entry,
          record: updatedRecord!,
          message: `Successfully funded ${request.category} category with ${request.amount} ${request.toCurrency}`
        }
      };
    } catch (error) {
      logger.error('Error funding record', {
        error: error instanceof Error ? error.message : 'Unknown error',
        recordId: request.recordId
      });

      return {
        success: false,
        error: 'Failed to fund record. Please try again later.'
      };
    }
  }

  /**
   * Debit a record in a specific financial category (DEBIT operation)
   * This removes money from the record in loan, savings, mortgage, commodity, or wallet categories
   */
  async debitRecord(request: DebitRecordRequest): Promise<FundDebitResponse> {
    try {
      logger.info('Debiting record', {
        recordId: request.recordId,
        category: request.category,
        amount: request.amount
      });

      // Verify record exists
      const record = await this.getRecordById(request.recordId);
      if (!record) {
        return {
          success: false,
          error: 'Record not found'
        };
      }

      // Check if record is active
      if (!record.isActive) {
        return {
          success: false,
          error: 'Record is not active'
        };
      }

      // Check sufficient balance
      if (record.currentBalance < request.amount) {
        return {
          success: false,
          error: 'Insufficient balance for debit operation'
        };
      }

      // Add ledger entry as DEBIT
      const entry = await this.addLedgerEntry(
        request.recordId,
        LedgerEntryType.DEBIT,
        request.amount,
        request.description,
        {
          transactionType: request.transactionType,
          financialCategory: request.category,
          txnRef: request.txnRef,
          sessionId: request.sessionId,
          fromCurrency: request.fromCurrency,
          toCurrency: request.toCurrency,
          senderInfo: request.senderInfo,
          feeBreakdown: request.feeBreakdown,
          thirdPartyRefId: request.thirdPartyRefId,
          beneficiaryInfo: request.beneficiaryInfo,
          status: TransactionStatus.COMPLETED
        }
      );

      if (!entry) {
        return {
          success: false,
          error: 'Failed to create debit entry'
        };
      }

      // Get updated record
      const updatedRecord = await this.getRecordById(request.recordId);

      logger.info('Record debited successfully', {
        recordId: request.recordId,
        category: request.category,
        amount: request.amount,
        newBalance: updatedRecord?.currentBalance
      });

      return {
        success: true,
        data: {
          entry,
          record: updatedRecord!,
          message: `Successfully debited ${request.amount} ${request.toCurrency} from ${request.category} category`
        }
      };
    } catch (error) {
      logger.error('Error debiting record', {
        error: error instanceof Error ? error.message : 'Unknown error',
        recordId: request.recordId
      });

      return {
        success: false,
        error: 'Failed to debit record. Please try again later.'
      };
    }
  }

  /**
   * Get category-specific summary for a record
   * Shows breakdown by financial category (loan, savings, mortgage, commodity, wallet)
   */
  async getCategorySummary(recordId: string): Promise<CategorySummary[]> {
    try {
      const entries = await this.getLedgerEntries({ recordId });
      
      const categoryMap: Map<FinancialCategory, CategorySummary> = new Map();
      
      // Initialize all categories
      Object.values(FinancialCategory).forEach(category => {
        categoryMap.set(category, {
          category,
          totalDebits: 0,
          totalCredits: 0,
          balance: 0,
          transactionCount: 0
        });
      });

      // Calculate summaries
      entries.forEach(entry => {
        const summary = categoryMap.get(entry.financialCategory)!;
        summary.transactionCount++;
        
        if (entry.entryType === LedgerEntryType.CREDIT) {
          summary.totalCredits += entry.debit_amount_local;
          summary.balance += entry.debit_amount_local;
        } else {
          summary.totalDebits += entry.debit_amount_local;
          summary.balance -= entry.debit_amount_local;
        }
      });

      return Array.from(categoryMap.values());
    } catch (error) {
      logger.error('Error retrieving category summary', { error, recordId });
      return [];
    }
  }

  /**
   * Get comprehensive analytics summary for a record
   * Includes total payin, payout, category breakdowns, and metrics
   */
  async getAnalytics(recordId: string, options?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<AnalyticsSummary | null> {
    try {
      const record = await this.getRecordById(recordId);
      if (!record) {
        logger.error('Record not found for analytics', { recordId });
        return null;
      }

      // Build query with optional date range
      const query: LedgerQueryParams = { recordId };
      if (options?.startDate) query.startDate = options.startDate;
      if (options?.endDate) query.endDate = options.endDate;

      const entries = await this.getLedgerEntries(query);
      
      // Initialize category totals
      const categoryTotals: Record<FinancialCategory, number> = {
        [FinancialCategory.LOAN]: 0,
        [FinancialCategory.SAVINGS]: 0,
        [FinancialCategory.MORTGAGE]: 0,
        [FinancialCategory.COMMODITY]: 0,
        [FinancialCategory.WALLET]: 0
      };

      let totalPayin = 0;
      let totalPayout = 0;

      // Calculate totals
      entries.forEach(entry => {
        if (entry.status === TransactionStatus.COMPLETED) {
          if (entry.entryType === LedgerEntryType.CREDIT) {
            totalPayin += entry.debit_amount_local;
          } else {
            totalPayout += entry.debit_amount_local;
          }

          // Add to category total (net amount)
          if (entry.entryType === LedgerEntryType.CREDIT) {
            categoryTotals[entry.financialCategory] += entry.debit_amount_local;
          } else {
            categoryTotals[entry.financialCategory] -= entry.debit_amount_local;
          }
        }
      });

      // Get category breakdown
      const categoryBreakdown = await this.getCategorySummary(recordId);

      // Get customer count if this is a merchant record
      let totalCustomers: number | undefined;
      let activeCustomers: number | undefined;
      
      if (record.recordType === RecordType.MERCHANT) {
        const users = await this.getMerchantUsersByMerchantId(record.userMerchantId);
        totalCustomers = users.length;
        activeCustomers = users.filter(u => u.isActive).length;
      }

      const analytics: AnalyticsSummary = {
        recordId,
        userMerchantId: record.userMerchantId,
        
        // Overall totals
        totalPayin,
        totalPayout,
        netBalance: totalPayin - totalPayout,
        totalTransactions: entries.filter(e => e.status === TransactionStatus.COMPLETED).length,
        
        // Category-specific totals
        totalLoan: categoryTotals[FinancialCategory.LOAN],
        totalSavings: categoryTotals[FinancialCategory.SAVINGS],
        totalMortgage: categoryTotals[FinancialCategory.MORTGAGE],
        totalCommodity: categoryTotals[FinancialCategory.COMMODITY],
        totalWallet: categoryTotals[FinancialCategory.WALLET],
        
        // Customer metrics
        totalCustomers,
        activeCustomers,
        
        // Date range
        dateRange: options?.startDate || options?.endDate ? {
          startDate: options.startDate || new Date(0),
          endDate: options.endDate || new Date()
        } : undefined,
        
        // Category breakdown
        categoryBreakdown
      };

      logger.info('Analytics generated', {
        recordId,
        totalPayin,
        totalPayout,
        netBalance: analytics.netBalance,
        totalTransactions: analytics.totalTransactions
      });

      return analytics;
    } catch (error) {
      logger.error('Error generating analytics', { error, recordId });
      return null;
    }
  }

  /**
   * Get aggregated analytics for a merchant (all their users combined)
   */
  async getMerchantAnalytics(userMerchantId: string, options?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<AnalyticsSummary | null> {
    try {
      // Get merchant record
      const merchants = await this.getAllMerchantRecords();
      const merchant = merchants.find(m => m.userMerchantId === userMerchantId);
      
      if (!merchant) {
        logger.error('Merchant not found for analytics', { userMerchantId });
        return null;
      }

      // Get all merchant users
      const users = await this.getMerchantUsersByMerchantId(userMerchantId);
      
      // Initialize aggregated totals
      let totalPayin = 0;
      let totalPayout = 0;
      let totalTransactions = 0;
      
      const categoryTotals: Record<FinancialCategory, number> = {
        [FinancialCategory.LOAN]: 0,
        [FinancialCategory.SAVINGS]: 0,
        [FinancialCategory.MORTGAGE]: 0,
        [FinancialCategory.COMMODITY]: 0,
        [FinancialCategory.WALLET]: 0
      };

      const allCategoryBreakdowns: CategorySummary[] = [];

      // Aggregate merchant's own analytics
      const merchantAnalytics = await this.getAnalytics(merchant.recordId, options);
      if (merchantAnalytics) {
        totalPayin += merchantAnalytics.totalPayin;
        totalPayout += merchantAnalytics.totalPayout;
        totalTransactions += merchantAnalytics.totalTransactions;
        
        categoryTotals[FinancialCategory.LOAN] += merchantAnalytics.totalLoan;
        categoryTotals[FinancialCategory.SAVINGS] += merchantAnalytics.totalSavings;
        categoryTotals[FinancialCategory.MORTGAGE] += merchantAnalytics.totalMortgage;
        categoryTotals[FinancialCategory.COMMODITY] += merchantAnalytics.totalCommodity;
        categoryTotals[FinancialCategory.WALLET] += merchantAnalytics.totalWallet;
      }

      // Aggregate all user analytics
      for (const user of users) {
        const userAnalytics = await this.getAnalytics(user.recordId, options);
        if (userAnalytics) {
          totalPayin += userAnalytics.totalPayin;
          totalPayout += userAnalytics.totalPayout;
          totalTransactions += userAnalytics.totalTransactions;
          
          categoryTotals[FinancialCategory.LOAN] += userAnalytics.totalLoan;
          categoryTotals[FinancialCategory.SAVINGS] += userAnalytics.totalSavings;
          categoryTotals[FinancialCategory.MORTGAGE] += userAnalytics.totalMortgage;
          categoryTotals[FinancialCategory.COMMODITY] += userAnalytics.totalCommodity;
          categoryTotals[FinancialCategory.WALLET] += userAnalytics.totalWallet;
        }
      }

      // Create aggregated category breakdown
      const categoryBreakdown: CategorySummary[] = Object.entries(categoryTotals).map(([category, balance]) => ({
        category: category as FinancialCategory,
        totalDebits: 0,  // Aggregated, so we only track net
        totalCredits: 0,
        balance,
        transactionCount: 0
      }));

      const analytics: AnalyticsSummary = {
        userMerchantId,
        
        // Overall totals
        totalPayin,
        totalPayout,
        netBalance: totalPayin - totalPayout,
        totalTransactions,
        
        // Category-specific totals
        totalLoan: categoryTotals[FinancialCategory.LOAN],
        totalSavings: categoryTotals[FinancialCategory.SAVINGS],
        totalMortgage: categoryTotals[FinancialCategory.MORTGAGE],
        totalCommodity: categoryTotals[FinancialCategory.COMMODITY],
        totalWallet: categoryTotals[FinancialCategory.WALLET],
        
        // Customer metrics
        totalCustomers: users.length,
        activeCustomers: users.filter(u => u.isActive).length,
        
        // Date range
        dateRange: options?.startDate || options?.endDate ? {
          startDate: options.startDate || new Date(0),
          endDate: options.endDate || new Date()
        } : undefined,
        
        // Category breakdown
        categoryBreakdown
      };

      logger.info('Merchant analytics generated', {
        userMerchantId,
        totalPayin,
        totalPayout,
        totalCustomers: analytics.totalCustomers,
        totalTransactions
      });

      return analytics;
    } catch (error) {
      logger.error('Error generating merchant analytics', { error, userMerchantId });
      return null;
    }
  }
}

export default new RecordService();
