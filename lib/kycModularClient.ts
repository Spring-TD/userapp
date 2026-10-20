import { fetchWithAuth } from "@/lib/fetchWithAuth"
import { isModularVerificationSucceeded } from "@/lib/kycApproval"
import type {
  KycModularStatusResponse,
  KycModularVerificationCreateResponse,
  KycModularVerificationUrlData,
  KycModularVerificationUrlResponse,
} from "@/types/kycModular"

export const MODULAR_KYC_VERIFICATION_ID_KEY = "mobile-v2-modular-kyc-verification-id"

function stripTrailingSlash(s: string): string {
  return s.replace(/\/+$/, "")
}

/** Fuspay or compliance-ms: no usable `fuspay.customerId` on the logged-in user's KYC profile. */
export function isFuspayCustomerMissingError(message: string | undefined | null): boolean {
  if (!message?.trim()) return false
  const m = message.toLowerCase()
  return (
    /customer\s*id\s*is\s*required/i.test(message) ||
    /fuspay\s+user\s+id\s+missing/i.test(message) ||
    m.includes("fuspay.customerid")
  )
}

export const KYC_TENANT_REQUIRED_MESSAGE =
  "Open this app from your store link (e.g. crbc.tryspring.io) or add ?subdomain=crbc for local testing so tenant headers match signup."

export const KYC_FUSPAY_MISSING_MESSAGE =
  "Fuspay customer was not linked at signup. Register again from your store URL with Fuspay enabled, or contact support."

/** Redirect target after FusPay hosted flow completes. */
export function modularKycRedirectUrl(): string {
  if (typeof window === "undefined") return "/mobile-v2/kyc/done"
  return `${window.location.origin}/mobile-v2/kyc/done`
}

/**
 * POST /api/v1/kyc/modular/verification body.
 * Do not send `user_id` or `customer_id` — compliance resolves FusPay customer from JWT.
 */
export function buildModularVerificationPostBody(): Record<string, unknown> {
  return {
    kyc_type: "individual",
    country: "NG",
    redirect: modularKycRedirectUrl(),
  }
}

