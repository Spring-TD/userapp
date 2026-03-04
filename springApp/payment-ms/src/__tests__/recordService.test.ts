import mongoose from 'mongoose';
import recordService from '../services/recordService';
import { db } from '../db/database';
import { RecordType, LedgerEntryType, TransactionStatus, TransactionType, FinancialCategory } from '../types/record';

const TEST_MONGO_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/payment_db_test';

describe('RecordService', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(TEST_MONGO_URI);
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await db.clearAll();
  });

  describe('createRecord', () => {
    it('should create a merchant record successfully', async () => {
      const request = {
        userId: 'user-123',
        email: 'merchant@example.com',
        firstName: 'John',
        lastName: 'Merchant',
        userType: 'MERCHANT' as const,
        userMerchantId: 'merchant-001',
        country: 'USA',
        phone: '+1234567890',
        verifiedAt: new Date().toISOString(),
        metadata: {}
      };

      const result = await recordService.createRecord(request);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.record.recordType).toBe(RecordType.MERCHANT);
      expect(result.data?.record.email).toBe(request.email);
      expect(result.data?.record.userId).toBe(request.userId);
      expect(result.data?.record.currentBalance).toBe(0);
      expect(result.data?.record.totalDebits).toBe(0);
      expect(result.data?.record.totalCredits).toBe(0);
      expect(result.data?.record.isActive).toBe(true);
      expect(result.data?.record.currency).toBe('USD');
    });

    it('should create a merchant-user record successfully', async () => {
      const request = {
        userId: 'user-456',
        email: 'user@example.com',
        firstName: 'Jane',
        lastName: 'User',
        userType: 'USER' as const,
        userMerchantId: 'merchant-001',
        country: 'USA',
        phone: '+1234567890',
        verifiedAt: new Date().toISOString(),
        metadata: {}
      };

      const result = await recordService.createRecord(request);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.record.recordType).toBe(RecordType.MERCHANT_USER);
      expect(result.data?.record.email).toBe(request.email);
      expect(result.data?.record.userId).toBe(request.userId);
      expect(result.data?.record.userMerchantId).toBe(request.userMerchantId);
      expect(result.data?.record.currentBalance).toBe(0);
    });

    it('should not create duplicate record for same user', async () => {
      const request = {
        userId: 'user-123',
        email: 'merchant@example.com',
        firstName: 'John',
        lastName: 'Merchant',
        userType: 'MERCHANT' as const,
        userMerchantId: 'merchant-001',
        country: 'USA',
        verifiedAt: new Date().toISOString()
      };

      // Create first record
      await recordService.createRecord(request);

      // Try to create duplicate
      const result = await recordService.createRecord(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Record already exists for this user');
    });

    it('should set correct currency based on country', async () => {
      const nigeriaRequest = {
        userId: 'user-789',
        email: 'nigeria@example.com',
        firstName: 'Test',
        lastName: 'User',
        userType: 'MERCHANT' as const,
        userMerchantId: 'merchant-002',
        country: 'Nigeria',
        verifiedAt: new Date().toISOString()
      };

      const result = await recordService.createRecord(nigeriaRequest);

      expect(result.success).toBe(true);
      expect(result.data?.record.currency).toBe('NGN');
    });
  });

  describe('getRecordByUserId', () => {
    it('should retrieve record by user ID', async () => {
      const request = {
        userId: 'user-123',
        email: 'merchant@example.com',
        firstName: 'John',
        lastName: 'Merchant',
        userType: 'MERCHANT' as const,
        userMerchantId: 'merchant-001',
        country: 'USA',
        verifiedAt: new Date().toISOString()
      };

      await recordService.createRecord(request);

      const record = await recordService.getRecordByUserId('user-123');

      expect(record).toBeDefined();
      expect(record?.userId).toBe('user-123');
    });

    it('should return null for non-existent user', async () => {
      const record = await recordService.getRecordByUserId('non-existent');

      expect(record).toBeNull();
    });
  });

  describe('addLedgerEntry', () => {
    beforeEach(async () => {
      // Create a merchant record first
      await recordService.createRecord({
        userId: 'user-123',
        email: 'merchant@example.com',
        firstName: 'John',
        lastName: 'Merchant',
        userType: 'MERCHANT' as const,
        userMerchantId: 'merchant-001',
        country: 'USA',
        verifiedAt: new Date().toISOString()
      });
    });

    it('should add credit entry and update balance', async () => {
      const record = await recordService.getRecordByUserId('user-123');
      expect(record).toBeDefined();

      const entry = await recordService.addLedgerEntry(
        record!.recordId,
        LedgerEntryType.CREDIT,
        1000,
        'Test credit',
        {
          transactionType: TransactionType.DEPOSIT,
          txnRef: 'txn-001',
          sessionId: 'session-001',
          fromCurrency: 'USD',
          toCurrency: 'USD',
          senderInfo: {
            full_name: 'John Doe',
            email: 'john@example.com',
            phone: '+1234567890'
          },
          feeBreakdown: {
            payout_fee: 0,
            merchant_commission: 0
          },
          status: TransactionStatus.COMPLETED
        }
      );

      expect(entry).toBeDefined();
      expect(entry?.entryType).toBe(LedgerEntryType.CREDIT);
      expect(entry?.debit_amount_local).toBe(1000);
      expect(entry?.balance_after).toBe(1000);

      // Check updated record
      const updatedRecord = await recordService.getRecordById(record!.recordId);
      expect(updatedRecord?.currentBalance).toBe(1000);
      expect(updatedRecord?.totalCredits).toBe(1000);
    });

    it('should add debit entry and update balance', async () => {
      const record = await recordService.getRecordByUserId('user-123');
      expect(record).toBeDefined();

      // First add credit
      await recordService.addLedgerEntry(
        record!.recordId,
        LedgerEntryType.CREDIT,
        1000,
        'Initial credit',
        {
          transactionType: TransactionType.DEPOSIT,
          txnRef: 'txn-001',
          sessionId: 'session-001',
          fromCurrency: 'USD',
          toCurrency: 'USD',
          senderInfo: {
            full_name: 'John Doe',
            email: 'john@example.com',
            phone: '+1234567890'
          },
          feeBreakdown: {
            payout_fee: 0,
            merchant_commission: 0
          }
        }
      );

      // Then debit
      const entry = await recordService.addLedgerEntry(
        record!.recordId,
        LedgerEntryType.DEBIT,
        300,
        'Test debit',
        {
          transactionType: TransactionType.WITHDRAWAL,
          txnRef: 'txn-002',
          sessionId: 'session-002',
          fromCurrency: 'USD',
          toCurrency: 'USD',
          senderInfo: {
            full_name: 'John Doe',
            email: 'john@example.com',
            phone: '+1234567890'
          },
          feeBreakdown: {
            payout_fee: 0,
            merchant_commission: 0
          }
        }
      );

      expect(entry).toBeDefined();
      expect(entry?.entryType).toBe(LedgerEntryType.DEBIT);
      expect(entry?.debit_amount_local).toBe(300);
      expect(entry?.balance_after).toBe(700);

      // Check updated record
      const updatedRecord = await recordService.getRecordById(record!.recordId);
      expect(updatedRecord?.currentBalance).toBe(700);
      expect(updatedRecord?.totalDebits).toBe(300);
    });

    it('should return null for non-existent record', async () => {
      const entry = await recordService.addLedgerEntry(
        'non-existent',
        LedgerEntryType.CREDIT,
        1000,
        'Test',
        {
          transactionType: TransactionType.DEPOSIT,
          txnRef: 'txn-001',
          sessionId: 'session-001',
          fromCurrency: 'USD',
          toCurrency: 'USD',
          senderInfo: {
            full_name: 'John Doe',
            email: 'john@example.com',
            phone: '+1234567890'
          },
          feeBreakdown: {
            payout_fee: 0,
            merchant_commission: 0
          }
        }
      );

      expect(entry).toBeNull();
    });
  });

  describe('getLedgerEntries', () => {
    beforeEach(async () => {
      // Create merchant and add some ledger entries
      await recordService.createRecord({
        userId: 'user-123',
        email: 'merchant@example.com',
        firstName: 'John',
        lastName: 'Merchant',
        userType: 'MERCHANT' as const,
        userMerchantId: 'merchant-001',
        country: 'USA',
        verifiedAt: new Date().toISOString()
      });

      const record = await recordService.getRecordByUserId('user-123');
      
      // Add multiple entries
      await recordService.addLedgerEntry(record!.recordId, LedgerEntryType.CREDIT, 1000, 'Credit 1', {
        transactionType: TransactionType.DEPOSIT,
        txnRef: 'txn-001',
        sessionId: 'session-001',
        fromCurrency: 'USD',
        toCurrency: 'USD',
        senderInfo: { full_name: 'John Doe', email: 'john@example.com', phone: '+1234567890' },
        feeBreakdown: { payout_fee: 0, merchant_commission: 0 }
      });
      await recordService.addLedgerEntry(record!.recordId, LedgerEntryType.DEBIT, 500, 'Debit 1', {
        transactionType: TransactionType.WITHDRAWAL,
        txnRef: 'txn-002',
        sessionId: 'session-002',
        fromCurrency: 'USD',
        toCurrency: 'USD',
        senderInfo: { full_name: 'John Doe', email: 'john@example.com', phone: '+1234567890' },
        feeBreakdown: { payout_fee: 0, merchant_commission: 0 }
      });
      await recordService.addLedgerEntry(record!.recordId, LedgerEntryType.CREDIT, 2000, 'Credit 2', {
        transactionType: TransactionType.DEPOSIT,
        txnRef: 'txn-003',
        sessionId: 'session-003',
        fromCurrency: 'USD',
        toCurrency: 'USD',
        senderInfo: { full_name: 'John Doe', email: 'john@example.com', phone: '+1234567890' },
        feeBreakdown: { payout_fee: 0, merchant_commission: 0 }
      });
    });

    it('should retrieve all ledger entries', async () => {
      const record = await recordService.getRecordByUserId('user-123');
      const entries = await recordService.getLedgerEntries({
        recordId: record!.recordId
      });

      expect(entries.length).toBe(3);
    });

    it('should filter by entry type', async () => {
      const record = await recordService.getRecordByUserId('user-123');
      const entries = await recordService.getLedgerEntries({
        recordId: record!.recordId,
        entryType: LedgerEntryType.CREDIT
      });

      expect(entries.length).toBe(2);
      expect(entries.every(e => e.entryType === LedgerEntryType.CREDIT)).toBe(true);
    });

    it('should apply pagination', async () => {
      const record = await recordService.getRecordByUserId('user-123');
      const entries = await recordService.getLedgerEntries({
        recordId: record!.recordId,
        limit: 2,
        offset: 0
      });

      expect(entries.length).toBe(2);
    });
  });

  describe('getLedgerSummary', () => {
    it('should return ledger summary', async () => {
      await recordService.createRecord({
        userId: 'user-123',
        email: 'merchant@example.com',
        firstName: 'John',
        lastName: 'Merchant',
        userType: 'MERCHANT' as const,
        userMerchantId: 'merchant-001',
        country: 'USA',
        verifiedAt: new Date().toISOString()
      });

      const record = await recordService.getRecordByUserId('user-123');
      
      await recordService.addLedgerEntry(record!.recordId, LedgerEntryType.CREDIT, 1000, 'Credit', {
        transactionType: TransactionType.DEPOSIT,
        txnRef: 'txn-001',
        sessionId: 'session-001',
        fromCurrency: 'USD',
        toCurrency: 'USD',
        senderInfo: { full_name: 'John Doe', email: 'john@example.com', phone: '+1234567890' },
        feeBreakdown: { payout_fee: 0, merchant_commission: 0 }
      });
      await recordService.addLedgerEntry(record!.recordId, LedgerEntryType.DEBIT, 300, 'Debit', {
        transactionType: TransactionType.WITHDRAWAL,
        txnRef: 'txn-002',
        sessionId: 'session-002',
        fromCurrency: 'USD',
        toCurrency: 'USD',
        senderInfo: { full_name: 'John Doe', email: 'john@example.com', phone: '+1234567890' },
        feeBreakdown: { payout_fee: 0, merchant_commission: 0 }
      });

      const summary = await recordService.getLedgerSummary(record!.recordId);

      expect(summary).toBeDefined();
      expect(summary?.currentBalance).toBe(700);
      expect(summary?.totalCredits).toBe(1000);
      expect(summary?.totalDebits).toBe(300);
      expect(summary?.transactionCount).toBe(2);
    });
  });

  describe('deactivateRecord and activateRecord', () => {
    it('should deactivate a record', async () => {
      await recordService.createRecord({
        userId: 'user-123',
        email: 'merchant@example.com',
        firstName: 'John',
        lastName: 'Merchant',
        userType: 'MERCHANT' as const,
        userMerchantId: 'merchant-001',
        country: 'USA',
        verifiedAt: new Date().toISOString()
      });

      const record = await recordService.getRecordByUserId('user-123');
      const success = await recordService.deactivateRecord(record!.recordId);

      expect(success).toBe(true);

      const updatedRecord = await recordService.getRecordById(record!.recordId);
      expect(updatedRecord?.isActive).toBe(false);
    });

    it('should activate a record', async () => {
      await recordService.createRecord({
        userId: 'user-123',
        email: 'merchant@example.com',
        firstName: 'John',
        lastName: 'Merchant',
        userType: 'MERCHANT' as const,
        userMerchantId: 'merchant-001',
        country: 'USA',
        verifiedAt: new Date().toISOString()
      });

      const record = await recordService.getRecordByUserId('user-123');
      
      await recordService.deactivateRecord(record!.recordId);
      const success = await recordService.activateRecord(record!.recordId);

      expect(success).toBe(true);

      const updatedRecord = await recordService.getRecordById(record!.recordId);
      expect(updatedRecord?.isActive).toBe(true);
    });
  });

  describe('getMerchantUsersByMerchantId', () => {
    it('should retrieve merchant users by merchant ID', async () => {
      // Create merchant
      await recordService.createRecord({
        userId: 'merchant-123',
        email: 'merchant@example.com',
        firstName: 'John',
        lastName: 'Merchant',
        userType: 'MERCHANT' as const,
        userMerchantId: 'merchant-001',
        country: 'USA',
        verifiedAt: new Date().toISOString()
      });

      // Create merchant users
      await recordService.createRecord({
        userId: 'user-1',
        email: 'user1@example.com',
        firstName: 'User',
        lastName: 'One',
        userType: 'USER' as const,
        userMerchantId: 'merchant-001',
        country: 'USA',
        verifiedAt: new Date().toISOString()
      });

      await recordService.createRecord({
        userId: 'user-2',
        email: 'user2@example.com',
        firstName: 'User',
        lastName: 'Two',
        userType: 'USER' as const,
        userMerchantId: 'merchant-001',
        country: 'USA',
        verifiedAt: new Date().toISOString()
      });

      const users = await recordService.getMerchantUsersByMerchantId('merchant-001');

      expect(users.length).toBe(2);
      expect(users.every(u => u.userMerchantId === 'merchant-001')).toBe(true);
    });
  });
});
