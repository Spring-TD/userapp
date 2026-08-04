import { apiClient } from "@/lib/api"
import type { OfferLetterPayload } from "@/lib/offerLetter"
import type { StorefrontApplication } from "@/lib/storefrontApplicationClient"

type ApiEnvelope<T = unknown> = {
  success?: boolean
  data?: T
  error?: string
  message?: string
}

/** Terms from frozen product configuration — null fields must not be invented client-side. */
export type PendingApprovedLoanTerms = {
  approvedAmount?: number | null
  downPaymentDue?: number | null
  interestRate?: number | null
  totalRepayable?: number | null
  repaymentFrequency?: string | null
  tenorMonths?: number | null
  automaticRepayment?: boolean | null
  estimatedDisbursementDate?: string | null
}

export type PendingApprovedLoanDetail = {
  applicationId?: string
  id?: string
  productName?: string
  productType?: string
  loanWorkflowStatus?: string
  approvedAmount?: number | null
  equityRequiredAmount?: number | null
  approvedLoanAmount?: number
  amount?: number
  currency?: string
  terms?: PendingApprovedLoanTerms | null
  offerLetter?: OfferLetterPayload
  postApprovalFulfillment?: {
    status?: string
    contract?: {
      documentUrl?: string
      documentFileName?: string
      documentSource?: string
    }
    offer?: {
      sentAt?: string
      acceptedAt?: string
    }
  }
} & Partial<StorefrontApplication>

/**
 * Backend accept/decline requires the merchant to have formally sent the letter
 * (`offer.sentAt` / `loanWorkflowStatus: offer_sent`). A `pdfUrl` alone can be a
 * preview and is not enough for POST …/offer.
 */
export function isLoanOfferLetterSent(detail: PendingApprovedLoanDetail | null | undefined): boolean {
  if (!detail) return false
  const sentAt = detail.postApprovalFulfillment?.offer?.sentAt
  if (typeof sentAt === "string" && sentAt.trim()) return true

  const letter = detail.offerLetter as (OfferLetterPayload & { sentAt?: string }) | undefined
  if (typeof letter?.sentAt === "string" && letter.sentAt.trim()) return true

  const wf = String(detail.loanWorkflowStatus || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
  if (wf === "offer_sent" || wf.includes("offer_sent")) return true

  const paf = String(detail.postApprovalFulfillment?.status || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
  // offer_pending without sentAt means letter not formally sent yet
  if (paf === "offer_accepted" || paf.includes("offer_accepted")) return true

  return false
}

export function hasLoanOfferLetterPdf(detail: PendingApprovedLoanDetail | null | undefined): boolean {
  if (!detail) return false
  const fromOffer = detail.offerLetter?.pdfUrl?.trim()
  if (fromOffer) return true
  const fromContract = detail.postApprovalFulfillment?.contract?.documentUrl?.trim()
  return Boolean(fromContract)
}

export const OFFER_LETTER_NOT_SENT_MESSAGE =
  "Offer letter has not been sent by the merchant"

export type LoanDownPaymentPayment = {
  method?: string
  amount?: number
  currency?: string
  duplicate?: boolean
  centralWalletBalance?: number
  userTransactionId?: string
  repaymentTransactionId?: string
}

export type LoanDownPaymentResult = {
  postApprovalFulfillment?: { status?: string }
  terms?: PendingApprovedLoanTerms | null
  payment?: LoanDownPaymentPayment
}

export type InsufficientCentralWalletBalance = {
  code: "INSUFFICIENT_CENTRAL_WALLET_BALANCE"
  requiredAmount: number
  availableBalance: number
  currency: string
  shortfall: number
  error: string
}

function parseError(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const d = data as ApiEnvelope
    if (d.error) return d.error
    if (d.message) return d.message
  }
  return status >= 500
    ? "Server error — offer could not be updated. Please try again shortly."
    : "Request failed"
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null
}

function parseInsufficientBalance(
  data: unknown,
  fallbackError: string,
): InsufficientCentralWalletBalance | undefined {
  const envelope = asRecord(data)
  const inner = asRecord(envelope?.data) || envelope
  if (!inner) return undefined

  const code = String(inner.code || "").trim()
  if (code !== "INSUFFICIENT_CENTRAL_WALLET_BALANCE") return undefined

  const requiredAmount = Number(inner.requiredAmount)
  const availableBalance = Number(inner.availableBalance)
  if (!Number.isFinite(requiredAmount) || !Number.isFinite(availableBalance)) return undefined

  const currency = String(inner.currency || "NGN")
  return {
    code: "INSUFFICIENT_CENTRAL_WALLET_BALANCE",
    requiredAmount,
    availableBalance,
    currency,
    shortfall: Math.max(0, requiredAmount - availableBalance),
    error: parseError(data, 402) || fallbackError,
  }
}

function axiosFailure(error: unknown): { data: unknown; status: number; message: string } {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { data?: unknown; status?: number } }).response
    const status = response?.status ?? 500
    const data = response?.data
    return {
      data,
      status,
      message: parseError(data, status),
    }
  }
  return {
    data: null,
    status: 500,
    message: error instanceof Error ? error.message : "Request failed",
  }
}

