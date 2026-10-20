const PREFIX = "[mobile-auth]"

/** Enable: dev mode, `?debugAuth=1`, `localStorage.mobile-auth-debug=1`, or `NEXT_PUBLIC_MOBILE_AUTH_DEBUG=1`. */
export function isMobileAuthDebugEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_MOBILE_AUTH_DEBUG === "1") return true
  if (process.env.NODE_ENV === "development") return true
  if (typeof window !== "undefined") {
    try {
      if (new URLSearchParams(window.location.search).get("debugAuth") === "1") return true
      if (localStorage.getItem("mobile-auth-debug") === "1") return true
    } catch {
      /* ignore */
    }
  }
  return false
}

export function mobileAuthLog(step: string, detail?: Record<string, unknown>): void {
  if (!isMobileAuthDebugEnabled()) return
  if (detail !== undefined) {
    console.log(PREFIX, step, detail)
  } else {
    console.log(PREFIX, step)
  }
}

export function mobileAuthWarn(step: string, detail?: Record<string, unknown>): void {
  if (!isMobileAuthDebugEnabled()) return
  console.warn(PREFIX, step, detail ?? "")
}

export function mobileAuthError(step: string, detail?: Record<string, unknown>): void {
  console.error(PREFIX, step, detail ?? "")
}

export function redactRegisterPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const out = { ...payload }
  if ("password" in out) out.password = "[REDACTED]"
  return out
}

export function summarizeAxiosError(error: unknown): Record<string, unknown> {
  const e = error as {
    message?: string
    code?: string
    response?: { status?: number; data?: unknown }
    config?: { url?: string; method?: string }
  }
  return {
    message: e?.message,
    code: e?.code,
    status: e?.response?.status,
    url: e?.config?.url,
    method: e?.config?.method,
    responseData: e?.response?.data,
  }
}
