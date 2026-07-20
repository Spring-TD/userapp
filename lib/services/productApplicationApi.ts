import { ENDPOINTS } from "@/lib/endpoints"
import { fetchWithAuth } from "@/lib/fetchWithAuth"
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
  return {
    ...raw,
    id: id || raw.id,
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

function shouldShowInAccounts(application: ProductApplication): boolean {
  const status = String(application.status || "").toUpperCase()
  if (status === "DRAFT" || status === "CANCELLED") return false
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

/** List user applications with provisioned product accounts (GET /v1/applications/user/{userId}). */
export async function fetchUserProductApplications(
  userId: string,
  params?: { productType?: string; appId?: string },
): Promise<{ applications: ProductApplication[]; error: string | null; status: number }> {
  const qs = new URLSearchParams()
  if (params?.productType) qs.set("productType", params.productType)
  if (params?.appId) qs.set("appId", params.appId)

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

  const applications = normalizeApplications(data).filter(shouldShowInAccounts)
  return {
    applications,
    error: null,
    status: res.status,
  }
}

/** GET /api/v1/products/applications/:applicationId */
export async function fetchProductApplicationById(
  applicationId: string,
): Promise<{ application: ProductApplication | null; error: string | null; status: number }> {
  const id = String(applicationId || "").trim()
  if (!id) {
    return { application: null, error: "Missing application id", status: 400 }
  }

  const res = await fetchWithAuth(bffUrl(`/v1/products/applications/${encodeURIComponent(id)}`), {
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
    return {
      application: matchedFromList,
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

  return {
    application: application ?? null,
    error: null,
    status: res.status,
  }
}
