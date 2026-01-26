import { Transaction, TransactionQueryParams } from '../types/app';
import { ApiError } from '../middleware/errorHandler';

export class TransactionService {
  // In-memory storage for transactions (in a real implementation, this would be a database)
  private static transactions: Transaction[] = [];

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

    // Filter transactions by appId
    let filteredTransactions = this.transactions.filter(t => t.appId === appId);

    // Apply filters
    if (queryParams.type) {
      filteredTransactions = filteredTransactions.filter(t => t.type === queryParams.type);
    }

    if (queryParams.status) {
      filteredTransactions = filteredTransactions.filter(t => t.status === queryParams.status);
    }

    if (queryParams.startDate) {
      const startDate = new Date(queryParams.startDate);
      filteredTransactions = filteredTransactions.filter(t => new Date(t.createdAt) >= startDate);
    }

    if (queryParams.endDate) {
      const endDate = new Date(queryParams.endDate);
      filteredTransactions = filteredTransactions.filter(t => new Date(t.createdAt) <= endDate);
    }

    // Apply pagination
    if (queryParams.page && queryParams.limit) {
      const startIndex = (queryParams.page - 1) * queryParams.limit;
      const endIndex = startIndex + queryParams.limit;
      filteredTransactions = filteredTransactions.slice(startIndex, endIndex);
    }

    // Sort by createdAt descending (newest first)
    filteredTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return filteredTransactions;
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

    const transaction = this.transactions.find(t => t.id === transactionId);
    return transaction || null;
  }

  /**
   * Create a new transaction (for testing purposes)
   * @param transactionData The transaction data
   * @returns The created transaction
   */
  static async createTransaction(transactionData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    const newTransaction: Transaction = {
      id: this.generateId(),
      ...transactionData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.transactions.push(newTransaction);
    return newTransaction;
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

    const appTransactions = this.transactions.filter(t => t.appId === appId);
    
    const totalTransactions = appTransactions.length;
    const totalCreditAmount = appTransactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalDebitAmount = appTransactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const pendingTransactions = appTransactions.filter(t => t.status === 'pending').length;
    const completedTransactions = appTransactions.filter(t => t.status === 'completed').length;
    const failedTransactions = appTransactions.filter(t => t.status === 'failed').length;

    return {
      totalTransactions,
      totalCreditAmount,
      totalDebitAmount,
      pendingTransactions,
      completedTransactions,
      failedTransactions,
      netAmount: totalCreditAmount - totalDebitAmount
    };
  }

  /**
   * Generate a random ID (for testing purposes)
   * @returns A random ID string
   */
  private static generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}