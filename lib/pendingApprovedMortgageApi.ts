import { apiClient } from "@/lib/api"
import type { PendingApprovedMortgageDetail } from "@/lib/postApprovalMortgage"
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

export async function listPendingApprovedMortgages(userId: string) {
  return getApplication<StorefrontApplication[]>(
    `/v1/applications/user/${encodeURIComponent(userId)}/pending-approved-mortgages`,
  )
}

export async function getPendingApprovedMortgage(applicationId: string, userId: string) {
  const qs = new URLSearchParams({ userId })
  return getApplication<PendingApprovedMortgageDetail>(
    `/v1/applications/${encodeURIComponent(applicationId)}/pending-approved-mortgage?${qs}`,
  )
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

export async function completeMortgageInspection(
  applicationId: string,
  userId: string,
  outcome: "completed" | "declined",
) {
  return postApplication(
    `/v1/applications/${encodeURIComponent(applicationId)}/pending-approved-mortgage/inspection/complete`,
    { userId, outcome },
  )
}

export async function payMortgageDownPayment(
  applicationId: string,
  userId: string,
  method: "wallet" | "bank_transfer" = "wallet",
) {
  return postApplication(
    `/v1/applications/${encodeURIComponent(applicationId)}/pending-approved-mortgage/down-payment`,
    { userId, method },
  )
}

export async function signMortgageContract(applicationId: string, userId: string) {
  return postApplication(
    `/v1/applications/${encodeURIComponent(applicationId)}/pending-approved-mortgage/contract/sign`,
    { userId, accepted: true },
  )
}

export const pendingApprovedMortgageApi = {
  list: listPendingApprovedMortgages,
  getDetail: getPendingApprovedMortgage,
  respondToOffer: respondToMortgageOffer,
  scheduleInspection: scheduleMortgageInspection,
  startInspection: startMortgageInspection,
  completeInspection: completeMortgageInspection,
  payDownPayment: payMortgageDownPayment,
  signContract: signMortgageContract,
}
