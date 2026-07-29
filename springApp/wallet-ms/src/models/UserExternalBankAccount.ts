export type UserExternalBankAccountStatus = 'active' | 'deleted';

export interface UserExternalBankAccount {
  id: string;
  userId: string;
  accountNumber: string;
  bankCode: string;
  bankName?: string;
  accountName: string;
  label?: string;
  currency: string;
  isDefault: boolean;
  status: UserExternalBankAccountStatus;
  verifiedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
