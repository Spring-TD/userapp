import mongoose from 'mongoose';
import WalletModel from './WalletModel';
import TransactionModel from './TransactionModel';
import {
  Wallet,
  MerchantWallet,
  UserWallet,
  Transaction,
  MerchantWalletType,
  TransactionType,
  TransactionStatus
} from '../models/Wallet';

function docToWallet(doc: mongoose.Document | null): Wallet | null {
  if (!doc) return null;
  const o = doc.toObject() as Record<string, unknown> & {
    _id: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
  };
  const { _id, __v, createdAt, updatedAt, ...rest } = o;
  const base = {
    id: _id.toString(),
    ...rest,
    createdAt,
    updatedAt
  };
  if (o.walletType === 'MERCHANT') {
    return base as MerchantWallet;
  }
  return base as UserWallet;
}

function docToTransaction(doc: mongoose.Document | null): Transaction | null {
  if (!doc) return null;
  const o = doc.toObject() as Record<string, unknown> & {
    _id: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
  };
  const { _id, __v, createdAt, updatedAt, ...rest } = o;
  return {
    id: _id.toString(),
    ...rest,
    createdAt,
    updatedAt
  } as Transaction;
}

export const db = {
  async createMerchantWallet(data: {
    merchantId: string;
    appId?: string;
    name: string;
    currency: string;
    merchantWalletType: MerchantWalletType;
  }): Promise<MerchantWallet> {
    const doc = await WalletModel.create({
      walletType: 'MERCHANT',
      merchantId: data.merchantId,
      appId: data.appId,
      merchantWalletType: data.merchantWalletType,
      name: data.name,
      balance: 0,
      mainBalance: 0,
      ledgerBalance: 0,
      currency: data.currency
    });
    return docToWallet(doc) as MerchantWallet;
  },

  async createUserWallet(data: {
    userId: string;
    merchantId: string;
    name: string;
    currency: string;
  }): Promise<UserWallet> {
    const doc = await WalletModel.create({
      walletType: 'USER',
      userId: data.userId,
      merchantId: data.merchantId,
      name: data.name,
      balance: 0,
      mainBalance: 0,
      ledgerBalance: 0,
      currency: data.currency
    });
    return docToWallet(doc) as UserWallet;
  },

  async getWalletById(walletId: string): Promise<Wallet | null> {
    if (!mongoose.Types.ObjectId.isValid(walletId)) return null;
    const doc = await WalletModel.findById(walletId);
    return docToWallet(doc);
  },

  async getMerchantWalletByType(
    merchantId: string,
    merchantWalletType: MerchantWalletType,
    appId?: string
  ): Promise<MerchantWallet | null> {
    const doc = await WalletModel.findOne({
      walletType: 'MERCHANT',
      merchantId,
      ...(appId ? { appId } : {}),
      merchantWalletType
    });
    return docToWallet(doc) as MerchantWallet | null;
  },

  async getAllMerchantWallets(merchantId: string, appId?: string): Promise<MerchantWallet[]> {
    const docs = await WalletModel.find({
      walletType: 'MERCHANT',
      merchantId,
      ...(appId ? { appId } : {})
    });
    return docs.map((d) => docToWallet(d) as MerchantWallet).filter(Boolean);
  },

  async getUserWallet(userId: string): Promise<UserWallet | null> {
    const doc = await WalletModel.findOne({ walletType: 'USER', userId });
    return docToWallet(doc) as UserWallet | null;
  },

  async getUserWalletsByMerchant(merchantId: string): Promise<UserWallet[]> {
    const docs = await WalletModel.find({ walletType: 'USER', merchantId });
    return docs.map((d) => docToWallet(d) as UserWallet).filter(Boolean);
  },

  async updateWalletBalance(
    walletId: string,
    updates: { mainBalance?: number; ledgerBalance?: number }
  ): Promise<Wallet | null> {
    if (!mongoose.Types.ObjectId.isValid(walletId)) return null;
    const doc = await WalletModel.findByIdAndUpdate(
      walletId,
      {
        $set: {
          ...updates,
          ...(updates.mainBalance !== undefined && { balance: updates.mainBalance })
        }
      },
      { new: true }
    );
    return docToWallet(doc);
  },

  async createTransaction(data: {
    walletId: string;
    amount: number;
    type: TransactionType;
    status: TransactionStatus;
    description: string;
    referenceId?: string;
    balanceBefore?: number;
    balanceAfter?: number;
  }): Promise<Transaction> {
    const doc = await TransactionModel.create(data);
    return docToTransaction(doc)!;
  },

  async getTransactionById(transactionId: string): Promise<Transaction | null> {
    if (!mongoose.Types.ObjectId.isValid(transactionId)) return null;
    const doc = await TransactionModel.findById(transactionId);
    return docToTransaction(doc);
  },

  async getTransactionsByWalletId(
    walletId: string,
    filter?: { startDate?: Date; endDate?: Date; type?: TransactionType }
  ): Promise<Transaction[]> {
    const query: Record<string, unknown> = { walletId };
    if (filter?.startDate || filter?.endDate) {
      query.createdAt = {};
      if (filter.startDate) (query.createdAt as Record<string, Date>).$gte = filter.startDate;
      if (filter.endDate) (query.createdAt as Record<string, Date>).$lte = filter.endDate;
    }
    if (filter?.type) query.type = filter.type;
    const docs = await TransactionModel.find(query).sort({ createdAt: -1 });
    return docs.map((d) => docToTransaction(d)!).filter(Boolean);
  }
};
