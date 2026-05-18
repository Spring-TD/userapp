import type {
  KycModularVerificationCreateResponse,
  KycModularVerificationUrlData,
  KycModularVerificationUrlResponse,
} from "@/types/kycModular"

function stripTrailingSlash(s: string): string {
  return s.replace(/\/+$/, "")
}

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
