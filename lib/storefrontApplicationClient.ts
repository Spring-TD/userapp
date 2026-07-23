import { apiClient } from "@/lib/api"
import { buildProductApplyBody, type ProductApplyBody } from "@/lib/productApplyPayload"
import type { PlatformFields } from "@/lib/platformApplicationFields"
import { resolveWalletUserId } from "@/lib/resolveWalletUserId"
import { sanitizeProductId } from "@/lib/sanitizeProductId"
import { TENANT_MERCHANT_ID_STORAGE_KEY } from "@/lib/mobileTenant/storageKeys"

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

export type ApplicationProgressTab = "requirement" | "fileUpload" | "loan" | string

export type ApplicationProgress = {
  currentStep?: "apply" | "platform_fields" | string
  currentTab?: ApplicationProgressTab
  requirementDrafts?: RequirementSubmission[]
  uploadedDrafts?: RequirementSubmission[]
  metadata?: {
    platformFields?: PlatformFields
  }
  lastSavedAt?: string
}

export type StorefrontApplication = {
  id?: string
  _id?: string
  userId?: string
  /** Spring local product id when available (preferred for storefront detail). */
  productId?: string
  localProductId?: string
  springProductId?: string
  /** Plata catalog / upstream product id (clone source). */
  upstreamProductId?: string
  productName?: string
  productType?: string
  amount?: number
  currency?: string
  status?: string
  loanWorkflowStatus?: string
  appId?: string
  merchantId?: string
  createdAt?: string
  updatedAt?: string
  applicationProgress?: ApplicationProgress
  platformFields?: PlatformFields
  metadata?: Record<string, unknown>
  mortgageSelection?: Record<string, unknown>
  product?: Record<string, unknown>
  account?: {
    id?: string
    accountNumber?: string
    bankName?: string
    balance?: number
    currency?: string
    status?: string
  }
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
      balance?: number
      currency?: string
      status?: string
    }
  }
}

export type ProductApplicationInitStatus = {
  userId?: string
  productId?: string
  appId?: string
  merchantId?: string
  hasInitializedApplication?: boolean
  hasUpstreamAccount?: boolean
  upstreamAccount?: StorefrontApplication["productWallet"] extends { upstreamAccount?: infer A } ? A : never
  loanWorkflowStatus?: string
  application?: StorefrontApplication
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

function readTenantMerchantId(): string {
  if (typeof window === "undefined") return ""
  try {
    return sessionStorage.getItem(TENANT_MERCHANT_ID_STORAGE_KEY) || ""
  } catch {
    return ""
  }
}

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

function isInitializedPendingApplication(application: StorefrontApplication, productId: string) {
  const normalizedProductId = sanitizeProductId(productId)
  const applicationProductId = sanitizeProductId(application.productId)
  const status = String(application.status || "").toUpperCase()
  const workflowStatus = String(application.loanWorkflowStatus || "").toLowerCase()

  return (
    applicationProductId === normalizedProductId &&
    status === "PENDING" &&
    (workflowStatus === "account_created" || Boolean(application.productWallet?.upstreamAccount?.accountNumber))
  )
}

export async function getExistingInitializedApplication(userId: string, productId: string) {
  const normalizedProductId = sanitizeProductId(productId)
  if (!userId || !normalizedProductId) {
    return { ok: false as const, error: "Missing user or product.", application: null }
  }

  const res = await apiClient.get<ApiEnvelope<StorefrontApplication[]>>(
    `/v1/applications/user/${encodeURIComponent(userId)}`,
    {
      includeAuth: true,
      timeout: 30_000,
      params: {
        status: "PENDING",
        productId: normalizedProductId,
      },
    },
  )

  if (res.data?.success === false || res.status >= 400) {
    return { ok: false as const, error: parseApiError(res.data, res.status), application: null }
  }

  const applications = Array.isArray(res.data?.data) ? res.data.data : []
  const application = applications.find((app) => isInitializedPendingApplication(app, normalizedProductId)) ?? null

  if (application) saveInitializedApplication(application)
  return { ok: true as const, application }
}

export async function getProductApplicationInitStatus(userId: string, productId: string, merchantId = readTenantMerchantId()) {
  const normalizedProductId = sanitizeProductId(productId)
  if (!userId || !normalizedProductId) {
    return { ok: false as const, error: "Missing user or product.", status: null as ProductApplicationInitStatus | null }
  }

  const res = await apiClient.get<ApiEnvelope<ProductApplicationInitStatus>>(
    `/v1/applications/user/${encodeURIComponent(userId)}/products/${encodeURIComponent(normalizedProductId)}/init-status`,
    {
      includeAuth: true,
      timeout: 30_000,
      params: merchantId ? { merchantId } : undefined,
    },
  )

  if (res.data?.success === false || res.status >= 400) {
    return { ok: false as const, error: parseApiError(res.data, res.status), status: null as ProductApplicationInitStatus | null }
  }

  const status = res.data?.data ?? null
  const application = status?.application
  if (application && (status?.hasInitializedApplication || status?.hasUpstreamAccount)) {
    saveInitializedApplication({
      ...application,
      userId: application.userId || status.userId,
      productId: application.productId || status.productId || normalizedProductId,
      appId: application.appId || status.appId,
      merchantId: application.merchantId || status.merchantId,
      loanWorkflowStatus: application.loanWorkflowStatus || status.loanWorkflowStatus,
      productWallet:
        application.productWallet ||
        (status.upstreamAccount
          ? {
              upstreamAccount: status.upstreamAccount,
            }
          : undefined),
    })
  }

  return { ok: true as const, status }
}

function parseApiError(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const row = data as Record<string, unknown>
    const raw = String(row.error || row.message || row.msg || "")
    if (raw) return humanizeApplicationError(raw)
    return status >= 400 ? `Request failed (${status})` : "Upload failed"
  }
  return `Upload failed (${status})`
}

