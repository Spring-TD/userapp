/**
 * Allowlist for `/api/v1/client-ms/*` → client-auth-ms `/api/v1/*`.
 * Blocks unrelated paths (e.g. apps, wallets) from being forwarded through this proxy.
 */
export function isAllowedClientAuthMsPath(segments: string[]): boolean {
  if (segments.length === 0) return false
  const a = segments[0]
  const b = segments[1]
  const c = segments[2]

  switch (a) {
    case "registration": {
      const sub = segments[1]
      if (segments.length === 1) return true
      if (sub === "forms" && segments.length === 2) return true
      if ((sub === "merchant" || sub === "user" || sub === "admin") && segments.length >= 2) return true
      return false
    }
    case "auth":
      return true
    case "otp":
      return ["generate", "verify", "resend"].includes(b || "")
    case "password": {
      if (b === "forgot" || b === "reset") return segments.length === 2
      if (b === "change") {
        if (segments.length === 2) return true
        if (segments.length === 3 && c === "request-otp") return true
      }
      return false
    }
    case "user":
      return true
    case "invitations":
      return true
    case "sessions":
      return true
    case "faqs":
      return segments.length <= 2
    case "support-contacts":
      return segments.length <= 2
    case "legal-documents":
      return segments.length <= 2
    case "roles":
      return true
    default:
      return false
  }
}
