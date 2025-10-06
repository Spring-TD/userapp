export interface BaseWallet {
  id: string;
  balance: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  status: WalletStatus;
}

export interface MerchantWallet extends BaseWallet {
  merchantId: string;
  walletType: 'MERCHANT';
  name: string;
}

export interface UserWallet extends BaseWallet {
  userId: string;
  merchantId: string;
  walletType: 'USER';
  name: string;
}

export type Wallet = MerchantWallet | UserWallet;

export interface Transaction {
  id: string;
  walletId: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  referenceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

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