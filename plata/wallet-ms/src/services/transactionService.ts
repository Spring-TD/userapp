import { Transaction, TransactionType, TransactionStatus } from '../models/Wallet';
import { logger } from '../utils/logger';
import * as transactionRepo from '../repositories/transactionRepository';

export interface CreateTransactionData {
  walletId: string;
  amount: number;
  type: TransactionType;
  description: string;
  referenceId?: string;
}

export class TransactionService {
  static async createTransaction(data: CreateTransactionData): Promise<{ 
    success: boolean; 
    transaction?: Transaction; 
    error?: string 
  }> {
    try {
      const newTransaction = await transactionRepo.createTransaction({
        walletId: data.walletId,
        amount: data.amount,
        type: data.type,
        status: TransactionStatus.COMPLETED,
        description: data.description,
        referenceId: data.referenceId
      });
      logger.info('Transaction created', { transactionId: newTransaction.id, walletId: data.walletId });
      return { success: true, transaction: newTransaction };
    } catch (error) {
      logger.error('Error creating transaction', { error });
      return { success: false, error: 'Failed to create transaction' };
    }
  }

  static async getTransactionHistory(walletId: string): Promise<{ 
    success: boolean; 
    transactions?: Transaction[]; 
    error?: string 
  }> {
    try {
      const transactions = await transactionRepo.getTransactionsByWalletId(walletId);
      return { success: true, transactions };
    } catch (error) {
      logger.error('Error retrieving transaction history', { error });
      return { success: false, error: 'Failed to retrieve transaction history' };
    }
  }

  static async getTransactionById(transactionId: string): Promise<{ 
    success: boolean; 
    transaction?: Transaction; 
    error?: string 
  }> {
    try {
      const transaction = await transactionRepo.getTransactionById(transactionId);
      if (!transaction) return { success: false, error: 'Transaction not found' };
      return { success: true, transaction };
    } catch (error) {
      logger.error('Error retrieving transaction', { error });
      return { success: false, error: 'Failed to retrieve transaction' };
    }
  }
}