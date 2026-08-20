import mongoose, { Document, Schema } from 'mongoose';
import { WalletStatus, MerchantWalletType } from '../models/Wallet';

export interface IWalletDoc extends Document {
  _id: mongoose.Types.ObjectId;
  walletType: 'MERCHANT' | 'USER';
  merchantId?: string;
  complianceShareholderUserId?: string;
  appId?: string;
  appName?: string;
  payonusSubaccountCode?: string;
  userId?: string;
  walletPurpose?: 'PRIMARY' | 'PRODUCT';
  productApplicationId?: string;
  productId?: string;
  productType?: string;
  merchantWalletType?: string;
  name: string;
  balance: number;
  mainBalance: number;
  ledgerBalance: number;
  currency: string;
  status: string;
  payonusNubanAccountNumber?: string;
  payonusNubanBankName?: string;
  payonusNubanBankCode?: string;
  payonusNubanProviderReference?: string;
  payonusNubanAccountType?: string;
  payonusNubanProvisionStatus?: string;
  payonusNubanProvisionError?: string;
  payonusNubanProvisionedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema = new Schema<IWalletDoc>(
  {
    walletType: { type: String, required: true, enum: ['MERCHANT', 'USER'] },
    merchantId: { type: String },
    complianceShareholderUserId: { type: String, required: false },
    appId: { type: String },
    appName: { type: String, required: false },
    payonusSubaccountCode: { type: String, required: false },
    userId: { type: String },
    walletPurpose: { type: String, enum: ['PRIMARY', 'PRODUCT'], default: 'PRIMARY' },
    productApplicationId: { type: String, required: false },
    productId: { type: String, required: false },
    productType: { type: String, required: false },
    merchantWalletType: {
      type: String,
      // Legacy stored values: TREASURY, OPERATION (-> BILLING), SETTLEMENT (-> REPAYMENT)
      enum: [...Object.values(MerchantWalletType), 'TREASURY', 'OPERATION', 'SETTLEMENT']
    },
    name: { type: String, required: true },
    balance: { type: Number, required: true, default: 0 },
    mainBalance: { type: Number, required: true, default: 0 },
    ledgerBalance: { type: Number, required: true, default: 0 },
    currency: { type: String, required: true, default: 'NGN' },
    status: { type: String, required: true, enum: Object.values(WalletStatus), default: WalletStatus.ACTIVE },
    payonusNubanAccountNumber: { type: String, required: false },
    payonusNubanBankName: { type: String, required: false },
    payonusNubanBankCode: { type: String, required: false },
    payonusNubanProviderReference: { type: String, required: false },
    payonusNubanAccountType: { type: String, enum: ['static', 'reserved', 'dynamic'], required: false },
    payonusNubanProvisionStatus: { type: String, enum: ['active', 'failed'], required: false },
    payonusNubanProvisionError: { type: String, required: false },
    payonusNubanProvisionedAt: { type: Date, required: false }
  },
  { timestamps: true }
);

/**
 * Uniqueness for billing / settlement / KYC merchant wallets per (merchant, app, type).
 * MUST be partial so USER wallets (same merchantId, null appId, null merchantWalletType) are excluded —
 * otherwise only one retail user wallet per merchant would be allowed.
 */
WalletSchema.index(
  { merchantId: 1, appId: 1, merchantWalletType: 1 },
  { unique: true, partialFilterExpression: { walletType: 'MERCHANT' } }
);
WalletSchema.index(
  { userId: 1, walletPurpose: 1 },
  {
    unique: true,
    partialFilterExpression: {
      walletType: 'USER',
      walletPurpose: 'PRIMARY'
    }
  }
);
WalletSchema.index(
  { userId: 1, productApplicationId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      walletType: 'USER',
      walletPurpose: 'PRODUCT'
    }
  }
);
WalletSchema.index({ payonusNubanAccountNumber: 1 }, { sparse: true });

export default mongoose.model<IWalletDoc>('Wallet', WalletSchema);
