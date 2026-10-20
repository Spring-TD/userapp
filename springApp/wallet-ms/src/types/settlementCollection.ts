/**
 * Repayment Wallet collection categories for SPRING (formerly "Settlement").
 * Maps product commission types (merchant cut) into the app-scoped Repayment wallet.
 */
export const REPAYMENT_COLLECTION_SOURCE = 'repayment-collection';

/** @deprecated use REPAYMENT_COLLECTION_SOURCE */
export const SETTLEMENT_COLLECTION_SOURCE = REPAYMENT_COLLECTION_SOURCE;

/** Commission / collection categories credited to Settlement */
export type SettlementCollectionCategory =
  | 'COMMODITY_CHARGE'
  | 'LOAN_CHARGE'
  | 'LOAN_EQUITY'
  | 'LOAN_REPAYMENT'
  | 'MORTGAGE_CHARGE'
  | 'MORTGAGE_EQUITY'
  | 'ACCOUNT_MAINTENANCE'
  | 'INVESTMENT_CHARGE'
  | 'INVESTMENT_DEPOSIT'
  | 'TRANSACTION_CHARGE'
  | 'OTHER_SERVICE_CHARGE'
  | 'INTEREST_PAYMENT'
  | 'SAVINGS_DEPOSIT'
  | 'COMMODITY_DEPOSIT';

export interface SettlementCollectInput {
  merchantId: string;
  appId?: string;
  userId?: string;
  amount: number;
  referenceId: string;
  source?: string;
  category: SettlementCollectionCategory | string;
  description?: string;
  applicationId?: string;
  productId?: string;
  productType?: string;
  installmentNumber?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
  debitUserWallet?: boolean;
}

/** Source for commodity purchase split settlement (user debit + offering commission + principal hold). */
export const COMMODITY_PURCHASE_SOURCE = 'commodity-purchase';

/** Source for commodity maturity payout (creator SETTLEMENT debit → user PRIMARY credit). */
export const COMMODITY_MATURITY_PAYOUT_SOURCE = 'commodity-maturity-payout';

/** Source for savings/investment maturity credit after Plata Treasury approval. */
export const MATURITY_PAYOUT_SOURCE = 'maturity-payout';

export interface CommodityPurchaseCollectInput {
  userId: string;
  /** Storefront merchant hosting the buyer's PRIMARY wallet. */
  offeringMerchantId: string;
  offeringAppId: string;
  /** Product creator merchant — principal is credited to this merchant's app SETTLEMENT wallet. */
  creatorMerchantId: string;
  creatorAppId: string;
  baseAmount: number;
  commissionAmount: number;
  referenceId: string;
  productId: string;
  currency?: string;
  /**
   * When true and the creator SETTLEMENT wallet is not on Spring wallet-ms,
   * only debit the user and credit storefront commission; principal is settled externally (e.g. Plata gateway).
   */
  allowExternalPrincipalSettlement?: boolean;
  /** @deprecated Legacy integrator hold — used only when reversing old transactions. */
  integratorMerchantId?: string;
  integratorAppId?: string;
  metadata?: Record<string, unknown>;
}

export interface CommodityMaturityPayoutInput {
  userId: string;
  offeringMerchantId: string;
  creatorMerchantId: string;
  creatorAppId: string;
  principalAmount: number;
  interestAmount: number;
  referenceId: string;
  applicationId: string;
  currency?: string;
  metadata?: Record<string, unknown>;
}

/** Source for investment apply (user debited principal + fee; commission to offering; principal to Plata creator). */
export const INVESTMENT_PURCHASE_SOURCE = 'investment-purchase';

/** Source for savings deposit (user debited principal; principal to Plata creator via gateway). */
export const SAVINGS_PURCHASE_SOURCE = 'savings-purchase';

export interface InvestmentPurchaseCollectInput {
  userId: string;
  offeringMerchantId: string;
  offeringAppId: string;
  /** Investment principal credited to Plata product creator. */
  principalAmount: number;
  /** Spring merchant fee on top of principal. */
  commissionAmount: number;
  /** @deprecated Legacy integrator hold amount; ignored on new collects. */
  creatorPrincipalAmount?: number;
  /** @deprecated Legacy integrator merchant; ignored on new collects. */
  integratorMerchantId?: string;
  integratorAppId?: string;
  referenceId: string;
  productId: string;
  applicationId?: string;
  currency?: string;
  creatorMerchantId?: string;
  creatorAppId?: string;
  metadata?: Record<string, unknown>;
}

export interface SavingsPurchaseCollectInput {
  userId: string;
  offeringMerchantId: string;
  offeringAppId: string;
  /** @deprecated Legacy integrator merchant; ignored on new collects. */
  integratorMerchantId?: string;
  integratorAppId?: string;
  principalAmount: number;
  referenceId: string;
  productId: string;
  applicationId?: string;
  currency?: string;
  creatorMerchantId?: string;
  creatorAppId?: string;
  metadata?: Record<string, unknown>;
}
