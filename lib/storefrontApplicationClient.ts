import { apiClient } from "@/lib/api"
import { buildProductApplyBody, type ProductApplyBody } from "@/lib/productApplyPayload"
import { resolveWalletUserId } from "@/lib/resolveWalletUserId"

export type RequirementSubmission = {
  requirementId?: string
  requirementType?: string
  label?: string
  type: "document" | "json"
  fileUrl?: string
  fileName?: string
  fileType?: string
  fileSize?: number
  value?: unknown
  metadata?: Record<string, unknown>
}

export type StorefrontApplication = {
  id?: string
  _id?: string
  userId?: string
  productId?: string
  productName?: string
  productType?: string
  amount?: number
  currency?: string
  status?: string
  requirementsSnapshot?: {
    security?: Record<string, unknown>
    documentsToDownload?: Array<{ name?: string; fileUrl?: string }>
    otherRequirements?: Array<{
      requirementId?: string
      id?: string
      requirementType?: string
      label?: string
      contentType?: string
      description?: string
      uploadRequired?: boolean
      required?: boolean
    }>
  }
  productWallet?: {
    upstreamAccount?: {
      accountNumber?: string
      bankName?: string
      status?: string
    }
  }
}

type ApiEnvelope<T> = {
  success?: boolean
  message?: string
  error?: string
  data?: T
  url?: string
  key?: string
  fileName?: string
  fileType?: string
  fileSize?: number
}

export const INIT_APPLICATION_STORAGE_KEY = "mobile-v2-current-product-application"

function applicationIdFrom(data?: StorefrontApplication | null): string {
  return String(data?.id ?? data?._id ?? "").trim()
}

export function saveInitializedApplication(application: StorefrontApplication) {
  if (typeof window === "undefined") return
  sessionStorage.setItem(INIT_APPLICATION_STORAGE_KEY, JSON.stringify(application))
}

export function readInitializedApplication(): StorefrontApplication | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(INIT_APPLICATION_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StorefrontApplication) : null
  } catch {
    return null
  }
}

function parseApiError(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const row = data as Record<string, unknown>
    return (
      String(row.error || row.message || row.msg || "") ||
      (status >= 400 ? `Request failed (${status})` : "Upload failed")
    )
  }
  return `Upload failed (${status})`
}

export async function initializeProductApplication(productId: string, options?: { amount?: number; currency?: string }) {
  const built = await buildProductApplyBody(productId, options)
  if (!built.ok) return { ok: false as const, error: built.error }

  const res = await apiClient.post<ApiEnvelope<StorefrontApplication>, ProductApplyBody>(
    "/v1/applications/init",
    built.body,
    { includeAuth: true, timeout: 60_000 },
  )

  if (res.data?.success === false || res.status >= 400 || !res.data?.data) {
    return { ok: false as const, error: parseApiError(res.data, res.status) }
  }

  saveInitializedApplication(res.data.data)
  return { ok: true as const, application: res.data.data, applicationId: applicationIdFrom(res.data.data) }
}

export async function applyProductOneShot(productId: string, options?: { amount?: number; currency?: string }) {
  const built = await buildProductApplyBody(productId, options)
  if (!built.ok) return { ok: false as const, error: built.error }

  const res = await apiClient.post<ApiEnvelope<StorefrontApplication>, ProductApplyBody>(
    "/v1/applications/apply",
    built.body,
    { includeAuth: true, timeout: 60_000 },
  )

  if (res.data?.success === false || res.status >= 400) {
    return { ok: false as const, error: parseApiError(res.data, res.status) }
  }

  return { ok: true as const, application: res.data?.data }
}

export async function createSavingsAccount(productId: string, options?: { currency?: string }) {
  const built = await buildProductApplyBody(productId, { currency: options?.currency })
  if (!built.ok) return { ok: false as const, error: built.error }
  const { userId, currency, email } = built.body

  const res = await apiClient.post<ApiEnvelope<unknown>>(
    "/v1/savings-accounts",
    { userId, productId: built.body.productId, currency, ...(email ? { email } : {}) },
    { includeAuth: true, timeout: 60_000 },
  )

  if (res.data?.success === false || res.status >= 400) {
    return { ok: false as const, error: parseApiError(res.data, res.status) }
  }

  return { ok: true as const, data: res.data?.data }
}

export async function buyCommodity(productId: string, quantity: number, amount: number, options?: { currency?: string }) {
  const built = await buildProductApplyBody(productId, { amount, currency: options?.currency })
  if (!built.ok) return { ok: false as const, error: built.error }

  const res = await apiClient.post<ApiEnvelope<unknown>>(
    "/v1/commodities/buy",
    { ...built.body, quantity },
    { includeAuth: true, timeout: 60_000 },
  )

  if (res.data?.success === false || res.status >= 400) {
    return { ok: false as const, error: parseApiError(res.data, res.status) }
  }

  return { ok: true as const, data: res.data?.data }
}

export async function uploadApplicationFile(file: File, userId?: string) {
  const resolvedUserId = userId || (await resolveWalletUserId())
  const form = new FormData()
  form.append("file", file)
  if (resolvedUserId) form.append("userId", resolvedUserId)

  const res = await apiClient.post<ApiEnvelope<unknown>, FormData>("/v1/applications/upload", form, {
    includeAuth: true,
    timeout: 120_000,
  })

  const data = res.data
  if (data?.success === false || res.status >= 400) {
    throw new Error(parseApiError(data, res.status))
  }

  if (!data?.url) {
    throw new Error("Upload succeeded but no file URL was returned.")
  }

  return {
    fileUrl: data.url,
    fileName: data.fileName || file.name,
    fileType: data.fileType || file.type,
    fileSize: data.fileSize ?? file.size,
    key: data.key,
  }
}

export async function submitApplicationRequirements(
  applicationId: string,
  userId: string,
  requirementSubmissions: RequirementSubmission[],
) {
  const res = await apiClient.patch<ApiEnvelope<StorefrontApplication>>(
    `/v1/applications/${encodeURIComponent(applicationId)}/requirements`,
    { userId, requirementSubmissions },
    { includeAuth: true, timeout: 60_000 },
  )

  if (res.data?.success === false || res.status >= 400) {
    return { ok: false as const, error: parseApiError(res.data, res.status) }
  }

  return { ok: true as const, application: res.data?.data }
}

export async function addApplicationGuarantor(
  applicationId: string,
  body: { userId: string; fullName: string; email: string; phone: string; occupation?: string; relationship?: string; country?: string },
) {
  const res = await apiClient.post<ApiEnvelope<{ guarantor?: { id?: string; fullName?: string; email?: string; phone?: string; kyc?: { verificationUrl?: string } }; application?: StorefrontApplication }>>(
    `/v1/applications/${encodeURIComponent(applicationId)}/guarantors`,
    body,
    { includeAuth: true, timeout: 60_000 },
  )

  if (res.data?.success === false || res.status >= 400) {
    return { ok: false as const, error: parseApiError(res.data, res.status) }
  }

  return { ok: true as const, data: res.data?.data }
}

export async function submitInitializedApplication(
  applicationId: string,
  body: { userId: string; acceptedTerms: boolean; mortgageSelection?: Record<string, unknown> },
) {
  const res = await apiClient.post<ApiEnvelope<StorefrontApplication>>(
    `/v1/applications/${encodeURIComponent(applicationId)}/submit`,
    body,
    { includeAuth: true, timeout: 60_000 },
  )

  if (res.data?.success === false || res.status >= 400) {
    return { ok: false as const, error: parseApiError(res.data, res.status) }
  }

  return { ok: true as const, application: res.data?.data }
}