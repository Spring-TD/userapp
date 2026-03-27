import mongoose, { Schema, Document, Model } from 'mongoose';
import { Wallet, MerchantWallet, UserWallet, WalletStatus } from './Wallet';

export interface IWalletDocument extends Omit<Wallet, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const WalletSchema = new Schema<any>(
  {
    walletType: { type: String, enum: ['MERCHANT', 'USER'], required: true },
    merchantId: { type: String, required: true },
    appId: { type: String, required: false },
    merchantWalletType: { type: String, enum: ['TREASURY', 'OPERATION', 'KYC'], required: false },
    userId: { type: String, required: false },
    name: { type: String, required: true },
    mainBalance: { type: Number, required: true, default: 0 },
    ledgerBalance: { type: Number, required: true, default: 0 },
    currency: { type: String, required: true },
    status: { type: String, enum: Object.values(WalletStatus), default: WalletStatus.ACTIVE }
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
  if (raw.walletType === 'MERCHANT') {
    return {
      ...base,
      walletType: 'MERCHANT',
      merchantId: raw.merchantId as string,
      appId: raw.appId as string | undefined,
      merchantWalletType: raw.merchantWalletType as string,
      name: raw.name as string
    } as MerchantWallet;
  }
  return {
    ...base,
    walletType: 'USER',
    userId: raw.userId as string,
    merchantId: raw.merchantId as string,
    name: raw.name as string
  } as UserWallet;
}

export { toWallet };
