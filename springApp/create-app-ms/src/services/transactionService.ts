import { Transaction, TransactionQueryParams } from '../types/app';
import { ApiError } from '../middleware/errorHandler';
import { TransactionMongoModel } from '../models/transaction.mongo';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return undefined;
}

function compactObject(input: Record<string, unknown>): Record<string, unknown> | undefined {
  const compacted = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
  return Object.keys(compacted).length ? compacted : undefined;
}

function extractSenderDetails(metadata: unknown): Transaction['senderDetails'] | undefined {
  const root = asRecord(metadata);
  const parties = asRecord(root.parties);
  const sender = asRecord(parties.sender);
  const decodedRawPayload = asRecord(root.decodedRawPayload);
  const decodedSender = asRecord(decodedRawPayload.senderDetails);
  const payonus = asRecord(root.payonus);
  const parsedPayload = asRecord(root.parsedPayload);

  return compactObject({
    name: firstString(sender.name, decodedSender.name, payonus.senderName, parsedPayload.senderName),
    accountNumber: firstString(
      sender.accountNumber,
      decodedSender.accountNumber,
      payonus.senderAccountNumber,
      parsedPayload.senderAccountNumber
    ),
    bankName: firstString(sender.bankName, decodedSender.bankName, payonus.senderBankName, parsedPayload.senderBankName),
    bankCode: firstString(sender.bankCode, decodedSender.bankCode, payonus.senderBankCode, parsedPayload.senderBankCode)
  }) as Transaction['senderDetails'] | undefined;
}

function withSenderDetails(transaction: Transaction): Transaction {
  const senderDetails = extractSenderDetails(transaction.metadata);
  return senderDetails ? { ...transaction, senderDetails } : transaction;
}

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

    if (queryParams.productId) {
      filter.productId = queryParams.productId;
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
    // #region agent log
    try { console.log('DEBUG-AADE8C ' + JSON.stringify({ hypothesisId: 'H3', location: 'create-app-ms/services/transactionService.ts:103', message: 'dashboard read getTransactionsByAppId', data: { appId, filterKeys: Object.keys(filter), resultCount: transactions.length } })); } catch (_e) {}
    // #endregion
    return transactions.map(t => withSenderDetails(t.toJSON() as unknown as Transaction));
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
    return transaction ? withSenderDetails(transaction.toJSON() as unknown as Transaction) : null;
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

    return withSenderDetails(newTransaction.toJSON() as unknown as Transaction);
  }

  static async createOrUpdateProviderTransaction(
    transactionData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Transaction> {
    if (!transactionData.appId) {
      throw new ApiError(400, 'App ID is required');
    }
    if (!transactionData.provider || !transactionData.providerReference) {
      return this.createTransaction(transactionData);
    }

    const now = new Date().toISOString();
    const transaction = await TransactionMongoModel.findOneAndUpdate(
      {
        appId: transactionData.appId,
        provider: transactionData.provider,
        providerReference: transactionData.providerReference
      },
      {
        $setOnInsert: {
          appId: transactionData.appId,
          userId: transactionData.userId,
          walletId: transactionData.walletId,
          productId: transactionData.productId,
          reference: transactionData.reference,
          metaRef: transactionData.metaRef,
          provider: transactionData.provider,
          providerReference: transactionData.providerReference,
          currency: transactionData.currency,
          createdAt: now
        },
        $set: {
          amount: transactionData.amount,
          type: transactionData.type,
          status: transactionData.status,
          description: transactionData.description,
          metadata: transactionData.metadata,
          updatedAt: now
        }
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    return withSenderDetails(transaction.toJSON() as unknown as Transaction);
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

  /**
   * Aggregates transaction volumes for an app + product (requires `productId` on stored transactions).
   */
  static async getProductTransactionOverview(
    appId: string,
    productId: string
  ): Promise<{
    completedVolume: number;
    completedCount: number;
    pendingVolume: number;
    pendingCount: number;
    failedCount: number;
  }> {
    if (!appId || !productId) {
      throw new ApiError(400, 'App ID and product ID are required');
    }

    const rows = await TransactionMongoModel.aggregate([
      { $match: { appId, productId } },
      {
        $group: {
          _id: null,
          completedVolume: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0]
            }
          },
          completedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          pendingVolume: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0]
            }
          },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          failedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          }
        }
      }
    ]);

    if (rows.length === 0) {
      return {
        completedVolume: 0,
        completedCount: 0,
        pendingVolume: 0,
        pendingCount: 0,
        failedCount: 0
      };
    }

    const r = rows[0];
    return {
      completedVolume: r.completedVolume,
      completedCount: r.completedCount,
      pendingVolume: r.pendingVolume,
      pendingCount: r.pendingCount,
      failedCount: r.failedCount
    };
  }
}