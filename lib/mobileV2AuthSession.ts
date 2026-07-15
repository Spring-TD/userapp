/**
 * Mobile storefront session helpers — redirect to login when unauthenticated.
 */

import { getAccessToken } from "@/lib/cookieAuth"
import { clearSecureTokens } from "@/lib/tokenManager"

export const MOBILE_V2_LOGIN_PATH = "/mobile-v2/auth/login"

const AUTH_PUBLIC_PREFIXES = ["/mobile-v2/auth/"] as const

export function isMobileV2AuthPublicPath(pathname: string): boolean {
  // Root serves the storefront splash/onboarding entry.
  if (pathname === "/" || pathname === "/mobile-v2") return true
  return AUTH_PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export function isMobileV2ProtectedPath(pathname: string): boolean {
  return pathname.startsWith("/mobile-v2") && !isMobileV2AuthPublicPath(pathname)
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=")
    return JSON.parse(atob(padded)) as Record<string, unknown>
  } catch {
    return null
  }
}

export function isAccessTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token)
  const exp = payload?.exp
  if (typeof exp !== "number") return false
  return exp * 1000 < Date.now()
}

export function hasValidAccessToken(): boolean {
  const token = getAccessToken()
  if (!token) return false
  return !isAccessTokenExpired(token)
}

export function isAuthFailureStatus(status: number): boolean {
  return status === 401 || status === 403
}

export function isAuthFailureMessage(error: string | null | undefined): boolean {
  if (!error) return false
  const normalized = error.toLowerCase()
  return (
    normalized.includes("token expired") ||
    normalized.includes("invalid token") ||
    normalized.includes("no access token") ||
    normalized.includes("not authenticated") ||
    normalized.includes("unauthorized") ||
    normalized.includes("authentication required")
  )
}

let redirecting = false

export async function clearSessionCookies(): Promise<void> {
  await clearSecureTokens()
}

export function redirectToMobileV2Login(returnTo?: string): void {
  if (typeof window === "undefined" || redirecting) return

  const pathname = window.location.pathname
  if (isMobileV2AuthPublicPath(pathname)) return

  redirecting = true
  const params = new URLSearchParams()
  const next = returnTo || `${pathname}${window.location.search}`
  if (next && next !== MOBILE_V2_LOGIN_PATH) {
    params.set("returnTo", next)
  }
  const qs = params.toString()
  window.location.replace(qs ? `${MOBILE_V2_LOGIN_PATH}?${qs}` : MOBILE_V2_LOGIN_PATH)
}

export async function handleAuthFailure(returnTo?: string): Promise<void> {
  await clearSessionCookies()
  redirectToMobileV2Login(returnTo)
}
