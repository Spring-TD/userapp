export type ProductApplicationType = "MORTGAGE" | "LOAN" | "SAVINGS" | "INVESTMENT" | "COMMODITY" | string

export interface ProductApplicationUpstreamAccount {
  accountNumber?: string
  bankName?: string
  bankCode?: string
  providerReference?: string
  provisionStatus?: string
  balance?: number
  mainBalance?: number
  currency?: string
}

export interface ProductApplicationWallet {
  walletId?: string
  walletPurpose?: string
  reusedUpstreamAccount?: boolean
  balance?: number
  mainBalance?: number
  currency?: string
  upstreamAccount?: ProductApplicationUpstreamAccount
}

export interface ProductApplication {
  id: string
  userId: string
  productId: string
  productName?: string
  productType: ProductApplicationType
  status: string
  amount?: number
  currency?: string
  loanWorkflowStatus?: string
  requirementsSnapshot?: Record<string, unknown>
  productWallet?: ProductApplicationWallet
  /** Live amortization schedule overlay from Plata (post-disburse). */
  amortizationSchedule?: Record<string, unknown>
  postApprovalFulfillment?: {
    status?: string
    disbursedAt?: string
  }
  createdAt?: string
  updatedAt?: string
}

export interface ProductApplicationInitResponse {
  success: boolean
  message?: string
  data?: ProductApplication | ProductApplication[] | {
    applications?: ProductApplication[]
    accounts?: ProductApplication[]
    application?: ProductApplication
  }
  error?: string
}

export interface InitProductApplicationPayload {
  productId: string
  productType?: ProductApplicationType
  userId?: string
  appId?: string
}
