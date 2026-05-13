/**
 * **User-App** — `NEXT_PUBLIC_API_URL` with **User-App** fallback only.
 *
 * Fallback when unset: `https://client-auth-ms.fly.dev` ([Client Authentication Microservice](https://client-auth-ms.fly.dev/)).
 * Other frontends use the same env name with different defaults (see their `lib/*apiBaseUrl*.ts`).
 *
 * Trailing `/`, `/api`, and `/api/v1` are stripped so `/api/v1/...` paths append cleanly.
 */
const FALLBACK_WHEN_UNSET = "https://client-auth-ms.fly.dev"

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
