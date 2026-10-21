import { ENDPOINTS } from "@/lib/endpoints"
import { fetchWithAuth } from "@/lib/fetchWithAuth"
import { queryCache } from "@/lib/sessionQueryCache"
import {
  STOREFRONT_TTL,
  invalidateStorefrontApplications,
  storefrontApplicationsKey,
} from "@/lib/storefrontSessionData"
import type {
  InitProductApplicationPayload,
  ProductApplication,
  ProductApplicationInitResponse,
} from "@/types/productApplication"

const BFF = "/api"

function bffUrl(path: string): string {
  return `${BFF}${path.startsWith("/") ? path : `/${path}`}`
}

type LooseApplication = ProductApplication & { _id?: string }

function applicationIdOf(application: LooseApplication | null | undefined): string {
  if (!application) return ""
  return String(application.id ?? application._id ?? "").trim()
}

/** Normalize Mongo-style `_id` onto `id` so list/detail lookups stay consistent. */
function normalizeApplication(raw: LooseApplication): ProductApplication {
  const id = applicationIdOf(raw)
  const loose = raw as LooseApplication & {
    approval?: ProductApplication["approval"]
    contractSnapshot?: { approval?: ProductApplication["approval"] }
  }
  const nestedPaf =
    loose.postApprovalFulfillment ||
    loose.approval?.postApprovalFulfillment ||
    loose.contractSnapshot?.approval?.postApprovalFulfillment
  const nestedDeferred =
    loose.disbursementDeferred ??
    loose.approval?.disbursementDeferred ??
    loose.contractSnapshot?.approval?.disbursementDeferred

  const productWallet =
    loose.productWallet ||
    (loose as { productWallet?: ProductApplication["productWallet"] }).productWallet ||
    (loose as { productWallet?: ProductApplication["productWallet"] }).productWallet ||
    (loose as { productWallet?: ProductApplication["productWallet"] }).productWallet

  return {
    ...raw,
    id: id || raw.id,
    ...(nestedPaf && !loose.postApprovalFulfillment
      ? { postApprovalFulfillment: nestedPaf }
      : {}),
    ...(nestedDeferred !== undefined && loose.disbursementDeferred === undefined
      ? { disbursementDeferred: nestedDeferred }
      : {}),
    ...(productWallet && !loose.productWallet ? { productWallet } : {}),
  }
}

function normalizeApplications(data: ProductApplicationInitResponse): ProductApplication[] {
  const raw = data.data
  let list: LooseApplication[] = []
  if (Array.isArray(raw)) list = raw
  else if (raw && typeof raw === "object") {
    if ("applications" in raw && Array.isArray(raw.applications)) list = raw.applications
    else if ("accounts" in raw && Array.isArray(raw.accounts)) list = raw.accounts
    else if ("application" in raw && raw.application) list = [raw.application as LooseApplication]
    else if (("id" in raw || "_id" in raw) && "productType" in raw) list = [raw as LooseApplication]
  }
  return list.map(normalizeApplication)
}

function shouldShowInAccounts(
  application: ProductApplication,
  opts?: { status?: string },
): boolean {
  const status = String(application.status || "").toUpperCase()
  if (status === "DRAFT" || status === "CANCELLED" || status === "CANCELED") return false
  // Approved list: show each approved application (do not require NUBAN yet).
  if (String(opts?.status || "").toUpperCase() === "APPROVED") {
    return Boolean(applicationIdOf(application) && (application.productId || application.productType))
  }
  const wallet = application.productWallet?.upstreamAccount
  if (wallet?.accountNumber?.trim() || wallet?.bankName?.trim() || wallet?.provisionStatus) return true
  return Boolean(applicationIdOf(application) && application.productId)
}

export function matchProductApplicationId(
  application: ProductApplication,
  applicationId: string,
): boolean {
  const target = String(applicationId || "").trim()
  if (!target) return false
  const candidate = applicationIdOf(application)
  return candidate === target
}

export type ProductApplicationListParams = {
  productType?: string
  appId?: string
  status?: string
  productId?: string
}

export type ApprovedAmountBucket = {
  totalAmount: number
  applicationCount: number
  currency: string
}

export type ApprovedProductType = "LOAN" | "MORTGAGE" | "SAVINGS" | "INVESTMENT" | "COMMODITY"

export type ApprovedAmountSummary = {
  userId: string
  appId: string
  status: "APPROVED" | string
  summary: Partial<Record<ApprovedProductType, ApprovedAmountBucket>>
}

/** GET /v1/applications/user/:userId/approved-amount-summary?appId= */
export async function fetchApprovedAmountSummary(
  userId: string,
  appId: string,
): Promise<{ summary: ApprovedAmountSummary | null; error: string | null; status: number }> {
  const key = `storefront:approved-summary:${userId}:${appId}`
  return queryCache(key, () => fetchApprovedAmountSummaryUncached(userId, appId), STOREFRONT_TTL.applications)
}

async function fetchApprovedAmountSummaryUncached(
  userId: string,
  appId: string,
): Promise<{ summary: ApprovedAmountSummary | null; error: string | null; status: number }> {
  const qs = new URLSearchParams({ appId })
  const path = ENDPOINTS.applications.approvedAmountSummary(userId)
  const url = bffUrl(`${path}?${qs}`)
  const res = await fetchWithAuth(url, { method: "GET" })
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean
    data?: ApprovedAmountSummary
    error?: string
    message?: string
  }

  if (!res.ok || data.success === false) {
    return {
      summary: null,
      error: data.error || data.message || "Unable to load account totals",
      status: res.status,
    }
  }

  return {
    summary: data.data ?? null,
    error: null,
    status: res.status,
  }
}

