/**
 * Normalizes `NEXT_PUBLIC_API_URL` (e.g. https://client-auth-ms.fly.dev/) for building absolute URLs on the client.
 */
export function getPublicApiOrigin(): string {
  let raw = (process.env.NEXT_PUBLIC_API_URL || "").trim()
  if (!raw) return ""
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`
  try {
    const u = new URL(raw)
    return `${u.protocol}//${u.host}`
  } catch {
    return raw.replace(/\/+$/, "")
  }
}

/** Default modular KYC webhook path on the same host as `NEXT_PUBLIC_API_URL`. */
export function defaultKycModularWebhookUrl(): string {
  const origin = getPublicApiOrigin()
  return origin ? `${origin}/api/v1/kyc/modular/webhook` : ""
}
