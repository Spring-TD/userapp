import mongoose from 'mongoose';
import WalletModel from './WalletModel';
import TransactionModel from './TransactionModel';
import UserExternalBankAccountModel from './UserExternalBankAccountModel';
import type { UserExternalBankAccount } from '../models/UserExternalBankAccount';
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
import {
  merchantWalletTypesForLookup,
  normalizeMerchantWalletType
} from '../utils/merchantWalletType';
import { emitTransactionCreated } from '../events/transactionEvents';

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
    walletPurpose: ((rest.walletPurpose as string | undefined) ?? 'PRIMARY') as UserWallet['walletPurpose'],
    productApplicationId: rest.productApplicationId as string | undefined,
    productId: rest.productId as string | undefined,
    productType: rest.productType as string | undefined,
    appId: rest.appId as string | undefined,
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
  const senderDetails = extractSenderDetails(rest.metadata);
  return {
    id: _id.toString(),
    ...rest,
    ...(senderDetails ? { senderDetails } : {}),
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

function docToUserExternalBankAccount(doc: mongoose.Document | null): UserExternalBankAccount | null {
  if (!doc) return null;
  const o = doc.toObject() as IUserExternalBankAccountLean;
  return {
    id: o._id.toString(),
    userId: o.userId,
    accountNumber: o.accountNumber,
    bankCode: o.bankCode,
    bankName: o.bankName || undefined,
    accountName: o.accountName,
    label: o.label || undefined,
    currency: o.currency,
    isDefault: o.isDefault,
    status: o.status,
    verifiedAt: o.verifiedAt,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt
  };
}

interface IUserExternalBankAccountLean {
  _id: mongoose.Types.ObjectId;
  userId: string;
  accountNumber: string;
  bankCode: string;
  bankName?: string;
  accountName: string;
  label?: string;
  currency: string;
  isDefault: boolean;
  status: 'active' | 'deleted';
  verifiedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export async function ensureWalletIndexes(): Promise<void> {
  try {
    const indexes = await WalletModel.collection.indexes();
    const legacyUserIdIndex = indexes.find((index) => index.name === 'userId_1' && index.unique);
    if (legacyUserIdIndex) {
      await WalletModel.collection.dropIndex('userId_1');
    }
    await WalletModel.createIndexes();
    await UserExternalBankAccountModel.createIndexes();
  } catch (error) {
    console.warn('Wallet index migration skipped or failed:', error instanceof Error ? error.message : error);
  }
}

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
    walletPurpose?: UserWallet['walletPurpose'];
    productApplicationId?: string;
    productId?: string;
    productType?: string;
    appId?: string;
    name: string;
    currency: string;
  }): Promise<UserWallet> {
    const doc = await WalletModel.create({
      walletType: 'USER',
      userId: data.userId,
      merchantId: data.merchantId,
      ...(data.complianceShareholderUserId ? { complianceShareholderUserId: data.complianceShareholderUserId } : {}),
      walletPurpose: data.walletPurpose ?? 'PRIMARY',
      ...(data.productApplicationId ? { productApplicationId: data.productApplicationId } : {}),
      ...(data.productId ? { productId: data.productId } : {}),
      ...(data.productType ? { productType: data.productType } : {}),
      ...(data.appId ? { appId: data.appId } : {}),
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
    const baseFilter = {
      walletType: 'MERCHANT',
      merchantId,
      ...(appId ? { appId } : {})
    } as const;

    const doc: any = await WalletModel.findOne({
      ...baseFilter,
      merchantWalletType: { $in: merchantWalletTypesForLookup(merchantWalletType) as string[] }
    });

    // Lazily migrate unambiguous stored names (OPERATION / SETTLEMENT).
    const storedType = (doc as unknown as { merchantWalletType?: string } | null)?.merchantWalletType;
    const normalizedStoredType = normalizeMerchantWalletType(storedType);
    if (doc && storedType && normalizedStoredType && storedType !== normalizedStoredType) {
      doc.set('merchantWalletType', normalizedStoredType);
      await doc.save();
    }
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
    const doc = await WalletModel.findOne({
      walletType: 'USER',
      userId,
      $or: [{ walletPurpose: 'PRIMARY' }, { walletPurpose: { $exists: false } }]
    });
    return docToWallet(doc) as UserWallet | null;
  },

  async getUserWalletForMerchant(userId: string, merchantId: string): Promise<UserWallet | null> {
    const doc = await WalletModel.findOne({
      walletType: 'USER',
      userId,
      merchantId,
      $or: [{ walletPurpose: 'PRIMARY' }, { walletPurpose: { $exists: false } }]
    });
    return docToWallet(doc) as UserWallet | null;
  },

  async getProductUserWallet(userId: string, productApplicationId: string): Promise<UserWallet | null> {
    const doc = await WalletModel.findOne({
      walletType: 'USER',
      userId,
      walletPurpose: 'PRODUCT',
      productApplicationId
    });
    return docToWallet(doc) as UserWallet | null;
  },

  async findUserWalletWithActivePayonusAccount(userId: string, merchantId?: string): Promise<UserWallet | null> {
    const doc = await WalletModel.findOne({
      walletType: 'USER',
      userId,
      ...(merchantId ? { merchantId } : {}),
      payonusNubanProvisionStatus: 'active',
      payonusNubanAccountNumber: { $exists: true, $ne: '' }
    }).sort({ walletPurpose: 1, createdAt: 1 });
    return docToWallet(doc) as UserWallet | null;
  },

  async getUserWalletsByMerchant(merchantId: string): Promise<UserWallet[]> {
    const docs = await WalletModel.find({ walletType: 'USER', merchantId });
    return docs.map((d) => docToWallet(d) as UserWallet).filter(Boolean);
  },

  async getUserWalletsByUserId(userId: string): Promise<UserWallet[]> {
    const docs = await WalletModel.find({ walletType: 'USER', userId }).sort({ createdAt: 1 });
    return docs.map((d) => docToWallet(d) as UserWallet).filter(Boolean);
  },

  /**
   * Resolve the storefront appId for a retail user from their existing wallets.
   * Legacy PRIMARY wallets created before app scoping (and PayOnUs funding
   * callbacks) often omit `appId`, but the same user's PRODUCT wallets carry it.
   * A retail user belongs to exactly one storefront app, so any wallet with an
   * appId is authoritative for that user.
   */
  async getAppIdForUser(userId: string, merchantId?: string): Promise<string | null> {
    if (!userId) return null;
    const doc = await WalletModel.findOne({
      walletType: 'USER',
      userId,
      ...(merchantId ? { merchantId } : {}),
      appId: { $exists: true, $nin: [null, ''] }
    }).sort({ createdAt: 1 });
    const appId = (doc?.appId || '').trim();
    return appId ? appId : null;
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
    category?: string;
    source?: string;
    metadata?: Record<string, unknown>;
    tags?: string[];
    externalReference?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<Transaction> {
    const doc = await TransactionModel.create(data);
    // #region agent log
    try { console.log('DEBUG-AADE8C ' + JSON.stringify({ hypothesisId: 'H1', location: 'wallet-ms/db/database.ts:396', message: 'store-A transaction written (wallet-ms ledger)', data: { walletId: data.walletId, type: data.type, amount: data.amount, category: data.category, source: data.source } })); } catch (_e) {}
    // #endregion
    const transaction = docToTransaction(doc)!;
    // Fire-and-forget: mirror to merchant Transactions tab + issue receipt/notification.
    emitTransactionCreated(transaction);
    return transaction;
  },

  async getTransactionById(transactionId: string): Promise<Transaction | null> {
    if (!mongoose.Types.ObjectId.isValid(transactionId)) return null;
    const doc = await TransactionModel.findById(transactionId);
    return docToTransaction(doc);
  },

  async findCompletedTransactionByReference(
    walletId: string,
    referenceId: string
  ): Promise<Transaction | null> {
    const trimmed = referenceId.trim();
    if (!trimmed) return null;
    const doc = await TransactionModel.findOne({
      walletId,
      referenceId: trimmed,
      status: TransactionStatus.COMPLETED
    });
    return docToTransaction(doc);
  },

  async findTransactionByExternalReferenceAndSource(
    externalReference: string,
    source: string
  ): Promise<Transaction | null> {
    const ref = externalReference.trim();
    const src = source.trim();
    if (!ref || !src) return null;
    const doc = await TransactionModel.findOne({ externalReference: ref, source: src });
    return docToTransaction(doc);
  },

  async findTransactionByReferenceAndSource(
    referenceId: string,
    source: string
  ): Promise<Transaction | null> {
    const ref = referenceId.trim();
    const src = source.trim();
    if (!ref || !src) return null;
    const doc = await TransactionModel.findOne({ referenceId: ref, source: src });
    return docToTransaction(doc);
  },

  async updateTransaction(
    transactionId: string,
    updates: { status?: TransactionStatus; metadata?: Record<string, unknown>; externalReference?: string }
  ): Promise<Transaction | null> {
    if (!mongoose.Types.ObjectId.isValid(transactionId)) return null;
    const $set: Record<string, unknown> = {};
    if (updates.status) $set.status = updates.status;
    if (updates.metadata) $set.metadata = updates.metadata;
    if (updates.externalReference) $set.externalReference = updates.externalReference;
    if (!Object.keys($set).length) return this.getTransactionById(transactionId);
    const doc = await TransactionModel.findByIdAndUpdate(transactionId, { $set }, { new: true });
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
  },

  async countActiveUserExternalBankAccounts(userId: string): Promise<number> {
    return UserExternalBankAccountModel.countDocuments({ userId, status: 'active' });
  },

  async listActiveUserExternalBankAccounts(userId: string): Promise<UserExternalBankAccount[]> {
    const docs = await UserExternalBankAccountModel.find({ userId, status: 'active' }).sort({
      isDefault: -1,
      createdAt: 1
    });
    return docs.map((d) => docToUserExternalBankAccount(d)!).filter(Boolean);
  },

  async getActiveUserExternalBankAccount(
    userId: string,
    accountId: string
  ): Promise<UserExternalBankAccount | null> {
    if (!mongoose.Types.ObjectId.isValid(accountId)) return null;
    const doc = await UserExternalBankAccountModel.findOne({
      _id: accountId,
      userId,
      status: 'active'
    });
    return docToUserExternalBankAccount(doc);
  },

  async createUserExternalBankAccount(data: {
    userId: string;
    accountNumber: string;
    bankCode: string;
    bankName?: string;
    accountName: string;
    label?: string;
    currency: string;
    isDefault: boolean;
    verifiedAt: Date;
  }): Promise<UserExternalBankAccount> {
    const doc = await UserExternalBankAccountModel.create({
      userId: data.userId,
      accountNumber: data.accountNumber,
      bankCode: data.bankCode,
      bankName: data.bankName,
      accountName: data.accountName,
      label: data.label,
      currency: data.currency,
      isDefault: data.isDefault,
      status: 'active',
      verifiedAt: data.verifiedAt
    });
    return docToUserExternalBankAccount(doc)!;
  },

  async clearDefaultUserExternalBankAccounts(userId: string): Promise<void> {
    await UserExternalBankAccountModel.updateMany(
      { userId, status: 'active', isDefault: true },
      { $set: { isDefault: false } }
    );
  },

  async setDefaultUserExternalBankAccount(userId: string, accountId: string): Promise<UserExternalBankAccount | null> {
    if (!mongoose.Types.ObjectId.isValid(accountId)) return null;
    await this.clearDefaultUserExternalBankAccounts(userId);
    const doc = await UserExternalBankAccountModel.findOneAndUpdate(
      { _id: accountId, userId, status: 'active' },
      { $set: { isDefault: true } },
      { new: true }
    );
    return docToUserExternalBankAccount(doc);
  },

  async softDeleteUserExternalBankAccount(userId: string, accountId: string): Promise<UserExternalBankAccount | null> {
    if (!mongoose.Types.ObjectId.isValid(accountId)) return null;
    const doc = await UserExternalBankAccountModel.findOneAndUpdate(
      { _id: accountId, userId, status: 'active' },
      { $set: { status: 'deleted', isDefault: false } },
      { new: true }
    );
    return docToUserExternalBankAccount(doc);
  },

  async promoteFirstActiveUserExternalBankAccountAsDefault(userId: string): Promise<void> {
    const first = await UserExternalBankAccountModel.findOne({ userId, status: 'active' }).sort({ createdAt: 1 });
    if (!first) return;
    await UserExternalBankAccountModel.updateMany(
      { userId, status: 'active', isDefault: true },
      { $set: { isDefault: false } }
    );
    first.isDefault = true;
    await first.save();
  }
};
