const FALLBACK_WHEN_UNSET = "https://account-ms.fly.dev"
/** account-ms strips `/api/v1/wallets` when proxying; wallet-ms needs the full path. */
const WALLET_FALLBACK = "https://wallet-ms.fly.dev"

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
 * Wallet BFF upstream. Defaults to wallet-ms because account-ms forwards only the
 * suffix (e.g. `/user/:id`), which wallet-ms does not mount.
 */
export function getWalletProxyBaseUrl(): string {
  const raw =
    process.env.WALLET_SERVICE_URL?.trim() ||
    process.env.NEXT_PUBLIC_WALLET_SERVICE_URL?.trim() ||
    WALLET_FALLBACK
  return stripTrailingApiPath(raw)
}
