import type {
  KycModularVerificationCreateResponse,
  KycModularVerificationUrlData,
  KycModularVerificationUrlResponse,
} from "@/types/kycModular"

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

/**
 * POST /api/v1/kyc/modular/verification body.
 * Prod with `FUSPAY_MODULAR_VERIFICATION_CALLBACK` on compliance-ms: `{}`.
 * Local / missing env callback: `{ country, callback, redirect }` (extended path).
 * Do not send `customer_id` — compliance resolves it from the JWT user's KYC profile.
 */
export function buildModularVerificationPostBody(): Record<string, unknown> {
  if (typeof window === "undefined") return {}

  const apiBase = stripTrailingSlash((process.env.NEXT_PUBLIC_API_URL || "").trim())
  const forceExtended =
    process.env.NEXT_PUBLIC_KYC_MODULAR_USE_EXTENDED_BODY === "1" ||
    process.env.NEXT_PUBLIC_KYC_MODULAR_USE_EXTENDED_BODY === "true"
  const isLocal =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "[::1]"

  if (!forceExtended && !isLocal) return {}
  if (!apiBase.startsWith("http")) return {}

  return {
    country: "NG",
    callback: `${apiBase}/api/v1/kyc/modular/webhook`,
    redirect: `${window.location.origin}/mobile-v2/kyc/done`,
  }
}

function pickHttpUrl(...candidates: (string | undefined | null)[]): string | null {
  for (const c of candidates) {
    const t = c?.trim()
    if (t && /^https?:\/\//i.test(t)) return t
  }
  return null
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
    d && typeof d === "object" ? (d as { verification_url?: string }).verification_url : undefined,
    d && typeof d === "object" ? (d as { verificationUrl?: string }).verificationUrl : undefined,
  )
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
