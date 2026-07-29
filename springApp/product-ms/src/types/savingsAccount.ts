export interface CreateSavingsAccountRequest {
  userId: string;
  productId: string;
  currency: string;
  email?: string;
  appId?: string;
  /** Storefront / sub-merchant presenting the product (offeringMerchantId on Plata). */
  merchantId?: string;
  applicantName?: string;
  phone?: string;
  bvn?: string;
  country?: string;
}

export interface SavingsAccountResponse {
  id: string;
  userId: string;
  accountType: 'savings';
  balance: number;
  currency: string;
  status: 'active' | 'pending_kyc';
  productId: string;
  productName: string;
  applicationId: string;
  appId: string;
  merchantId?: string;
  productWallet?: {
    walletId: string;
    accountNumber?: string;
    bankName?: string;
    bankCode?: string;
    provisionStatus?: string;
  };
}

export interface SavingsDepositRequest {
  userId: string;
  amount: number;
  currency?: string;
  referenceId?: string;
}

export interface SavingsDepositResponse {
  applicationId: string;
  upstreamApplicationId?: string;
  referenceId: string;
  amount: number;
  balance: number;
  currency: string;
  account: {
    id: string;
    userId: string;
    accountType: 'savings';
    balance: number;
    currency: string;
    status: 'active';
    productId: string;
    productName: string;
    applicationId: string;
  };
}

export interface SavingsDepositDetailsResponse {
  applicationId: string;
  upstreamApplicationId?: string;
  currency: string;
  balance: number;
  minAmount?: number;
  maxAmount?: number;
  centralWalletAvailable: boolean;
  bankDetails: {
    merchantReference?: string;
  };
}

export interface SavingsDepositWebhookRequest {
  upstreamApplicationId: string;
  amount: number;
  currency?: string;
  providerReference: string;
  merchantId?: string;
  appId?: string;
}
