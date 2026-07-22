import { apiClient } from "@/lib/api"
import type { OfferLetterPayload } from "@/lib/offerLetter"
import type { StorefrontApplication } from "@/lib/storefrontApplicationClient"

type ApiEnvelope<T = unknown> = {
  success?: boolean
  data?: T
  error?: string
  message?: string
}

export type PendingApprovedLoanDetail = {
  applicationId?: string
  id?: string
  productName?: string
  productType?: string
  loanWorkflowStatus?: string
  approvedLoanAmount?: number
  amount?: number
  currency?: string
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

function parseError(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const d = data as ApiEnvelope
    if (d.error) return d.error
    if (d.message) return d.message
  }
  return status >= 500 ? "Server error" : "Request failed"
}

async function postApplication<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await apiClient.post<ApiEnvelope<T>>(path, body, { includeAuth: true, timeout: 30_000 })
    const data = res.data
    if (res.status >= 400 || data?.success === false) {
      return { ok: false, error: parseError(data, res.status) }
    }
    return { ok: true, data: (data?.data ?? data) as T }
  } catch (error: unknown) {
    const message =
      error && typeof error === "object" && "response" in error
        ? parseError(
            (error as { response?: { data?: unknown; status?: number } }).response?.data,
            (error as { response?: { status?: number } }).response?.status ?? 500,
          )
        : error instanceof Error
          ? error.message
          : "Request failed"
    return { ok: false, error: message }
  }
}

async function getApplication<T>(path: string): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await apiClient.get<ApiEnvelope<T>>(path, { includeAuth: true, timeout: 30_000 })
    const data = res.data
    if (res.status >= 400 || data?.success === false) {
      return { ok: false, error: parseError(data, res.status) }
    }
    return { ok: true, data: (data?.data ?? data) as T }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Request failed"
    return { ok: false, error: message }
  }
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
  return postApplication(`/v1/applications/${encodeURIComponent(applicationId)}/pending-approved-loan/offer`, {
    userId,
    accepted,
  })
}

export const pendingApprovedLoanApi = {
  getDetail: getPendingApprovedLoan,
  respondToOffer: respondToLoanOffer,
}
