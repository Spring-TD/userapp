/** GET /api/v1/wallets/user/{userId} — account-ms gateway */

export type VirtualNubanProvisionStatus = "active" | "failed" | "pending" | string

export interface VirtualNuban {
  accountType?: string
  provisionStatus?: VirtualNubanProvisionStatus
  accountNumber?: string
  bankName?: string
  bankCode?: string
  providerReference?: string
  provisionedAt?: string
  provisionError?: string
}

export interface UserWallet {
  id: string
  userId: string
  merchantId?: string
  balance?: number
  mainBalance: number
  ledgerBalance: number
  currency: string
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | string
  walletType?: string
  name?: string
  complianceShareholderUserId?: string
  virtualNuban?: VirtualNuban
  accountNumber?: string
  bankName?: string
  bankCode?: string
  providerReference?: string
  payonusNubanAccountNumber?: string
  payonusNubanBankName?: string
  payonusNubanBankCode?: string
  payonusNubanProviderReference?: string
  payonusNubanProvisionStatus?: string
  payonusNubanProvisionedAt?: string
  payonusNubanProvisionError?: string
  createdAt?: string
  updatedAt?: string
}

export interface UserWalletApiResponse {
  success: boolean
  data?: { wallet?: UserWallet }
  wallet?: UserWallet
  message?: string
  error?: string
}

export type WalletProductType = "MORTGAGE" | "LOAN" | "SAVINGS" | "INVESTMENT" | "COMMODITY"

export interface ProductTypeSummaryAccount {
  id?: string
  accountId?: string
  productId?: string
  productName?: string
  name?: string
  amount?: number
  balance?: number
  currency?: string
  status?: string
}

export interface ProductTypeSummaryItem {
  totalAmount: number
  currency: string
  accountCount: number
  accounts: ProductTypeSummaryAccount[]
}

export interface UserProductTypeSummary {
  userId: string
  currency: string
  summary: Record<WalletProductType, ProductTypeSummaryItem>
}

export interface UserProductTypeSummaryResponse {
  success: boolean
  data?: UserProductTypeSummary
  error?: string
  message?: string
}

export interface WalletTransaction {
  id: string
  walletId: string
  amount: number
  type: "CREDIT" | "DEBIT"
  status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED" | string
  description?: string
  referenceId?: string
  externalReference?: string
  source?: string
  category?: string
  userName?: string
  senderName?: string
  customerName?: string
  payerName?: string
  tags?: string[]
  metadata?: {
    provider?: string
    senderName?: string
    customerName?: string
    payerName?: string
    accountName?: string
    sourceAccountName?: string
    originatorName?: string
    parsedPayload?: {
      paymentChannel?: string
      onusReference?: string
      senderName?: string
      customerName?: string
      payerName?: string
      accountName?: string
      sourceAccountName?: string
      originatorName?: string
    }
  }
  balanceBefore?: number
  balanceAfter?: number
  createdAt: string
  updatedAt?: string
}

export interface UserWalletTransactionsResponse {
  success: boolean
  data?: { transactions?: WalletTransaction[] } | WalletTransaction[]
  error?: string
}

/** Response slice from POST …/product-applications/:id/transfer-to-primary */
export interface LoanChargeCollection {
  attempted?: boolean
  success?: boolean
  skipped?: boolean
  skippedReason?: string
  duplicate?: boolean
  chargeAmount?: number
  netToPrimary?: number
}

export interface ProductWalletSnapshot {
  walletPurpose?: string
  mainBalance?: number
  balance?: number
  currency?: string
}

export interface TransferProductToPrimaryPayload {
  amount: number
  description?: string
}

export interface TransferProductToPrimaryResult {
  fromWallet?: ProductWalletSnapshot
  toWallet?: ProductWalletSnapshot
  transaction?: WalletTransaction
  loanChargeCollection?: LoanChargeCollection
}

export interface TransferProductToPrimaryResponse {
  success: boolean
  message?: string
  data?: TransferProductToPrimaryResult
  error?: string
}

/** Backend max amount per transfer-to-primary request. */
export const TRANSFER_TO_PRIMARY_MAX_AMOUNT = 1_000_000
