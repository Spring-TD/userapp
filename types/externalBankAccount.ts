/** Wallet external bank accounts & payout — account-ms → wallet-ms */

export interface BankPickerItem {
  code: string
  name: string
}

export interface BanksListResponse {
  success: boolean
  cached?: boolean
  count?: number
  data?: BankPickerItem[]
  error?: string
}

export interface NameEnquiryRequest {
  accountNumber: string
  bankCode: string
  currency?: string
}

export interface NameEnquiryResult {
  accountName: string
  accountNumber: string
  bankCode: string
  bankName: string
}

export interface NameEnquiryResponse {
  success: boolean
  data?: NameEnquiryResult
  error?: string
}

export interface SavedExternalBankAccount {
  id: string
  userId?: string
  accountNumber: string
  bankCode: string
  bankName?: string
  accountName: string
  label?: string
  currency: string
  isDefault: boolean
  status: "active" | "deleted" | string
  verifiedAt?: string
  createdAt: string
  updatedAt?: string
}

export interface AddExternalBankAccountRequest {
  bankName?: string
  bankCode?: string
  accountNumber: string
  accountName?: string
  currency?: string
  label?: string
}

export interface ExternalBankAccountsListResponse {
  success: boolean
  data?: { accounts?: SavedExternalBankAccount[] }
  error?: string
}

export interface AddExternalBankAccountResponse {
  success: boolean
  message?: string
  data?: { account?: SavedExternalBankAccount }
  error?: string
}

export interface PayoutRequest {
  savedBankAccountId: string
  amount: number
  pin: string
  currency?: string
  narration?: string
  reference?: string
}

export interface PayoutResponse {
  success: boolean
  message?: string
  data?: {
    wallet?: unknown
    transaction?: unknown
    payoutReference?: string
    providerReference?: string
    providerStatus?: string
    savedBankAccountId?: string
  }
  error?: string
  code?: string
  attemptsRemaining?: number
  lockedUntil?: string
}

export interface TransactionPinStatus {
  hasTransactionPin: boolean
  locked: boolean
  lockedUntil: string | null
}

export interface TransactionPinStatusResponse {
  success: boolean
  data?: TransactionPinStatus
  error?: string
}

export interface CreateTransactionPinRequest {
  pin: string
}

export interface UpdateTransactionPinRequest {
  currentPin: string
  newPin: string
}