function axiosApplicationError(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const ax = error as { response?: { data?: unknown; status?: number }; message?: string }
    if (ax.response) {
      return parseApiError(ax.response.data, ax.response.status ?? 500)
    }
    if (ax.message) return humanizeApplicationError(ax.message)
  }
  if (error instanceof Error && error.message) {
    return humanizeApplicationError(error.message)
  }
  return fallback
}

function humanizeApplicationError(message: string): string {
  const m = message.trim()
  if (!m || m === "fetch failed") {
    return "Could not reach the application service. Check your connection and try again."
  }
  if (m.includes("ETIMEDOUT") || m.includes("timed out")) {
    return "The application service took too long to respond. Please try again."
  }
  if (m.includes("ECONNREFUSED") && m.includes("3004")) {
    return "Loan account provisioning is temporarily unavailable. Please try again later or contact support."
  }
  if (m.includes("Plata account provisioning")) {
    return "We could not provision your provider bank account right now. Please try again later or contact support."
  }
  if (m.includes('"bvn" is required')) {
    return "Your BVN is required. Complete identity verification (KYC) before opening this account."
  }
  const lower = m.toLowerCase()
  if (
    lower.includes("already submitted") ||
    lower.includes("already been submitted") ||
    lower.includes("application is already") ||
    lower.includes("cannot submit") ||
    lower.includes("not in draft") ||
    lower.includes("invalid status")
  ) {
    return "This application has already been submitted. Open Pending applications to continue."
  }
  return m
}

export function isApplicationAlreadySubmitted(status?: string | null): boolean {
  const s = String(status || "").trim().toUpperCase()
  return [
    "PENDING",
    "SUBMITTED",
    "UNDER_REVIEW",
    "UNDER REVIEW",
    "APPROVED",
    "ACTIVE",
    "COMPLETED",
    "DISBURSED",
    "REJECTED",
    "DECLINED",
  ].includes(s)
}

export async function initializeProductApplication(
  productId: string,
  options?: {
    amount?: number
    currency?: string
    productType?: ProductApplyBody["productType"]
    platformFields?: PlatformFields
  },
) {
  const built = await buildProductApplyBody(productId, options)
  if (!built.ok) return { ok: false as const, error: built.error }

  const payload = {
    ...built.body,
    ...(options?.platformFields ? { ...options.platformFields } : {}),
  }

  try {
    const res = await apiClient.post<ApiEnvelope<StorefrontApplication>, typeof payload>(
      "/v1/applications/init",
      payload,
      { includeAuth: true, timeout: 60_000 },
    )

    if (res.data?.success === false || (res.status !== 200 && res.status !== 201) || !res.data?.data) {
      return { ok: false as const, error: parseApiError(res.data, res.status) }
    }

    saveInitializedApplication(res.data.data)
    return { ok: true as const, application: res.data.data, applicationId: applicationIdFrom(res.data.data) }
  } catch (error: unknown) {
    return {
      ok: false as const,
      error: axiosApplicationError(error, "Could not initialize your application."),
    }
  }
}

