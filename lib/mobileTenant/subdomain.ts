/**
 * Wildcard-subdomain helpers for mobile v2.
 * When `rootDomain` is omitted, multi-label hosts (e.g. `shop.example.com`) still yield `shop`
 * via a simple heuristic; use `?subdomain=` on localhost.
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

/**
 * Extract tenant subdomain label from hostname when host is under rootDomain.
 * @param hostname e.g. myshop.example.com (no port)
 * @param rootDomain e.g. example.com (lowercase, no scheme)
 */
export function getTenantSubdomainFromHost(hostname: string, rootDomain?: string | null): string | null {
  const host = hostname.split(":")[0].toLowerCase()
  if (!host || host === "localhost" || host.endsWith(".localhost")) return null
  if (host === "127.0.0.1") return null
  if (host.endsWith(".vercel.app")) return null

  const rd = (rootDomain || "").trim().toLowerCase().replace(/^\.+/, "")
  if (!rd) {
    const parts = host.split(".").filter(Boolean)
    if (parts.length >= 3) {
      const label = parts[0]
      if (label && !isReservedSubdomain(label)) return label
    }
    return null
  }

  if (host === rd || host === `www.${rd}`) return null
  if (!host.endsWith(`.${rd}`)) return null

  const prefix = host.slice(0, host.length - rd.length - 1)
  if (!prefix || prefix.includes(".")) {
    return null
  }
  if (isReservedSubdomain(prefix)) return null
  return prefix
}
