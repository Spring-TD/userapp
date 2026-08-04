import { apiClient } from "@/lib/api"
import type { InsufficientCentralWalletBalance } from "@/lib/pendingApprovedLoanApi"
import {
  mortgageDownPaymentDue,
  type PendingApprovedMortgageDetail,
  type PostApprovalFulfillment,
} from "@/lib/postApprovalMortgage"
import type { StorefrontApplication } from "@/lib/storefrontApplicationClient"

type ApiEnvelope<T = unknown> = {
  success?: boolean
  data?: T
  error?: string
  message?: string
}

function parseError(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const d = data as ApiEnvelope
    if (d.error) return d.error
    if (d.message) return d.message
  }
  return status >= 500 ? "Server error" : "Request failed"
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

/**
 * Offer body: live account-ms validates `action: accept|decline` (+ `acceptedTerms` on accept).
 * Docs that mention `decision` are outdated for this gateway.
 */
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

/** Normalize nested GET …/pending-approved-mortgage payloads into a flat detail shape. */
export function normalizePendingApprovedMortgageDetail(
  raw: PendingApprovedMortgageDetail | Record<string, unknown> | null | undefined,
): PendingApprovedMortgageDetail | null {
  if (!raw || typeof raw !== "object") return null
  const record = raw as PendingApprovedMortgageDetail & Record<string, unknown>
  const application = record.application
  const nestedPaf = application?.postApprovalFulfillment
  const topPaf = record.postApprovalFulfillment
  const postApprovalFulfillment = (topPaf || nestedPaf) as PostApprovalFulfillment | undefined
  const applicationId =
    String(record.applicationId || application?.id || record.id || "").trim() || undefined

  const requiredFromNested = postApprovalFulfillment?.downPayment?.requiredAmount
  const requiredAmount =
    typeof record.requiredAmount === "number"
      ? record.requiredAmount
      : typeof requiredFromNested === "number"
        ? requiredFromNested
        : typeof record.equityAmount === "number"
          ? record.equityAmount
          : undefined

  return {
    ...record,
    applicationId,
    id: applicationId || record.id,
    postApprovalFulfillment,
    bankDetails: record.bankDetails || postApprovalFulfillment?.bankDetails,
    requiredAmount,
    currency: record.currency || postApprovalFulfillment?.downPayment?.currency || "NGN",
    equityAmount: record.equityAmount ?? requiredAmount,
  }
}

export async function listPendingApprovedMortgages(userId: string) {
  return getApplication<StorefrontApplication[]>(
    `/v1/applications/user/${encodeURIComponent(userId)}/pending-approved-mortgages`,
  )
}

export async function getPendingApprovedMortgage(applicationId: string, userId: string) {
  const qs = new URLSearchParams({ userId })
  const result = await getApplication<PendingApprovedMortgageDetail>(
    `/v1/applications/${encodeURIComponent(applicationId)}/pending-approved-mortgage?${qs}`,
  )
  if (!result.ok) return result
  const normalized = normalizePendingApprovedMortgageDetail(result.data)
  if (!normalized) return { ok: false as const, error: "Invalid mortgage detail response" }
  return { ok: true as const, data: normalized }
}

export async function respondToMortgageOffer(
  applicationId: string,
  userId: string,
  accepted: boolean,
) {
  return postOfferAction(
    `/v1/applications/${encodeURIComponent(applicationId)}/pending-approved-mortgage/offer`,
    userId,
    accepted,
  )
}

/** POST …/appointment — `scheduledFor` must match a merchant-configured slot. */
export async function scheduleMortgageInspection(
  applicationId: string,
  userId: string,
  scheduledFor?: string,
  extras?: { location?: string; notes?: string },
) {
  return postApplication(
    `/v1/applications/${encodeURIComponent(applicationId)}/pending-approved-mortgage/appointment`,
    {
      userId,
      ...(scheduledFor ? { scheduledFor } : {}),
      ...(extras?.location ? { location: extras.location } : {}),
      ...(extras?.notes ? { notes: extras.notes } : {}),
    },
  )
}

export async function startMortgageInspection(applicationId: string, userId: string) {
  return postApplication(
    `/v1/applications/${encodeURIComponent(applicationId)}/pending-approved-mortgage/inspection/start`,
    { userId },
  )
}

