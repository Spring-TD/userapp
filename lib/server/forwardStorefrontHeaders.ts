import type { NextRequest } from "next/server"

/** Headers account-ms / client-auth-ms use to resolve tenant storefront context. */
export function forwardStorefrontHeaders(request: NextRequest): Record<string, string> {
  const out: Record<string, string> = {}

  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host")?.trim() ||
    ""

  // Server-side BFF only — do not forward `Origin` (account-ms CORS rejects localhost origins).
  // Browser CORS is satisfied by same-origin `/api/*`; tenant context uses headers below + body.
  if (host) {
    out["X-Forwarded-Host"] = host
  }

  const appId = request.headers.get("x-tenant-app-id")?.trim()
  const merchantId = request.headers.get("x-tenant-merchant-id")?.trim()
  const subdomain = request.headers.get("x-tenant-subdomain")?.trim()
  if (appId) out["x-tenant-app-id"] = appId
  if (merchantId) out["x-tenant-merchant-id"] = merchantId
  if (subdomain) out["x-tenant-subdomain"] = subdomain

  return out
}
