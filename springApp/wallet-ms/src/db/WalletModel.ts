import mongoose, { Document, Schema } from 'mongoose';
import { WalletStatus, MerchantWalletType } from '../models/Wallet';

export interface IWalletDoc extends Document {
  _id: mongoose.Types.ObjectId;
  walletType: 'MERCHANT' | 'USER';
  merchantId?: string;
  userId?: string;
  merchantWalletType?: string;
  name: string;
  balance: number;
  mainBalance: number;
  ledgerBalance: number;
  currency: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema = new Schema<IWalletDoc>(
  {
    walletType: { type: String, required: true, enum: ['MERCHANT', 'USER'] },
    merchantId: { type: String },
    userId: { type: String },
    merchantWalletType: { type: String, enum: Object.values(MerchantWalletType) },
    name: { type: String, required: true },
    balance: { type: Number, required: true, default: 0 },
    mainBalance: { type: Number, required: true, default: 0 },
    ledgerBalance: { type: Number, required: true, default: 0 },
    currency: { type: String, required: true, default: 'USD' },
    status: { type: String, required: true, enum: Object.values(WalletStatus), default: WalletStatus.ACTIVE }
  },
  { timestamps: true }
);

WalletSchema.index({ merchantId: 1, merchantWalletType: 1 }, { unique: true, sparse: true });
WalletSchema.index({ userId: 1 }, { unique: true, sparse: true });

export default mongoose.model<IWalletDoc>('Wallet', WalletSchema);
