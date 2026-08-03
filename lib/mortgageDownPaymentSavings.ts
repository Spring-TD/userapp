/**
 * Mortgage down-payment Target Savings planner helpers + local persistence.
 * Approval lives with the Originating FI on Plata; the user app collects intent.
 */

export const MORTGAGE_SAVINGS_ANNUAL_RATE = 0.12
export const MORTGAGE_SAVINGS_DURATIONS = [12, 24, 36, 60] as const

export type MortgageSavingsDurationMonths = (typeof MORTGAGE_SAVINGS_DURATIONS)[number]

export type MortgageSavingsApplicationStatus =
  | 'pending_review'
  | 'approved'
  | 'declined'
  | 'running'

export type MortgageSavingsPlanOption = {
  months: MortgageSavingsDurationMonths
  monthly: number
  totalDeposits: number
  interest: number
}

export type MortgageSavingsApplication = {
  id: string
  productId: string
  productName: string
  propertyName: string
  goalAmount: number
  months: MortgageSavingsDurationMonths
  monthly: number
  interest: number
  annualRate: number
  status: MortgageSavingsApplicationStatus
  requestedAt: string
  /** Optional FI-facing product id once Plata creates the Target Savings product */
  savingsProductId?: string
}

const STORAGE_KEY = 'mortgage_down_payment_savings_applications_v1'

export function mortgageDownPaymentSavingsHref(productId: string): string {
  return `/mobile-v2/products/mortgage/down-payment-savings?productId=${encodeURIComponent(productId)}`
}

export function mortgagePendingSavingsHref(): string {
  return '/mobile-v2/products/mortgage/pending-savings'
}

export function formatSavingsDuration(months: number): string {
  if (months % 12 === 0) {
    const years = months / 12
    return years === 1 ? '1 year' : `${years} years`
  }
  return `${months} months`
}

export function formatSavingsMoney(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0
  return `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Fixed-goal sinking fund payment at monthly compound rate. */
export function computeSavingsPlanOptions(
  goalAmount: number,
  annualRate = MORTGAGE_SAVINGS_ANNUAL_RATE,
): MortgageSavingsPlanOption[] {
  const fv = Math.max(0, goalAmount)
  const monthlyRate = annualRate / 12
  return MORTGAGE_SAVINGS_DURATIONS.map((months) => {
    if (fv <= 0 || monthlyRate <= 0) {
      return { months, monthly: 0, totalDeposits: 0, interest: 0 }
    }
    const factor = Math.pow(1 + monthlyRate, months) - 1
    const monthly = fv * monthlyRate / factor
    const totalDeposits = monthly * months
    const interest = Math.max(0, fv - totalDeposits)
    return { months, monthly, totalDeposits, interest }
  })
}

function readRaw(): MortgageSavingsApplication[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as MortgageSavingsApplication[]) : []
  } catch {
    return []
  }
}

function writeRaw(list: MortgageSavingsApplication[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* ignore quota */
  }
}

export function listMortgageSavingsApplications(): MortgageSavingsApplication[] {
  return readRaw().sort(
    (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
  )
}

export function getMortgageSavingsApplication(id: string): MortgageSavingsApplication | null {
  return readRaw().find((row) => row.id === id) ?? null
}

export function listMortgageSavingsForProduct(productId: string): MortgageSavingsApplication[] {
  const id = String(productId || '').trim()
  return listMortgageSavingsApplications().filter((row) => row.productId === id)
}

export function hasPendingMortgageSavings(): boolean {
  return listMortgageSavingsApplications().some(
    (row) => row.status === 'pending_review' || row.status === 'approved' || row.status === 'running',
  )
}

export function submitMortgageSavingsApplication(input: {
  productId: string
  productName: string
  propertyName: string
  goalAmount: number
  months: MortgageSavingsDurationMonths
  monthly: number
  interest: number
}): MortgageSavingsApplication {
  const application: MortgageSavingsApplication = {
    id: `msav_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    productId: input.productId,
    productName: input.productName,
    propertyName: input.propertyName,
    goalAmount: input.goalAmount,
    months: input.months,
    monthly: input.monthly,
    interest: input.interest,
    annualRate: MORTGAGE_SAVINGS_ANNUAL_RATE,
    status: 'pending_review',
    requestedAt: new Date().toISOString(),
  }
  const next = [application, ...readRaw().filter((row) => row.id !== application.id)]
  writeRaw(next)
  try {
    sessionStorage.setItem(`mortgage_down_payment_method_${input.productId}`, 'savings_plan')
    sessionStorage.setItem(`mortgage_savings_application_${input.productId}`, application.id)
  } catch {
    /* ignore */
  }
  return application
}

export function markMortgageSavingsApproved(
  id: string,
  savingsProductId?: string,
): MortgageSavingsApplication | null {
  const list = readRaw()
  const idx = list.findIndex((row) => row.id === id)
  if (idx < 0) return null
  const updated: MortgageSavingsApplication = {
    ...list[idx],
    status: 'running',
    savingsProductId: savingsProductId || list[idx].savingsProductId || `target-savings-${id}`,
  }
  list[idx] = updated
  writeRaw(list)
  return updated
}

export function statusLabelForSavings(status: MortgageSavingsApplicationStatus): string {
  switch (status) {
    case 'pending_review':
      return 'Pending review'
    case 'approved':
      return 'Approved'
    case 'running':
      return 'Running'
    case 'declined':
      return 'Declined'
    default:
      return 'Pending review'
  }
}
