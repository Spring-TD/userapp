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
 * Wallet integrations use the same upstream as the rest of the app APIs.
 */
export function getWalletProxyBaseUrl(): string {
  return getApiBaseUrl()
}
