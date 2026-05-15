/** Shared upstream HTTP for `/api/apps/*` proxies (account-ms / gateway). */

export const UPSTREAM_TIMEOUT_MS = 25_000
export const UPSTREAM_RETRY_ATTEMPTS = 2
const RETRY_DELAY_MS = 400

function collectErrorCodes(err: unknown, codes: Set<string>) {
  if (!err || typeof err !== "object") return
  const e = err as Error & { code?: string; cause?: unknown }
  if (e.code) codes.add(e.code)
  if (e.name === "AbortError" || e.name === "TimeoutError") {
    codes.add("ABORT_ERR")
  }
  if (e.cause) collectErrorCodes(e.cause, codes)
  if (Array.isArray((err as { errors?: unknown[] }).errors)) {
    for (const nested of (err as { errors: unknown[] }).errors) {
      collectErrorCodes(nested, codes)
    }
  }
}

export function isUpstreamTimeoutError(err: unknown): boolean {
  const codes = new Set<string>()
  collectErrorCodes(err, codes)
  return (
    codes.has("ETIMEDOUT") ||
    codes.has("ECONNRESET") ||
    codes.has("ECONNREFUSED") ||
    codes.has("EHOSTUNREACH") ||
    codes.has("ENETUNREACH") ||
    codes.has("ABORT_ERR") ||
    codes.has("UND_ERR_CONNECT_TIMEOUT")
  )
}

export function upstreamErrorMessage(err: unknown, fallback: string): string {
  if (isUpstreamTimeoutError(err)) {
    return `Upstream timed out after ${UPSTREAM_TIMEOUT_MS}ms`
  }
  if (err instanceof Error && err.message) return err.message
  return fallback
}

/**
 * `fetch` with timeout, no Next data cache, and one retry on transient network failures.
 */
export async function fetchUpstream(url: string, init: RequestInit = {}): Promise<Response> {
  let lastError: unknown

  for (let attempt = 0; attempt <= UPSTREAM_RETRY_ATTEMPTS; attempt++) {
    try {
      return await fetch(url, {
        ...init,
        cache: "no-store",
        signal: init.signal ?? AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      })
    } catch (e) {
      lastError = e
      const retryable = isUpstreamTimeoutError(e)
      if (!retryable || attempt >= UPSTREAM_RETRY_ATTEMPTS) throw e
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)))
    }
  }

  throw lastError
}
