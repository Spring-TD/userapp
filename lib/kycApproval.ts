/**
 * Normalize KYC status from getKycStatusForCurrentUser() / GET /api/v1/kyc/status/:userId.
 * Canonical shape:
 * { success: true, data: { userId, userType, status: "approved" | ..., ... } }
 * Use this everywhere we gate UI (merchant dashboard, sidebars, sign-in redirect).
 */

function pickStatus(obj: unknown): string | undefined {
  if (obj == null) return undefined
  if (typeof obj === "string") return obj
  if (typeof obj !== "object") return undefined
  const r = obj as Record<string, unknown>

  const candidates = [r.status, r.kycStatus, r.approvalStatus, r.verificationStatus]
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c
  }

  const inner = r.data
  if (inner != null && typeof inner === "object") {
    const d = inner as Record<string, unknown>
    const innerCandidates = [d.status, d.kycStatus, d.approvalStatus, d.verificationStatus]
    for (const c of innerCandidates) {
      if (typeof c === "string" && c.trim()) return c
    }
    const deep = d.data
    if (deep != null && typeof deep === "object") {
      const d2 = deep as Record<string, unknown>
      const deepCandidates = [d2.status, d2.kycStatus, d2.approvalStatus]
      for (const c of deepCandidates) {
        if (typeof c === "string" && c.trim()) return c
      }
    }
  }

  return undefined
}

/** Raw status string from API response body (any common nesting). */
export function extractKycStatusString(res: unknown): string | undefined {
  return pickStatus(res)
}

const LEGACY_PASS_STATUSES = new Set(["approved", "completed", "verified", "success"])

/** Normalized status token from legacy GET /api/v1/kyc/status/:userId style payloads. */
export function normalizedKycStatus(res: unknown): string {
  return extractKycStatusString(res)?.trim().toLowerCase().replace(/\s+/g, "_") ?? ""
}

/** True when gateway user KYC is in a terminal success state (legacy status endpoint). */
export function isKycStatusApproved(res: unknown): boolean {
  const s = normalizedKycStatus(res)
  return LEGACY_PASS_STATUSES.has(s)
}

/** Same as {@link isKycStatusApproved} — explicit alias for routing copy. */
export function isKycVerificationComplete(res: unknown): boolean {
  return isKycStatusApproved(res)
}

/** True when GET /api/v1/user/profile reports KYC done (`kycCompleted` or terminal `kycStatus`). */
export function isUserKycApprovedFromProfile(
  kycStatus?: string | null,
  kycCompleted?: boolean | null,
): boolean {
  if (kycCompleted === true) return true
  const s = (kycStatus || "").trim().toLowerCase().replace(/\s+/g, "_")
  return LEGACY_PASS_STATUSES.has(s)
}

/** localStorage flag when status API confirmed KYC complete (offline fallback if later requests fail). */
export const MOBILE_USER_KYC_COMPLETE_KEY = "mobile_user_kyc_complete_v1"

/** Extract modular poll status (GET …/kyc/modular/status/:verificationId). */
export function extractModularStatusString(payload: unknown): string {
  if (payload == null || typeof payload !== "object") return ""
  const o = payload as Record<string, unknown>
  const d = o.data
  if (d != null && typeof d === "object") {
    const inner = d as Record<string, unknown>
    const dd = inner.data
    if (dd != null && typeof dd === "object") {
      const s = (dd as Record<string, unknown>).status
      if (typeof s === "string") return s
    }
    const s2 = inner.status
    if (typeof s2 === "string") return s2
  }
  const s = o.status
  return typeof s === "string" ? s : ""
}

/** Terminal success for Fuspay modular status polling. */
export function isModularVerificationSucceeded(payload: unknown): boolean {
  const s = extractModularStatusString(payload).trim().toLowerCase().replace(/\s+/g, "_")
  return LEGACY_PASS_STATUSES.has(s)
}
