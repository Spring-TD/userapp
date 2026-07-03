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

function normalizeApplications(data: ProductApplicationInitResponse): ProductApplication[] {
  const raw = data.data
  if (Array.isArray(raw)) return raw
  if (!raw || typeof raw !== "object") return []
  if ("applications" in raw && Array.isArray(raw.applications)) return raw.applications
  if ("accounts" in raw && Array.isArray(raw.accounts)) return raw.accounts
  if ("application" in raw && raw.application) return [raw.application]
  if ("id" in raw && "productType" in raw) return [raw as ProductApplication]
  return []
}

function shouldShowInAccounts(application: ProductApplication): boolean {
  const status = String(application.status || "").toUpperCase()
  if (status === "DRAFT" || status === "CANCELLED") return false
  const wallet = application.productWallet?.upstreamAccount
  if (wallet?.accountNumber?.trim() || wallet?.bankName?.trim() || wallet?.provisionStatus) return true
  return Boolean(application.id && application.productId)
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
