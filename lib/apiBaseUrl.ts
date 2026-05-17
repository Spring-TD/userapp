const FALLBACK_WHEN_UNSET = "https://account-ms.fly.dev"

function stripTrailingApiPath(origin: string): string {
  let u = origin.replace(/\/+$/, "")
  u = u.replace(/\/api\/v\d+$/i, "")
  u = u.replace(/\/api$/i, "")
  return u.replace(/\/+$/, "")
}

export function getApiBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL?.trim() || FALLBACK_WHEN_UNSET).replace(/\/+$/, "")
  return stripTrailingApiPath(raw)
}

/**
 * Wallet BFF upstream — derived from `NEXT_PUBLIC_API_URL` via {@link getApiBaseUrl}.
 *
 * On Fly, `account-ms.fly.dev` serves apps/auth but forwards wallet paths as `/user/:id` (404).
 * `wallet-ms.fly.dev` exposes the documented `/api/v1/wallets/user/:userId` routes.
 * When the API host is `account-ms.*`, wallet calls use the sibling `wallet-ms.*` host.
 */
export function getWalletProxyBaseUrl(): string {
  const base = getApiBaseUrl()
  try {
    const url = new URL(base.startsWith("http") ? base : `https://${base}`)
    if (/^account-ms\./i.test(url.hostname)) {
      url.hostname = url.hostname.replace(/^account-ms\./i, "wallet-ms.")
      return url.origin
    }
  } catch {
    /* keep base */
  }
  return base
}
