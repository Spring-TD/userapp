import { Wallet, MerchantWallet, UserWallet, MerchantWalletType } from '../models/Wallet';
import { WalletModel, toWallet } from '../models/WalletModel';
import type { IWalletDocument } from '../models/WalletModel';

export async function createWallet(doc: {
  walletType: 'MERCHANT' | 'USER';
  merchantId: string;
  name: string;
  currency: string;
  merchantWalletType?: MerchantWalletType;
  userId?: string;
}): Promise<Wallet> {
  const created = await WalletModel.create({
    walletType: doc.walletType,
    merchantId: doc.merchantId,
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

export async function getMerchantWalletByType(
  merchantId: string,
  walletType: MerchantWalletType
): Promise<MerchantWallet | null> {
  const doc = await WalletModel.findOne({
    walletType: 'MERCHANT',
    merchantId,
    merchantWalletType: walletType
  }).lean();
  if (!doc) return null;
  return toWallet(doc as IWalletDocument) as MerchantWallet;
}

export async function getAllMerchantWallets(merchantId: string): Promise<MerchantWallet[]> {
  const docs = await WalletModel.find({ walletType: 'MERCHANT', merchantId }).lean();
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