function pickHttpUrl(...candidates: (string | undefined | null)[]): string | null {
  for (const c of candidates) {
    const t = c?.trim()
    if (t && /^https?:\/\//i.test(t)) return t
  }
  return null
}

const TERMINAL_SUCCESS = new Set(["approved", "completed", "verified", "success"])

function normalizeStatusToken(value: string | undefined | null): string {
  return (value || "").trim().toLowerCase().replace(/\s+/g, "_")
}

export function isModularKycCompleteFromUrlData(data?: KycModularVerificationUrlData | null): boolean {
  if (!data) return false
  const status = normalizeStatusToken(data.overallStatus || data.status)
  return TERMINAL_SUCCESS.has(status)
}

/** POST create — `verification_url` / `verificationUrl` top-level or under `data`. */
export function pickVerificationUrlFromCreate(
  payload: KycModularVerificationCreateResponse | null | undefined,
): string | null {
  if (!payload || typeof payload !== "object") return null
  const d = payload.data
  return pickHttpUrl(
    payload.verification_url,
    payload.verificationUrl,
    d && typeof d === "object" ? d.verification_url : undefined,
    d && typeof d === "object" ? d.verificationUrl : undefined,
    d && typeof d === "object" ? d.url : undefined,
  )
}

export function pickVerificationIdFromCreate(
  payload: KycModularVerificationCreateResponse | null | undefined,
): string | null {
  if (!payload || typeof payload !== "object") return null
  const d = payload.data
  const id = payload.verification_id || (d && typeof d === "object" ? d.verificationId : undefined)
  return id?.trim() || null
}

/** GET verification-url — snake_case or camelCase in `data`. */
export function pickVerificationUrlFromGet(
  payload: KycModularVerificationUrlResponse | null | undefined,
): string | null {
  if (!payload?.data) return null
  const d = payload.data as KycModularVerificationUrlData & {
    verification_url?: string
  }
  return pickHttpUrl(d.verificationUrl, d.verification_url)
}

export function pickVerificationIdFromGet(
  payload: KycModularVerificationUrlResponse | null | undefined,
): string | null {
  return payload?.data?.verificationId?.trim() || null
}

function parseApiError(json: Record<string, unknown>, fallback: string): string {
  const msg = json.error || json.message
  const raw = typeof msg === "string" && msg.trim() ? msg.trim() : fallback
  return formatKycClientError(raw)
}

/** User-friendly copy for proxy/network failures (raw message is often "fetch failed"). */
export function formatKycClientError(message: string): string {
  const m = message.trim()
  if (!m) return "Something went wrong. Please try again."
  if (/fetch failed|timed out|timeout|etimedout|network|upstream timed out|econnreset|econnrefused/i.test(m)) {
    return "Could not reach the verification service. Check your connection and tap Complete KYC to try again."
  }
  return m
}

export function isKycNetworkError(message: string | undefined | null): boolean {
  if (!message?.trim()) return false
  return /fetch failed|timed out|timeout|etimedout|network|upstream timed out|econnreset|econnrefused/i.test(message)
}

function storeVerificationId(id: string | null | undefined) {
  if (typeof window === "undefined" || !id?.trim()) return
  try {
    sessionStorage.setItem(MODULAR_KYC_VERIFICATION_ID_KEY, id.trim())
  } catch {
    /* ignore */
  }
}

export async function getModularVerificationUrl(): Promise<KycModularVerificationUrlResponse | null> {
  let res: Response
  try {
    res = await fetchWithAuth("/api/v1/kyc/modular/verification-url", { method: "GET" })
  } catch {
    return null
  }
  if (res.status === 404) return null
  // Transient gateway failures on GET should not block POST create for new users.
  if (res.status === 502 || res.status === 504) return null
  const json = (await res.json().catch(() => ({}))) as KycModularVerificationUrlResponse & Record<string, unknown>
  if (!res.ok) {
    throw new Error(parseApiError(json, "Could not load KYC verification link"))
  }
  const verificationId = pickVerificationIdFromGet(json)
  storeVerificationId(verificationId)
  return json
}

export async function createModularVerification(): Promise<KycModularVerificationCreateResponse> {
  let res: Response
  try {
    res = await fetchWithAuth("/api/v1/kyc/modular/verification", {
      method: "POST",
      body: JSON.stringify(buildModularVerificationPostBody()),
    })
  } catch (err) {
    throw new Error(formatKycClientError(err instanceof Error ? err.message : "Could not create KYC verification link"))
  }
  const json = (await res.json().catch(() => ({}))) as KycModularVerificationCreateResponse & Record<string, unknown>
  if (!res.ok) {
    throw new Error(parseApiError(json, "Could not create KYC verification link"))
  }
  const verificationId = pickVerificationIdFromCreate(json)
  storeVerificationId(verificationId)
  return json
}

export async function getModularVerificationStatus(verificationId: string): Promise<KycModularStatusResponse> {
  const id = verificationId.trim()
  if (!id) throw new Error("verification_id is required")
  const res = await fetchWithAuth(`/api/v1/kyc/modular/status/${encodeURIComponent(id)}`, { method: "GET" })
  const json = (await res.json().catch(() => ({}))) as KycModularStatusResponse & Record<string, unknown>
  if (!res.ok) {
    throw new Error(parseApiError(json, "Could not load KYC status"))
  }
  return json
}

export type ModularKycLinkResult = {
  url: string
  verificationId: string | null
  status?: string
  reused?: boolean
  fromExisting?: boolean
}

/**
 * Recommended cold-start flow: GET saved link first; POST only when none exists (404).
 */
export async function resolveModularKycLink(): Promise<ModularKycLinkResult> {
  const existing = await getModularVerificationUrl()
  if (existing) {
    const url = pickVerificationUrlFromGet(existing)
    if (url) {
      return {
        url,
        verificationId: pickVerificationIdFromGet(existing),
        status: existing.data?.overallStatus || existing.data?.status,
        fromExisting: true,
      }
    }
  }

  const created = await createModularVerification()
  const url = pickVerificationUrlFromCreate(created)
  if (!url) {
    throw new Error("Verification link was not returned by the server")
  }
  return {
    url,
    verificationId: pickVerificationIdFromCreate(created),
    status: created.data?.status,
    reused: created.reusedExistingVerification === true,
    fromExisting: created.reusedExistingVerification === true,
  }
}

/** Poll modular status endpoint or fall back to verification-url snapshot. */
export async function refreshModularKycStatus(verificationId?: string | null): Promise<{
  complete: boolean
  status: string
  verificationId: string | null
}> {
  const storedId =
    verificationId?.trim() ||
    (typeof window !== "undefined" ? sessionStorage.getItem(MODULAR_KYC_VERIFICATION_ID_KEY)?.trim() : null) ||
    null

  if (storedId) {
    try {
      const statusPayload = await getModularVerificationStatus(storedId)
      if (isModularVerificationSucceeded(statusPayload)) {
        return { complete: true, status: normalizeStatusToken(extractModularStatusFromPayload(statusPayload)), verificationId: storedId }
      }
      return {
        complete: false,
        status: normalizeStatusToken(extractModularStatusFromPayload(statusPayload)) || "pending",
        verificationId: storedId,
      }
    } catch {
      /* fall through to verification-url */
    }
  }

  const snapshot = await getModularVerificationUrl()
  const complete = isModularKycCompleteFromUrlData(snapshot?.data)
  return {
    complete,
    status: normalizeStatusToken(snapshot?.data?.overallStatus || snapshot?.data?.status) || (complete ? "completed" : "pending"),
    verificationId: pickVerificationIdFromGet(snapshot),
  }
}

function extractModularStatusFromPayload(payload: KycModularStatusResponse): string {
  if (payload.data?.overallStatus) return payload.data.overallStatus
  if (payload.data?.status) return payload.data.status
  if (payload.data?.data?.status) return payload.data.data.status
  if (typeof payload.status === "string") return payload.status
  return ""
}

export function openModularKycUrl(url: string) {
  const target = url.trim()
  if (!target) return
  window.location.assign(target)
}
