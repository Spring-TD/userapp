/** Loan tab catalog card — feature + hot grid (design mock). */
export type LoanCatalogItem = {
  id: string
  providerName: string
  providerLogoUrl?: string
  imageUrl?: string
  title: string
  amountDisplay: string
  description: string
  duration: string
  interestRate: string
  /** Featured hero: label above amount */
  loanAmountLabel?: string
  loanAmountDisplay?: string
}

export type EnsureLoanAccountResult = {
  ok: boolean
  accountCreated: boolean
  accountId?: string
  message?: string
  error?: string
}