async function postApplication<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<{ ok: true; data: T } | { ok: false; error: string; status?: number; data?: unknown }> {
  try {
    const res = await apiClient.post<ApiEnvelope<T>>(path, body, { includeAuth: true, timeout: 30_000 })
    const data = res.data
    if (res.status >= 400 || data?.success === false) {
      return { ok: false, error: parseError(data, res.status), status: res.status, data }
    }
    return { ok: true, data: (data?.data ?? data) as T }
  } catch (error: unknown) {
    const failure = axiosFailure(error)
    return { ok: false, error: failure.message, status: failure.status, data: failure.data }
  }
}

async function getApplication<T>(
  path: string,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await apiClient.get<ApiEnvelope<T>>(path, { includeAuth: true, timeout: 30_000 })
    const data = res.data
    if (res.status >= 400 || data?.success === false) {
      return { ok: false, error: parseError(data, res.status) }
    }
    return { ok: true, data: (data?.data ?? data) as T }
  } catch (error: unknown) {
    const failure = axiosFailure(error)
    return { ok: false, error: failure.message }
  }
}

async function postOfferAction<T>(
  path: string,
  userId: string,
  accepted: boolean,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  return postApplication<T>(path, {
    userId,
    action: accepted ? "accept" : "decline",
    ...(accepted ? { acceptedTerms: true } : {}),
  })
}

/** Required down payment from backend detail — never invent when terms are missing. */
export function loanDownPaymentDue(detail: PendingApprovedLoanDetail | null | undefined): number {
  if (!detail) return 0
  const fromTerms = detail.terms?.downPaymentDue
  if (typeof fromTerms === "number" && Number.isFinite(fromTerms)) return Math.max(0, fromTerms)
  const fromEquity = detail.equityRequiredAmount
  if (typeof fromEquity === "number" && Number.isFinite(fromEquity)) return Math.max(0, fromEquity)
  return 0
}

export function loanApprovedAmount(detail: PendingApprovedLoanDetail | null | undefined): number | null {
  if (!detail) return null
  const fromTerms = detail.terms?.approvedAmount
  if (typeof fromTerms === "number" && Number.isFinite(fromTerms)) return fromTerms
  if (typeof detail.approvedAmount === "number" && Number.isFinite(detail.approvedAmount)) {
    return detail.approvedAmount
  }
  if (typeof detail.approvedLoanAmount === "number" && Number.isFinite(detail.approvedLoanAmount)) {
    return detail.approvedLoanAmount
  }
  if (typeof detail.amount === "number" && Number.isFinite(detail.amount)) return detail.amount
  return null
}

/** Format a term value for display; returns null when the backend left it unset. */
export function formatLoanTermValue(
  value: string | number | boolean | null | undefined,
  options?: { currency?: string; suffix?: string },
): string | null {
  if (value == null) return null
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null
    if (options?.currency) {
      try {
        return new Intl.NumberFormat("en-NG", {
          style: "currency",
          currency: options.currency,
          minimumFractionDigits: 2,
        }).format(value)
      } catch {
        return `${options.currency} ${value.toLocaleString("en-NG", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
          useGrouping: true,
        })}`
      }
    }
    return options?.suffix ? `${value}${options.suffix}` : String(value)
  }
  const trimmed = String(value).trim()
  return trimmed || null
}

/** GET /v1/applications/:applicationId/pending-approved-loan?userId=… */
export async function getPendingApprovedLoan(applicationId: string, userId: string) {
  const qs = new URLSearchParams({ userId })
  return getApplication<PendingApprovedLoanDetail>(
    `/v1/applications/${encodeURIComponent(applicationId)}/pending-approved-loan?${qs}`,
  )
}

/** POST /v1/applications/:applicationId/pending-approved-loan/offer */
export async function respondToLoanOffer(
  applicationId: string,
  userId: string,
  accepted: boolean,
) {
  return postOfferAction(
    `/v1/applications/${encodeURIComponent(applicationId)}/pending-approved-loan/offer`,
    userId,
    accepted,
  )
}

/**
 * POST /v1/applications/:applicationId/pending-approved-loan/down-payment
 * Body: `{ userId, method: "wallet" }` — do not send amount.
 * On success the offer is already accepted; do not call `/offer` again.
 */
export async function payLoanDownPayment(
  applicationId: string,
  userId: string,
  method: "wallet" = "wallet",
): Promise<
  | { ok: true; data: LoanDownPaymentResult }
  | { ok: false; error: string; insufficient?: InsufficientCentralWalletBalance }
> {
  const result = await postApplication<LoanDownPaymentResult>(
    `/v1/applications/${encodeURIComponent(applicationId)}/pending-approved-loan/down-payment`,
    { userId, method },
  )

  if (result.ok) return result

  const insufficient =
    result.status === 402
      ? parseInsufficientBalance(result.data, result.error)
      : parseInsufficientBalance(result.data, result.error)

  if (insufficient) {
    return { ok: false, error: insufficient.error, insufficient }
  }

  return { ok: false, error: result.error }
}

export const pendingApprovedLoanApi = {
  getDetail: getPendingApprovedLoan,
  respondToOffer: respondToLoanOffer,
  payDownPayment: payLoanDownPayment,
}
