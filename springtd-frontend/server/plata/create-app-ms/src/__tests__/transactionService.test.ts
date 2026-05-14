import { TransactionService } from '../services/transactionService';

describe('TransactionService', () => {
  beforeEach(() => {
    // Clear all transactions before each test
    (TransactionService as any).transactions = [];
  });

  describe('getTransactionsByAppId', () => {
    it('should return transactions for a specific app', async () => {
      // Create test transactions
      const transaction1 = await TransactionService.createTransaction({
        appId: 'app1',
        amount: 100,
        currency: 'USD',
        type: 'credit',
        status: 'completed',
        description: 'Test transaction 1'
      });

      const transaction2 = await TransactionService.createTransaction({
        appId: 'app1',
        amount: 50,
        currency: 'USD',
        type: 'debit',
        status: 'completed',
        description: 'Test transaction 2'
      });

      const transaction3 = await TransactionService.createTransaction({
        appId: 'app2',
        amount: 200,
        currency: 'USD',
        type: 'credit',
        status: 'completed',
        description: 'Test transaction 3'
      });

      // Get transactions for app1
      const transactions = await TransactionService.getTransactionsByAppId('app1');
      
      expect(transactions).toHaveLength(2);
      expect(transactions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: transaction1.id }),
          expect.objectContaining({ id: transaction2.id })
        ])
      );
      expect(transactions).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: transaction3.id })
        ])
      );
    });

    it('should return empty array for non-existent app', async () => {
      const transactions = await TransactionService.getTransactionsByAppId('non-existent');
      expect(transactions).toHaveLength(0);
    });
  });

  describe('getTransactionStats', () => {
    it('should return correct transaction statistics', async () => {
      // Create test transactions
      await TransactionService.createTransaction({
        appId: 'app1',
        amount: 100,
        currency: 'USD',
        type: 'credit',
        status: 'completed',
        description: 'Credit transaction 1'
      });

      await TransactionService.createTransaction({
        appId: 'app1',
        amount: 50,
        currency: 'USD',
        type: 'credit',
        status: 'completed',
        description: 'Credit transaction 2'
      });

      await TransactionService.createTransaction({
        appId: 'app1',
        amount: 30,
        currency: 'USD',
        type: 'debit',
        status: 'completed',
        description: 'Debit transaction 1'
      });

      await TransactionService.createTransaction({
        appId: 'app1',
        amount: 20,
        currency: 'USD',
        type: 'debit',
        status: 'pending',
        description: 'Pending transaction'
      });

      const stats = await TransactionService.getTransactionStats('app1');
      
      expect(stats.totalTransactions).toBe(4);
      expect(stats.totalCreditAmount).toBe(150);
      expect(stats.totalDebitAmount).toBe(50);
      expect(stats.completedTransactions).toBe(3);
      expect(stats.pendingTransactions).toBe(1);
      expect(stats.failedTransactions).toBe(0);
      expect(stats.netAmount).toBe(100);
    });
  });
});