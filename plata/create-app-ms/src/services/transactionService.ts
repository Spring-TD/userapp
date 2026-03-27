import { Transaction, TransactionQueryParams } from '../types/app';
import { ApiError } from '../middleware/errorHandler';
import { TransactionMongoModel } from '../models/transaction.mongo';

export class TransactionService {
  /**
   * Get all transactions for an app with optional filtering and pagination
   * @param appId The ID of the app
   * @param queryParams Query parameters for filtering and pagination
   * @returns Array of transactions
   */
  static async getTransactionsByAppId(
    appId: string,
    queryParams: TransactionQueryParams = {}
  ): Promise<Transaction[]> {
    if (!appId) {
      throw new ApiError(400, 'App ID is required');
    }

    const filter: any = { appId };

    // Apply filters
    if (queryParams.type) {
      filter.type = queryParams.type;
    }

    if (queryParams.status) {
      filter.status = queryParams.status;
    }

    if (queryParams.startDate || queryParams.endDate) {
      filter.createdAt = {};
      if (queryParams.startDate) {
        filter.createdAt.$gte = new Date(queryParams.startDate).toISOString();
      }
      if (queryParams.endDate) {
        filter.createdAt.$lte = new Date(queryParams.endDate).toISOString();
      }
    }

    let query = TransactionMongoModel.find(filter);

    // Apply sorting (newest first)
    query = query.sort({ createdAt: -1 });

    // Apply pagination
    if (queryParams.page && queryParams.limit) {
      const skip = (queryParams.page - 1) * queryParams.limit;
      query = query.skip(skip).limit(queryParams.limit);
    }

    const transactions = await query.exec();
    return transactions.map(t => t.toJSON() as unknown as Transaction);
  }

  /**
   * Get a transaction by ID
   * @param transactionId The ID of the transaction
   * @returns The transaction or null if not found
   */
  static async getTransactionById(transactionId: string): Promise<Transaction | null> {
    if (!transactionId) {
      throw new ApiError(400, 'Transaction ID is required');
    }

    const transaction = await TransactionMongoModel.findById(transactionId);
    return transaction ? (transaction.toJSON() as unknown as Transaction) : null;
  }

  /**
   * Create a new transaction (for testing purposes)
   * @param transactionData The transaction data
   * @returns The created transaction
   */
  static async createTransaction(transactionData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    const newTransaction = await TransactionMongoModel.create({
      ...transactionData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return newTransaction.toJSON() as unknown as Transaction;
  }

  /**
   * Get transaction statistics for an app
   * @param appId The ID of the app
   * @returns Transaction statistics
   */
  static async getTransactionStats(appId: string): Promise<any> {
    if (!appId) {
      throw new ApiError(400, 'App ID is required');
    }

    // Using aggregation for better performance
    const stats = await TransactionMongoModel.aggregate([
      { $match: { appId } },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalCreditAmount: {
            $sum: {
              $cond: [{ $eq: ["$type", "credit"] }, "$amount", 0]
            }
          },
          totalDebitAmount: {
            $sum: {
              $cond: [{ $eq: ["$type", "debit"] }, "$amount", 0]
            }
          },
          pendingTransactions: {
            $sum: {
              $cond: [{ $eq: ["$status", "pending"] }, 1, 0]
            }
          },
          completedTransactions: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, 1, 0]
            }
          },
          failedTransactions: {
            $sum: {
              $cond: [{ $eq: ["$status", "failed"] }, 1, 0]
            }
          }
        }
      }
    ]);

    if (stats.length === 0) {
      return {
        totalTransactions: 0,
        totalCreditAmount: 0,
        totalDebitAmount: 0,
        pendingTransactions: 0,
        completedTransactions: 0,
        failedTransactions: 0,
        netAmount: 0
      };
    }

    const result = stats[0];
    return {
      totalTransactions: result.totalTransactions,
      totalCreditAmount: result.totalCreditAmount,
      totalDebitAmount: result.totalDebitAmount,
      pendingTransactions: result.pendingTransactions,
      completedTransactions: result.completedTransactions,
      failedTransactions: result.failedTransactions,
      netAmount: result.totalCreditAmount - result.totalDebitAmount
    };
  }
}