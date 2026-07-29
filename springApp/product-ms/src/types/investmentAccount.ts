export interface CreateInvestmentAccountRequest {
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
  /** Required by Plata on submitted enrollment (same platform fields as apply). */
  isPoliticallyExposedPerson?: boolean;
  monthlyIncome?: number;
  repaymentSource?: string;
  repaymentSourceOther?: string;
  maritalStatus?: string;
  maritalStatusOther?: string;
}

export interface InvestmentAccountResponse {
  id: string;
  userId: string;
  accountType: 'investment';
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

export interface InvestmentDepositRequest {
  userId: string;
  amount: number;
  currency?: string;
  referenceId?: string;
}

export interface InvestmentDepositResponse {
  applicationId: string;
  upstreamApplicationId?: string;
  referenceId: string;
  amount: number;
  balance: number;
  currency: string;
  account: {
    id: string;
    userId: string;
    accountType: 'investment';
    balance: number;
    currency: string;
    status: 'active';
    productId: string;
    productName: string;
    applicationId: string;
  };
}

export interface InvestmentDepositDetailsResponse {
  applicationId: string;
  upstreamApplicationId?: string;
  currency: string;
  balance: number;
  minAmount?: number;
  maxAmount?: number;
  centralWalletAvailable: boolean;
}
