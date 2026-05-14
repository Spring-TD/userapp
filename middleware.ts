import { NextResponse, type NextRequest } from "next/server"

/** Same cookie name as Spring / Plata frontends and `lib/cookieAuth.ts`. */
const ACCESS_COOKIE = "accessToken"
const MOBILE_V2_LOGIN = "/mobile-v2/auth/login"

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true
  if (pathname.startsWith("/verify-email")) return true
  if (pathname.startsWith("/verify-progress")) return true
  if (pathname.startsWith("/test-bypass")) return true
  return false
}

/** Storefront landing + full auth subtree (login, signup, OTP, reset, …). */
function isMobileV2PublicPath(pathname: string): boolean {
  if (pathname === "/mobile-v2" || pathname === "/mobile-v2/") return true
  if (pathname === "/mobile-v2/auth" || pathname.startsWith("/mobile-v2/auth/")) return true
  return false
}

function isMobileV2Protected(pathname: string): boolean {
  return pathname.startsWith("/mobile-v2") && !isMobileV2PublicPath(pathname)
}

function isLegacyMobilePublicPath(pathname: string): boolean {
  if (pathname === "/mobile" || pathname === "/mobile/") return true
  if (pathname === "/mobile/auth" || pathname.startsWith("/mobile/auth/")) return true
  return false
}

function isLegacyMobileProtected(pathname: string): boolean {
  if (!pathname.startsWith("/mobile")) return false
  return !isLegacyMobilePublicPath(pathname)
}

function isDashboardProtected(pathname: string): boolean {
  return pathname.startsWith("/dashboard")
}

/**
 * Logged-in users should not stay on auth screens (same idea as Spring/Plata).
 * Keep `/mobile-v2/auth/verify-otp` reachable with a cookie if the app sets tokens mid-flow.
 */
function shouldRedirectAuthenticatedFromMobileV2Auth(pathname: string): boolean {
  if (!pathname.startsWith("/mobile-v2/auth")) return false
  if (pathname.startsWith("/mobile-v2/auth/verify-otp")) return false
  return true
}

function buildLoginRedirect(request: NextRequest, originalPathname: string): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = MOBILE_V2_LOGIN
  url.search = ""
  const nextTarget = originalPathname + (request.nextUrl.search || "")
  if (nextTarget && nextTarget !== MOBILE_V2_LOGIN) {
    url.searchParams.set("next", nextTarget)
  }
  return NextResponse.redirect(url)
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value
  const isLoggedIn = Boolean(accessToken)

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const requiresAuth =
    isDashboardProtected(pathname) || isMobileV2Protected(pathname) || isLegacyMobileProtected(pathname)

  if (requiresAuth && !isLoggedIn) {
    return buildLoginRedirect(request, pathname)
  }

  if (isLoggedIn && shouldRedirectAuthenticatedFromMobileV2Auth(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/mobile-v2/home"
    url.search = ""
    return NextResponse.redirect(url)
  }

  if (isLoggedIn && (pathname === "/mobile/auth" || pathname.startsWith("/mobile/auth/"))) {
    const url = request.nextUrl.clone()
    url.pathname = "/mobile/home"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/mobile/:path*",
    "/mobile-v2/:path*",
    "/verify-email",
    "/verify-progress/:path*",
    "/test-bypass/:path*",
  ],
}
