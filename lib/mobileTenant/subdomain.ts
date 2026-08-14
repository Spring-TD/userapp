/**
 * Wildcard-subdomain helpers for mobile v2.
 * When `rootDomain` is omitted, multi-label hosts (e.g. `shop.example.com`) still yield `shop`
 * via a simple heuristic.
 *
 * Local: `crbc.localhost:3000` (or `?subdomain=crbc` on plain localhost).
 * Leading `www.` is stripped so `www.crbc.tryspring.io` resolves as `crbc`.
 */

const RESERVED_SUBDOMAINS = new Set([
  "www",
  "admin",
  "api",
  "app",
  "cdn",
  "static",
  "assets",
  "mail",
  "ftp",
  "staging",
  "dev",
  "test",
  "localhost",
])

export function isReservedSubdomain(label: string): boolean {
  return RESERVED_SUBDOMAINS.has(label.toLowerCase())
}

/** Hostname without port or a leading www. */
export function normalizeStorefrontHost(hostname: string): string {
  return hostname
    .split(":")[0]
    .trim()
    .toLowerCase()
    .replace(/^www\./, "")
}

/**
 * Extract tenant subdomain label from hostname when host is under rootDomain.
 * @param hostname e.g. myshop.example.com or www.myshop.example.com (no port)
 * @param rootDomain e.g. example.com or tryspring.io (lowercase, no scheme)
 */
function tenantLabelFromLocalhost(host: string): string | null {
  if (!host.endsWith(".localhost")) return null
  const label = host.slice(0, -".localhost".length)
  if (!label || label.includes(".") || isReservedSubdomain(label)) return null
  return label
}

export function getTenantSubdomainFromHost(hostname: string, rootDomain?: string | null): string | null {
  const host = normalizeStorefrontHost(hostname)
  if (!host || host === "localhost" || host === "127.0.0.1") return null
  if (host.endsWith(".vercel.app")) return null

  const localLabel = tenantLabelFromLocalhost(host)
  if (localLabel) return localLabel

  const rd = normalizeStorefrontHost(rootDomain || "")
    .replace(/^\.+/, "")
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "")

  if (!rd) {
    const parts = host.split(".").filter(Boolean)
    if (parts.length >= 3) {
      const label = parts[0]
      if (label && !isReservedSubdomain(label)) return label
    }
    return null
  }

  if (host === rd) return null
  if (!host.endsWith(`.${rd}`)) return null

  const prefix = host.slice(0, host.length - rd.length - 1)
  // Only a single label is a tenant (crbc.tryspring.io). Nested www already stripped.
  if (!prefix || prefix.includes(".")) return null
  if (isReservedSubdomain(prefix)) return null
  return prefix
}
