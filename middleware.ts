import { NextRequest, NextResponse } from "next/server"

const LOGIN_PATH = "/mobile-v2/auth/login"

function isAuthPublicPath(pathname: string): boolean {
  if (pathname === "/mobile-v2") return true
  return pathname.startsWith("/mobile-v2/auth/")
}

function isProtectedMobileV2Path(pathname: string): boolean {
  return pathname.startsWith("/mobile-v2") && !isAuthPublicPath(pathname)
}

function base64UrlToJson(value: string): Record<string, unknown> | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=")
    return JSON.parse(atob(padded)) as Record<string, unknown>
  } catch {
    return null
  }
}

function isExpiredJwt(accessToken: string): boolean {
  const parts = accessToken.split(".")
  if (parts.length !== 3) return true
  const payload = base64UrlToJson(parts[1])
  const exp = payload?.exp
  if (typeof exp !== "number") return false
  return exp * 1000 < Date.now()
}

function clearAuthCookies(response: NextResponse): void {
  response.cookies.set("accessToken", "", { path: "/", maxAge: 0 })
  response.cookies.set("refreshToken", "", { path: "/", maxAge: 0 })
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const accessToken = request.cookies.get("accessToken")?.value
  const isLoggedIn = Boolean(accessToken) && !isExpiredJwt(accessToken as string)

  if (!isLoggedIn && isProtectedMobileV2Path(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = LOGIN_PATH
    url.searchParams.set("returnTo", `${pathname}${request.nextUrl.search}`)
    const res = NextResponse.redirect(url)
    if (accessToken) clearAuthCookies(res)
    return res
  }

  if (isLoggedIn && pathname.startsWith("/mobile-v2/auth/login")) {
    const url = request.nextUrl.clone()
    url.pathname = "/mobile-v2/home"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/mobile-v2", "/mobile-v2/:path*"],
}
