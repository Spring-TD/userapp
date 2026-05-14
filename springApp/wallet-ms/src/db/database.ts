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
  TransactionStatus,
  VirtualNubanDetails,
  VirtualNubanAccountType,
  VirtualNubanProvisionStatus
} from '../models/Wallet';

function buildVirtualNuban(raw: Record<string, unknown>): VirtualNubanDetails | undefined {
  const accountNumber = raw.payonusNubanAccountNumber as string | undefined;
  const provisionStatus = raw.payonusNubanProvisionStatus as VirtualNubanProvisionStatus | undefined;
  const accountType = raw.payonusNubanAccountType as VirtualNubanAccountType | undefined;
  if (!accountNumber && !provisionStatus) {
    return undefined;
  }
  return {
    accountType: (accountType as VirtualNubanAccountType | undefined) ?? 'static',
    provisionStatus:
      (provisionStatus as VirtualNubanProvisionStatus | undefined) ?? (accountNumber ? 'active' : 'failed'),
    accountNumber: accountNumber || undefined,
    bankName: (raw.payonusNubanBankName as string) || undefined,
    bankCode: (raw.payonusNubanBankCode as string) || undefined,
    providerReference: (raw.payonusNubanProviderReference as string) || undefined,
    provisionError: (raw.payonusNubanProvisionError as string) || undefined,
    provisionedAt: raw.payonusNubanProvisionedAt as Date | undefined
  };
}

function docToWallet(doc: mongoose.Document | null): Wallet | null {
  if (!doc) return null;
  const o = doc.toObject() as Record<string, unknown> & {
    _id: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
  };
  const virtualNuban = buildVirtualNuban(o);
  const {
    _id,
    __v,
    payonusNubanAccountNumber: _an,
    payonusNubanBankName: _bn,
    payonusNubanBankCode: _bc,
    payonusNubanProviderReference: _pr,
    payonusNubanAccountType: _at,
    payonusNubanProvisionStatus: _ps,
    payonusNubanProvisionError: _pe,
    payonusNubanProvisionedAt: _pa,
    ...rest
  } = o;

  const mainBalance = (rest.mainBalance as number) ?? 0;
  const ledgerBalance = (rest.ledgerBalance as number) ?? 0;
  const balance = (rest.balance as number) ?? mainBalance;

  const baseCommon = {
    id: _id.toString(),
    balance,
    mainBalance,
    ledgerBalance,
    currency: rest.currency as string,
    status: rest.status as Wallet['status'],
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    ...(virtualNuban ? { virtualNuban } : {})
  };

  if (o.walletType === 'MERCHANT') {
    return {
      ...baseCommon,
      walletType: 'MERCHANT',
      merchantId: rest.merchantId as string,
      complianceShareholderUserId: rest.complianceShareholderUserId as string | undefined,
      appId: rest.appId as string | undefined,
      appName: rest.appName as string | undefined,
      payonusSubaccountCode: rest.payonusSubaccountCode as string | undefined,
      merchantWalletType: rest.merchantWalletType as MerchantWalletType,
      name: rest.name as string
    } as MerchantWallet;
  }

  return {
    ...baseCommon,
    walletType: 'USER',
    userId: rest.userId as string,
    merchantId: rest.merchantId as string,
    complianceShareholderUserId: rest.complianceShareholderUserId as string | undefined,
    name: rest.name as string
  } as UserWallet;
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

export type PayonusNubanPatchFields = {
  payonusNubanAccountNumber?: string;
  payonusNubanBankName?: string;
  payonusNubanBankCode?: string;
  payonusNubanProviderReference?: string;
  payonusNubanAccountType?: 'static' | 'reserved' | 'dynamic';
  payonusNubanProvisionStatus?: 'active' | 'failed';
  payonusNubanProvisionError?: string | null;
  payonusNubanProvisionedAt?: Date | null;
};

export const db = {
  async createMerchantWallet(data: {
    merchantId: string;
    appId?: string;
    appName?: string;
    complianceShareholderUserId?: string;
    payonusSubaccountCode?: string;
    name: string;
    currency: string;
    merchantWalletType: MerchantWalletType;
  }): Promise<MerchantWallet> {
    const doc = await WalletModel.create({
      walletType: 'MERCHANT',
      merchantId: data.merchantId,
      ...(data.complianceShareholderUserId ? { complianceShareholderUserId: data.complianceShareholderUserId } : {}),
      appId: data.appId,
      ...(data.appName ? { appName: data.appName } : {}),
      ...(data.payonusSubaccountCode ? { payonusSubaccountCode: data.payonusSubaccountCode } : {}),
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
    complianceShareholderUserId?: string;
    name: string;
    currency: string;
  }): Promise<UserWallet> {
    const doc = await WalletModel.create({
      walletType: 'USER',
      userId: data.userId,
      merchantId: data.merchantId,
      ...(data.complianceShareholderUserId ? { complianceShareholderUserId: data.complianceShareholderUserId } : {}),
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

  async getWalletByPayonusAccountNumber(accountNumber: string): Promise<Wallet | null> {
    const trimmed = accountNumber.trim();
    if (!trimmed) return null;
    const doc = await WalletModel.findOne({ payonusNubanAccountNumber: trimmed });
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

  async patchWalletPayonusNuban(walletId: string, patch: PayonusNubanPatchFields): Promise<Wallet | null> {
    if (!mongoose.Types.ObjectId.isValid(walletId)) return null;
    const $set: Record<string, unknown> = {};
    const $unset: Record<string, string> = {};

    (Object.entries(patch) as [keyof PayonusNubanPatchFields, PayonusNubanPatchFields[keyof PayonusNubanPatchFields]][]).forEach(
      ([key, val]) => {
        if (val === null) {
          $unset[String(key)] = '';
        } else if (val !== undefined) {
          $set[String(key)] = val;
        }
      }
    );

    const op: Record<string, unknown> = {};
    if (Object.keys($set).length) op.$set = $set;
    if (Object.keys($unset).length) op.$unset = $unset;
    if (!Object.keys(op).length) {
      const doc = await WalletModel.findById(walletId);
      return docToWallet(doc);
    }

    const doc = await WalletModel.findByIdAndUpdate(walletId, op, { new: true });
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
