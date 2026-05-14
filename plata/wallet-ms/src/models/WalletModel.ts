import mongoose, { Schema, Document, Model } from 'mongoose';
import {
  Wallet,
  MerchantWallet,
  UserWallet,
  WalletStatus,
  VirtualNubanDetails,
  VirtualNubanAccountType,
  VirtualNubanProvisionStatus
} from './Wallet';

export interface IWalletDocument extends Omit<Wallet, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const WalletSchema = new Schema<any>(
  {
    walletType: { type: String, enum: ['MERCHANT', 'USER'], required: true },
    merchantId: { type: String, required: true },
    complianceShareholderUserId: { type: String, required: false },
    appId: { type: String, required: false },
    appName: { type: String, required: false },
    payonusSubaccountCode: { type: String, required: false },
    merchantWalletType: { type: String, enum: ['TREASURY', 'OPERATION', 'KYC'], required: false },
    userId: { type: String, required: false },
    name: { type: String, required: true },
    mainBalance: { type: Number, required: true, default: 0 },
    ledgerBalance: { type: Number, required: true, default: 0 },
    currency: { type: String, required: true },
    status: { type: String, enum: Object.values(WalletStatus), default: WalletStatus.ACTIVE },
    payonusNubanAccountNumber: { type: String, required: false },
    payonusNubanBankName: { type: String, required: false },
    payonusNubanBankCode: { type: String, required: false },
    payonusNubanProviderReference: { type: String, required: false },
    payonusNubanAccountType: { type: String, enum: ['static', 'reserved', 'dynamic'], required: false },
    payonusNubanProvisionStatus: { type: String, enum: ['active', 'failed'], required: false },
    payonusNubanProvisionError: { type: String, required: false },
    payonusNubanProvisionedAt: { type: Date, required: false }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = ret._id?.toString();
        ret.balance = ret.mainBalance;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

WalletSchema.index({ walletType: 1, merchantId: 1, merchantWalletType: 1 }, { sparse: true });
WalletSchema.index({ walletType: 1, merchantId: 1, appId: 1, merchantWalletType: 1 }, { sparse: true });
WalletSchema.index({ walletType: 1, userId: 1 }, { sparse: true });
WalletSchema.index({ merchantId: 1 });

export const WalletModel: Model<IWalletDocument> = mongoose.models.Wallet ?? mongoose.model<IWalletDocument>('Wallet', WalletSchema);

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

function toWallet(doc: IWalletDocument | Record<string, unknown>): Wallet {
  const obj = typeof (doc as IWalletDocument).toObject === 'function'
    ? (doc as IWalletDocument).toObject()
    : { ...(doc as Record<string, unknown>) };
  const raw = obj as Record<string, unknown>;
  const id = (raw._id ?? (doc as IWalletDocument)._id)?.toString?.() ?? String(raw._id);
  const base = {
    id,
    balance: (raw.mainBalance as number) ?? 0,
    mainBalance: (raw.mainBalance as number) ?? 0,
    ledgerBalance: (raw.ledgerBalance as number) ?? 0,
    currency: raw.currency as string,
    status: (raw.status as WalletStatus) ?? 'ACTIVE',
    createdAt: raw.createdAt as Date,
    updatedAt: raw.updatedAt as Date
  };
  const virtualNuban = buildVirtualNuban(raw);
  if (raw.walletType === 'MERCHANT') {
    return {
      ...base,
      ...(virtualNuban ? { virtualNuban } : {}),
      walletType: 'MERCHANT',
      merchantId: raw.merchantId as string,
      complianceShareholderUserId: raw.complianceShareholderUserId as string | undefined,
      appId: raw.appId as string | undefined,
      appName: raw.appName as string | undefined,
      payonusSubaccountCode: raw.payonusSubaccountCode as string | undefined,
      merchantWalletType: raw.merchantWalletType as string,
      name: raw.name as string
    } as MerchantWallet;
  }
  return {
    ...base,
    ...(virtualNuban ? { virtualNuban } : {}),
    walletType: 'USER',
    userId: raw.userId as string,
    merchantId: raw.merchantId as string,
    complianceShareholderUserId: raw.complianceShareholderUserId as string | undefined,
    name: raw.name as string
  } as UserWallet;
}

export { toWallet };