/**
 * Step 3 — Virtual Inspection (borrower completes property tour in User-App).
 * `POST …/pending-approved-mortgage/virtual-inspection/complete`
 */
export async function completeVirtualInspection(
  applicationId: string,
  userId: string,
  notes?: string,
) {
  return postApplication(
    `/v1/applications/${encodeURIComponent(applicationId)}/pending-approved-mortgage/virtual-inspection/complete`,
    {
      userId,
      ...(notes?.trim() ? { notes: notes.trim() } : {}),
    },
  )
}

/**
 * Step 6 — Inspection Outcome (accept / reject house after physical visit).
 * `POST …/pending-approved-mortgage/inspection/complete`
 * Outcome: `completed` | `declined_offer`
 */
export async function completeMortgageInspection(
  applicationId: string,
  userId: string,
  outcome: "completed" | "declined_offer" | "declined",
) {
  const normalized: "completed" | "declined_offer" =
    outcome === "completed" ? "completed" : "declined_offer"
  return postApplication(
    `/v1/applications/${encodeURIComponent(applicationId)}/pending-approved-mortgage/inspection/complete`,
    { userId, outcome: normalized },
  )
}

/**
 * POST …/pending-approved-mortgage/down-payment
 * Body: `{ userId, amount? }` — do NOT send loan-style `method`.
 * Amount optional; if sent must equal required amount.
 */
export async function payMortgageDownPayment(
  applicationId: string,
  userId: string,
  amount?: number,
): Promise<
  | { ok: true; data: PendingApprovedMortgageDetail }
  | { ok: false; error: string; insufficient?: InsufficientCentralWalletBalance }
> {
  const body: Record<string, unknown> = { userId }
  if (typeof amount === "number" && Number.isFinite(amount) && amount > 0) {
    body.amount = amount
  }

  const result = await postApplication<PendingApprovedMortgageDetail>(
    `/v1/applications/${encodeURIComponent(applicationId)}/pending-approved-mortgage/down-payment`,
    body,
  )

  if (result.ok) {
    const normalized = normalizePendingApprovedMortgageDetail(result.data)
    return { ok: true, data: normalized || (result.data as PendingApprovedMortgageDetail) }
  }

  const insufficient =
    result.status === 402
      ? parseInsufficientBalance(result.data, result.error)
      : parseInsufficientBalance(result.data, result.error)

  if (insufficient) {
    return { ok: false, error: insufficient.error, insufficient }
  }

  return { ok: false, error: result.error }
}

/** Poll detail until paid (or later), or timeout. */
export async function pollMortgageDownPaymentStatus(
  applicationId: string,
  userId: string,
  options?: { attempts?: number; intervalMs?: number },
): Promise<{ ok: true; data: PendingApprovedMortgageDetail } | { ok: false; error: string }> {
  const attempts = options?.attempts ?? 8
  const intervalMs = options?.intervalMs ?? 2500

  for (let i = 0; i < attempts; i += 1) {
    const result = await getPendingApprovedMortgage(applicationId, userId)
    if (!result.ok) {
      if (i === attempts - 1) return result
    } else {
      const status = result.data.postApprovalFulfillment?.status
      if (
        status === "down_payment_paid" ||
        status === "down_payment_confirmed" ||
        status === "contract_issued" ||
        status === "contract_signed" ||
        status === "disbursed"
      ) {
        return result
      }
    }
    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }
  }

  const last = await getPendingApprovedMortgage(applicationId, userId)
  return last
}

export async function signMortgageContract(applicationId: string, userId: string) {
  return postApplication(
    `/v1/applications/${encodeURIComponent(applicationId)}/pending-approved-mortgage/contract/sign`,
    { userId, accepted: true },
  )
}

export { mortgageDownPaymentDue }

export const pendingApprovedMortgageApi = {
  list: listPendingApprovedMortgages,
  getDetail: getPendingApprovedMortgage,
  respondToOffer: respondToMortgageOffer,
  scheduleInspection: scheduleMortgageInspection,
  startInspection: startMortgageInspection,
  completeVirtualInspection,
  completeInspection: completeMortgageInspection,
  payDownPayment: payMortgageDownPayment,
  pollDownPaymentStatus: pollMortgageDownPaymentStatus,
  signContract: signMortgageContract,
}
