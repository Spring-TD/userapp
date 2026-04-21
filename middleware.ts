import { NextRequest, NextResponse } from "next/server"

const AUTH_PAGES = new Set([
  "/signin",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/spring/signin",
])

function isProtectedRoute(pathname: string): boolean {
  return pathname.startsWith("/dashboard")
}

function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.has(pathname)
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const accessToken = request.cookies.get("accessToken")?.value
  const isLoggedIn = Boolean(accessToken)

  if (!isLoggedIn && isProtectedRoute(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/signin"
    return NextResponse.redirect(url)
  }

  if (isLoggedIn && isAuthPage(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard/merchant"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/signin", "/signup", "/forgot-password", "/reset-password", "/spring/signin"],
}

