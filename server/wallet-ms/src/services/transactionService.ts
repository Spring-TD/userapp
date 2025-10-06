import { Transaction, TransactionType, TransactionStatus } from '../models/Wallet';
import { logger } from '../utils/logger';

// Mock database storage
interface MockDB {
  transactions: Map<string, Transaction>;
}

const mockDB: MockDB = {
  transactions: new Map()
};

export interface CreateTransactionData {
  walletId: string;
  amount: number;
  type: TransactionType;
  description: string;
  referenceId?: string;
}

export class TransactionService {
  /**
   * Create a new transaction
   */
  static async createTransaction(data: CreateTransactionData): Promise<{ 
    success: boolean; 
    transaction?: Transaction; 
    error?: string 
  }> {
    try {
      // Create new transaction
      const newTransaction: Transaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        walletId: data.walletId,
        amount: data.amount,
        type: data.type,
        status: TransactionStatus.PENDING,
        description: data.description,
        referenceId: data.referenceId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDB.transactions.set(newTransaction.id, newTransaction);
      logger.info('Transaction created', { transactionId: newTransaction.id, walletId: data.walletId });

      // Simulate processing
      newTransaction.status = TransactionStatus.COMPLETED;
      newTransaction.updatedAt = new Date();
      mockDB.transactions.set(newTransaction.id, newTransaction);

      return {
        success: true,
        transaction: newTransaction
      };
    } catch (error) {
      logger.error('Error creating transaction', { error });
      return {
        success: false,
        error: 'Failed to create transaction'
      };
    }
  }

  /**
   * Get transaction history for a wallet
   */
  static async getTransactionHistory(walletId: string): Promise<{ 
    success: boolean; 
    transactions?: Transaction[]; 
    error?: string 
  }> {
    try {
      const transactions: Transaction[] = [];

      // Find all transactions for this wallet
      for (const transaction of mockDB.transactions.values()) {
        if (transaction.walletId === walletId) {
          transactions.push(transaction);
        }
      }

      // Sort by creation date (newest first)
      transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return {
        success: true,
        transactions: transactions
      };
    } catch (error) {
      logger.error('Error retrieving transaction history', { error });
      return {
        success: false,
        error: 'Failed to retrieve transaction history'
      };
    }
  }

  /**
   * Get transaction by ID
   */
  static async getTransactionById(transactionId: string): Promise<{ 
    success: boolean; 
    transaction?: Transaction; 
    error?: string 
  }> {
    try {
      const transaction = mockDB.transactions.get(transactionId);

      if (!transaction) {
        return {
          success: false,
          error: 'Transaction not found'
        };
      }

      return {
        success: true,
        transaction: transaction
      };
    } catch (error) {
      logger.error('Error retrieving transaction', { error });
      return {
        success: false,
        error: 'Failed to retrieve transaction'
      };
    }
  }
}