/** List user applications (GET /v1/applications/user/{userId}). */
export async function fetchUserProductApplications(
  userId: string,
  params?: ProductApplicationListParams,
): Promise<{ applications: ProductApplication[]; error: string | null; status: number }> {
  return queryCache(
    storefrontApplicationsKey(userId, params),
    () => fetchUserProductApplicationsUncached(userId, params),
    STOREFRONT_TTL.applications,
  )
}

async function fetchUserProductApplicationsUncached(
  userId: string,
  params?: ProductApplicationListParams,
): Promise<{ applications: ProductApplication[]; error: string | null; status: number }> {
  const qs = new URLSearchParams()
  if (params?.productType) qs.set("productType", params.productType)
  if (params?.appId) qs.set("appId", params.appId)
  if (params?.status) qs.set("status", params.status)
  if (params?.productId) qs.set("productId", params.productId)

  const path = ENDPOINTS.applications.user(userId)
  const url = bffUrl(qs.toString() ? `${path}?${qs}` : path)
  const res = await fetchWithAuth(url, { method: "GET" })
  const data = (await res.json().catch(() => ({}))) as ProductApplicationInitResponse

  if (!res.ok) {
    return {
      applications: [],
      error: data.error || data.message || `Failed to load product accounts (${res.status})`,
      status: res.status,
    }
  }

  const applications = normalizeApplications(data).filter((app) =>
    shouldShowInAccounts(app, { status: params?.status }),
  )

  return {
    applications,
    error: null,
    status: res.status,
  }
}

/** GET /api/v1/applications/:applicationId */
export async function fetchProductApplicationById(
  applicationId: string,
): Promise<{ application: ProductApplication | null; error: string | null; status: number }> {
  const id = String(applicationId || "").trim()
  if (!id) {
    return { application: null, error: "Missing application id", status: 400 }
  }

  const res = await fetchWithAuth(bffUrl(ENDPOINTS.applications.byId(id)), {
    method: "GET",
  })
  const data = (await res.json().catch(() => ({}))) as ProductApplicationInitResponse
  const [application] = normalizeApplications(data)

  if (!res.ok) {
    return {
      application: null,
      error: data.error || data.message || `Failed to load application (${res.status})`,
      status: res.status,
    }
  }

  return {
    application: application ?? null,
    error: null,
    status: res.status,
  }
}

/**
 * Resolve one application for the accounts detail screen.
 * Prefer direct by-id fetch, then fall back to user list (with productType when known).
 */
export async function resolveUserProductApplication(
  userId: string,
  applicationId: string,
  options?: { productType?: string; appId?: string },
): Promise<{
  application: ProductApplication | null
  applications: ProductApplication[]
  error: string | null
}> {
  const targetId = String(applicationId || "").trim()
  if (!targetId) {
    return { application: null, applications: [], error: "Missing application id" }
  }

  const byId = await fetchProductApplicationById(targetId)
  if (byId.application && matchProductApplicationId(byId.application, targetId)) {
    const productType = String(byId.application.productType || options?.productType || "").toUpperCase()
    const list = await fetchUserProductApplications(userId, {
      productType: productType || undefined,
      appId: options?.appId,
    })
    const applications = list.applications
    const matchedFromList =
      applications.find((item) => matchProductApplicationId(item, targetId)) ?? byId.application
    // Prefer list wallet/NUBAN when present, but keep by-id disbursement signals.
    const application =
      matchedFromList && byId.application && matchedFromList !== byId.application
        ? {
            ...matchedFromList,
            postApprovalFulfillment:
              byId.application.postApprovalFulfillment || matchedFromList.postApprovalFulfillment,
            amortizationSchedule:
              byId.application.amortizationSchedule || matchedFromList.amortizationSchedule,
            loanWorkflowStatus:
              byId.application.loanWorkflowStatus || matchedFromList.loanWorkflowStatus,
            disbursementDeferred:
              byId.application.disbursementDeferred ?? matchedFromList.disbursementDeferred,
            approval: byId.application.approval || matchedFromList.approval,
          }
        : matchedFromList
    return {
      application,
      applications: applications.length > 0 ? applications : [byId.application],
      error: null,
    }
  }

  const productTypes = options?.productType
    ? [options.productType]
    : ["MORTGAGE", "LOAN", "SAVINGS", "INVESTMENT", "COMMODITY", undefined]

  let lastError: string | null = byId.error
  for (const productType of productTypes) {
    const list = await fetchUserProductApplications(userId, {
      productType,
      appId: options?.appId,
    })
    if (list.error) {
      lastError = list.error
      continue
    }
    const matched = list.applications.find((item) => matchProductApplicationId(item, targetId)) ?? null
    if (matched) {
      return { application: matched, applications: list.applications, error: null }
    }
  }

  return {
    application: null,
    applications: [],
    error: lastError || "Account record not found.",
  }
}

export async function initializeProductApplication(
  payload: InitProductApplicationPayload,
): Promise<{ application: ProductApplication | null; error: string | null; status: number }> {
  const res = await fetchWithAuth(bffUrl(ENDPOINTS.applications.init), {
    method: "POST",
    body: JSON.stringify(payload),
  })
  const data = (await res.json().catch(() => ({}))) as ProductApplicationInitResponse
  const [application] = normalizeApplications(data)

  if (!res.ok) {
    return {
      application: null,
      error: data.error || data.message || `Failed to initialize application (${res.status})`,
      status: res.status,
    }
  }

  invalidateStorefrontApplications(payload.userId)

  return {
    application: application ?? null,
    error: null,
    status: res.status,
  }
}
