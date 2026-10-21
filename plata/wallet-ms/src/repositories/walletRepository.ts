import { Wallet, MerchantWallet, UserWallet, MerchantWalletType } from '../models/Wallet';
import { WalletModel, toWallet } from '../models/WalletModel';
import type { IWalletDocument } from '../models/WalletModel';

export async function createWallet(doc: {
  walletType: 'MERCHANT' | 'USER';
  merchantId: string;
  complianceShareholderUserId?: string;
  appId?: string;
  appName?: string;
  payonusSubaccountCode?: string;
  name: string;
  currency: string;
  merchantWalletType?: MerchantWalletType;
  userId?: string;
}): Promise<Wallet> {
  const created = await WalletModel.create({
    walletType: doc.walletType,
    merchantId: doc.merchantId,
    ...(doc.complianceShareholderUserId ? { complianceShareholderUserId: doc.complianceShareholderUserId } : {}),
    ...(doc.walletType === 'MERCHANT' && doc.appId ? { appId: doc.appId } : {}),
    ...(doc.walletType === 'MERCHANT' && doc.appName ? { appName: doc.appName } : {}),
    ...(doc.walletType === 'MERCHANT' && doc.payonusSubaccountCode
      ? { payonusSubaccountCode: doc.payonusSubaccountCode }
      : {}),
    name: doc.name,
    currency: doc.currency,
    mainBalance: 0,
    ledgerBalance: 0,
    ...(doc.walletType === 'MERCHANT' && { merchantWalletType: doc.merchantWalletType }),
    ...(doc.walletType === 'USER' && { userId: doc.userId })
  });
  return toWallet(created as IWalletDocument);
}

export async function getWalletById(walletId: string): Promise<Wallet | null> {
  const doc = await WalletModel.findById(walletId).lean();
  if (!doc) return null;
  return toWallet(doc as IWalletDocument);
}

export async function getWalletByPayonusAccountNumber(accountNumber: string): Promise<Wallet | null> {
  const doc = await WalletModel.findOne({ payonusNubanAccountNumber: accountNumber }).lean();
  if (!doc) return null;
  return toWallet(doc as IWalletDocument);
}

export async function getMerchantWalletByType(
  merchantId: string,
  walletType: MerchantWalletType,
  appId?: string
): Promise<MerchantWallet | null> {
  const query: Record<string, unknown> = {
    walletType: 'MERCHANT',
    merchantId,
    merchantWalletType: walletType
  };
  if (appId) {
    query.appId = appId;
  }
  const doc = await WalletModel.findOne(query).lean();
  if (!doc) return null;
  return toWallet(doc as IWalletDocument) as MerchantWallet;
}

export async function getAllMerchantWallets(merchantId: string, appId?: string): Promise<MerchantWallet[]> {
  const query: Record<string, unknown> = { walletType: 'MERCHANT', merchantId };
  if (appId) {
    query.appId = appId;
  }
  const docs = await WalletModel.find(query).lean();
  return docs.map((d) => toWallet(d as IWalletDocument) as MerchantWallet);
}

export async function getUserWallet(userId: string): Promise<UserWallet | null> {
  const doc = await WalletModel.findOne({ walletType: 'USER', userId }).lean();
  if (!doc) return null;
  return toWallet(doc as IWalletDocument) as UserWallet;
}

export async function getUserWalletsByMerchant(merchantId: string): Promise<UserWallet[]> {
  const docs = await WalletModel.find({ walletType: 'USER', merchantId }).lean();
  return docs.map((d) => toWallet(d as IWalletDocument) as UserWallet);
}

export async function updateWallet(
  walletId: string,
  updates: { mainBalance?: number; ledgerBalance?: number; updatedAt?: Date }
): Promise<Wallet | null> {
  const doc = await WalletModel.findByIdAndUpdate(
    walletId,
    { $set: updates },
    { new: true }
  ).lean();
  if (!doc) return null;
  return toWallet(doc as IWalletDocument);
}

export async function findAllWallets(): Promise<Wallet[]> {
  const docs = await WalletModel.find({}).lean();
  return docs.map((d) => toWallet(d as IWalletDocument));
}

export type PayonusNubanPatchFields = {
  payonusNubanAccountNumber?: string;
  payonusNubanBankName?: string;
  payonusNubanBankCode?: string;
  payonusNubanProviderReference?: string;
  payonusNubanAccountType?: 'static' | 'reserved' | 'dynamic';
  payonusNubanProvisionStatus?: 'active' | 'failed';
  /** Pass `null` to clear a previous error after a successful reprovision */
  payonusNubanProvisionError?: string | null;
  payonusNubanProvisionedAt?: Date | null;
  nubanProvider?: 'payonus' | 'legerblock' | null;
  legerblockUserRef?: string | null;
  legerblockWalletId?: string | null;
};

export async function patchWalletPayonusNuban(
  walletId: string,
  patch: PayonusNubanPatchFields
): Promise<Wallet | null> {
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
    const doc = await WalletModel.findById(walletId).lean();
    return doc ? toWallet(doc as IWalletDocument) : null;
  }

  const doc = await WalletModel.findByIdAndUpdate(walletId, op, { new: true }).lean();
  if (!doc) return null;
  return toWallet(doc as IWalletDocument);
}
