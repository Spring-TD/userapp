import mongoose, { Schema, Document } from 'mongoose';

export enum WalletStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    SUSPENDED = 'SUSPENDED'
}

export enum TransactionType {
    CREDIT = 'CREDIT',
    DEBIT = 'DEBIT'
}

export enum TransactionStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED'
}

export enum MerchantWalletType {
    TREASURY = 'TREASURY',
    OPERATION = 'OPERATION',
    KYC = 'KYC'
}

export interface IWallet extends Document {
    id: string; // Custom ID like wallet_... or generated
    userId?: string;
    merchantId?: string;
    walletType: 'MERCHANT' | 'USER';
    merchantWalletType?: MerchantWalletType;
    name: string;
    balance: number; // Alias for mainBalance
    mainBalance: number;
    ledgerBalance: number;
    currency: string;
    status: WalletStatus;
    createdAt: Date;
    updatedAt: Date;
}

const WalletSchema: Schema = new Schema({
    id: { type: String, unique: true }, // Custom ID field if we want to mimic the logic
    userId: { type: String }, // Reference ID (could be ObjectId if we link rigidly)
    merchantId: { type: String },
    walletType: { type: String, enum: ['MERCHANT', 'USER'], required: true },
    merchantWalletType: { type: String, enum: Object.values(MerchantWalletType) },
    name: { type: String, required: true },
    balance: { type: Number, default: 0 },
    mainBalance: { type: Number, default: 0 },
    ledgerBalance: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    status: { type: String, enum: Object.values(WalletStatus), default: WalletStatus.ACTIVE }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Helper index for faster queries
WalletSchema.index({ userId: 1 });
WalletSchema.index({ merchantId: 1 });

export const Wallet = mongoose.model<IWallet>('Wallet', WalletSchema);

export interface ITransaction extends Document {
    id: string; // Custom txn_... ID
    walletId: string;
    amount: number;
    type: TransactionType;
    status: TransactionStatus;
    description: string;
    referenceId?: string;
    balanceBefore?: number;
    balanceAfter?: number;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

const TransactionSchema: Schema = new Schema({
    id: { type: String, unique: true },
    walletId: { type: String, required: true, index: true }, // Linking to custom ID or _id
    amount: { type: Number, required: true },
    type: { type: String, enum: Object.values(TransactionType), required: true },
    status: { type: String, enum: Object.values(TransactionStatus), default: TransactionStatus.PENDING },
    description: { type: String },
    referenceId: { type: String },
    balanceBefore: { type: Number },
    balanceAfter: { type: Number },
    metadata: { type: Schema.Types.Mixed }
}, {
    timestamps: true
});

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);
