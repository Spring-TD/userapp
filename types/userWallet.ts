/** GET /api/v1/wallets/user/{userId} — wallet-ms via account-ms gateway */

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

export interface WalletTransaction {
  id: string
  walletId: string
  amount: number
  type: "CREDIT" | "DEBIT"
  status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED" | string
  description?: string
  referenceId?: string
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
