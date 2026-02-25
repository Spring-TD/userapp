import { Transaction, TransactionType, TransactionStatus } from '../models/Wallet';
import { TransactionModel, toTransaction } from '../models/TransactionModel';
import type { ITransactionDocument } from '../models/TransactionModel';

export interface FilterTransactionData {
  startDate?: Date;
  endDate?: Date;
  type?: TransactionType;
}

export async function createTransaction(data: {
  walletId: string;
  amount: number;
  type: TransactionType;
  status?: TransactionStatus;
  description: string;
  referenceId?: string;
  balanceBefore?: number;
  balanceAfter?: number;
}): Promise<Transaction> {
  const created = await TransactionModel.create({
    ...data,
    status: data.status ?? TransactionStatus.PENDING
  });
  return toTransaction(created as ITransactionDocument);
}

export async function getTransactionById(transactionId: string): Promise<Transaction | null> {
  const doc = await TransactionModel.findById(transactionId).lean();
  if (!doc) return null;
  return toTransaction(doc as ITransactionDocument);
}

export async function getTransactionsByWalletId(walletId: string): Promise<Transaction[]> {
  const docs = await TransactionModel.find({ walletId }).sort({ createdAt: -1 }).lean();
  return docs.map((d) => toTransaction(d as ITransactionDocument));
}

export async function filterTransactions(
  walletId: string,
  filter: FilterTransactionData
): Promise<Transaction[]> {
  const query: Record<string, unknown> = { walletId };
  if (filter.startDate || filter.endDate) {
    query.createdAt = {};
    if (filter.startDate) (query.createdAt as Record<string, Date>).$gte = filter.startDate;
    if (filter.endDate) (query.createdAt as Record<string, Date>).$lte = filter.endDate;
  }
  if (filter.type) query.type = filter.type;
  const docs = await TransactionModel.find(query).sort({ createdAt: -1 }).lean();
  return docs.map((d) => toTransaction(d as ITransactionDocument));
}