export async function applyProductOneShot(
  productId: string,
  options?: {
    amount?: number
    currency?: string
    productType?: ProductApplyBody["productType"]
    requirementSubmissions?: unknown[]
    platformFields?: PlatformFields
  },
) {
  const built = await buildProductApplyBody(productId, options)
  if (!built.ok) return { ok: false as const, error: built.error }

  const payload = {
    ...built.body,
    ...(options?.requirementSubmissions?.length
      ? { requirementSubmissions: options.requirementSubmissions }
      : {}),
    ...(options?.platformFields ? { ...options.platformFields } : {}),
  }

  const res = await apiClient.post<ApiEnvelope<StorefrontApplication>, typeof payload>(
    "/v1/applications/apply",
    payload,
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

export async function fetchUserApplications(
  userId?: string,
  options?: {
    productType?: "LOAN" | "MORTGAGE" | string
    status?: string
    limit?: number
    /** When true, follows pagination until all matching rows are loaded (capped). */
    fetchAllPages?: boolean
  },
) {
  const resolvedUserId = userId || (await resolveWalletUserId())
  if (!resolvedUserId) {
    return { ok: false as const, error: "Sign in to continue.", applications: [] as StorefrontApplication[] }
  }

  const pageLimit = Math.min(Math.max(options?.limit ?? 100, 1), 100)
  const fetchAllPages = options?.fetchAllPages !== false
  const maxPages = 10
  const collected: StorefrontApplication[] = []

  try {
    for (let page = 1; page <= maxPages; page += 1) {
      const res = await apiClient.get<
        ApiEnvelope<StorefrontApplication[]> & {
          pagination?: {
            page?: number
            limit?: number
            total?: number
            totalPages?: number
            hasNextPage?: boolean
          }
        }
      >(`/v1/applications/user/${encodeURIComponent(resolvedUserId)}`, {
        includeAuth: true,
        timeout: 30_000,
        params: {
          page,
          limit: pageLimit,
          ...(options?.productType ? { productType: String(options.productType).toUpperCase() } : {}),
          ...(options?.status ? { status: options.status } : {}),
        },
      })

      if (res.data?.success === false || res.status >= 400) {
        return {
          ok: false as const,
          error: parseApiError(res.data, res.status),
          applications: [] as StorefrontApplication[],
        }
      }

      const pageRows = Array.isArray(res.data?.data) ? res.data.data : []
      collected.push(...pageRows)

      const pagination = res.data?.pagination
      const hasNext =
        Boolean(pagination?.hasNextPage) ||
        (typeof pagination?.totalPages === "number" && page < pagination.totalPages)

      if (!fetchAllPages || !hasNext || pageRows.length === 0) break
    }

    // Client-side safety net if upstream ignores productType
    const wantedType = options?.productType ? String(options.productType).toUpperCase() : null
    const applications = wantedType
      ? collected.filter((app) => String(app.productType || "").toUpperCase() === wantedType)
      : collected

    return { ok: true as const, applications }
  } catch (error: unknown) {
    return {
      ok: false as const,
      error: axiosApplicationError(error, "Could not load your applications."),
      applications: [] as StorefrontApplication[],
    }
  }
}

export async function buyCommodity(
  productId: string,
  quantity: number,
  _amount?: number,
  options?: { currency?: string; requirementSubmissions?: unknown[]; platformFields?: PlatformFields },
) {
  const { purchaseCommodity } = await import("@/lib/commodityApi")
  return purchaseCommodity(productId, quantity, {
    requirementSubmissions: options?.requirementSubmissions,
    platformFields: options?.platformFields,
  })
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
  try {
    const res = await apiClient.patch<ApiEnvelope<StorefrontApplication>>(
      `/v1/applications/${encodeURIComponent(applicationId)}/requirements`,
      { userId, requirementSubmissions },
      { includeAuth: true, timeout: 60_000 },
    )

    if (res.data?.success === false || res.status >= 400) {
      return { ok: false as const, error: parseApiError(res.data, res.status) }
    }

    return { ok: true as const, application: res.data?.data }
  } catch (error: unknown) {
    return {
      ok: false as const,
      error: axiosApplicationError(error, "Could not save your application requirements."),
    }
  }
}

export async function saveApplicationProgress({
  applicationId,
  userId,
  currentStep,
  currentTab,
  platformFields,
  requirementDrafts,
  uploadedDrafts,
}: {
  applicationId: string
  userId: string
  currentStep?: "apply" | "platform_fields" | string
  currentTab: ApplicationProgressTab
  platformFields?: PlatformFields
  requirementDrafts?: RequirementSubmission[]
  uploadedDrafts?: RequirementSubmission[]
}) {
  const progressPayload: Record<string, unknown> = {
    userId,
    currentStep: currentStep || "apply",
    currentTab,
    ...(requirementDrafts !== undefined ? { requirementDrafts } : {}),
    ...(uploadedDrafts !== undefined ? { uploadedDrafts } : {}),
  }

  if (platformFields && Object.keys(platformFields).length > 0) {
    progressPayload.metadata = { platformFields }
    Object.assign(progressPayload, platformFields)
  }

  try {
    const res = await apiClient.patch<ApiEnvelope<StorefrontApplication>>(
      `/v1/applications/${encodeURIComponent(applicationId)}/progress`,
      progressPayload,
      { includeAuth: true, timeout: 30_000 },
    )

    if (res.data?.success === false || res.status >= 400) {
      return { ok: false as const, error: parseApiError(res.data, res.status) }
    }

    const application = res.data?.data
    if (application) {
      const current = readInitializedApplication()
      saveInitializedApplication({
        ...(current || {}),
        ...application,
        applicationProgress: application.applicationProgress || current?.applicationProgress,
      })
    }

    return { ok: true as const, application }
  } catch (error: unknown) {
    return {
      ok: false as const,
      error: axiosApplicationError(error, "Could not save application progress."),
    }
  }
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

export type SpouseKycPerson = {
  id?: string
  fullName?: string
  email?: string
  phone?: string
  occupation?: string
  relationship?: string
  country?: string
  status?: string
  provider?: string
  providerReference?: string
  verificationUrl?: string
  requestedAt?: string
}

export type SpouseKycRequestBody = {
  fullName: string
  email: string
  phone: string
  occupation?: string
  relationship?: string
  country?: string
  userId?: string
}

/**
 * POST /api/v1/applications/:id/spouse-kyc
 * Separate from guarantors — use when applicant opts into repaying with a spouse.
 */
export async function submitApplicationSpouseKyc(applicationId: string, body: SpouseKycRequestBody) {
  try {
    const res = await apiClient.post<
      ApiEnvelope<{ spouse?: SpouseKycPerson; application?: StorefrontApplication }> & {
        verificationUrl?: string
      }
    >(`/v1/applications/${encodeURIComponent(applicationId)}/spouse-kyc`, body, {
      includeAuth: true,
      timeout: 60_000,
    })

    if (res.data?.success === false || (res.status !== 200 && res.status !== 201) || res.status >= 400) {
      return { ok: false as const, error: parseApiError(res.data, res.status) }
    }

    const spouse = res.data?.data?.spouse
    const verificationUrl =
      (typeof res.data?.verificationUrl === "string" && res.data.verificationUrl.trim()) ||
      (typeof spouse?.verificationUrl === "string" && spouse.verificationUrl.trim()) ||
      undefined

    return {
      ok: true as const,
      verificationUrl,
      spouse,
      application: res.data?.data?.application,
    }
  } catch (error: unknown) {
    return {
      ok: false as const,
      error: axiosApplicationError(error, "Could not generate the spouse KYC link."),
    }
  }
}

export async function submitInitializedApplication(
  applicationId: string,
  body: {
    userId: string
    acceptedTerms: boolean
    mortgageSelection?: Record<string, unknown>
  } & PlatformFields,
) {
  try {
    const res = await apiClient.post<ApiEnvelope<StorefrontApplication>>(
      `/v1/applications/${encodeURIComponent(applicationId)}/submit`,
      body,
      { includeAuth: true, timeout: 60_000 },
    )

    if (res.data?.success === false || res.status >= 400) {
      return { ok: false as const, error: parseApiError(res.data, res.status) }
    }

    return { ok: true as const, application: res.data?.data }
  } catch (error: unknown) {
    return {
      ok: false as const,
      error: axiosApplicationError(error, "Could not submit your application."),
    }
  }
}