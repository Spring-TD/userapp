import { NextRequest, NextResponse } from "next/server"
import { BACKEND } from "@/lib/endpoints"
import { getApiBaseUrl } from "@/lib/apiBaseUrl"

export const dynamic = "force-dynamic"

/**
 * POST /api/v1/password/change/request-otp — Bearer.
 * Proxies to client-auth-ms (`NEXT_PUBLIC_API_URL`).
 */
export async function POST(request: NextRequest) {
  const cookieAccessToken = request.cookies.get("accessToken")?.value
  const authHeader =
    request.headers.get("Authorization") ||
    request.headers.get("authorization") ||
    (cookieAccessToken ? `Bearer ${cookieAccessToken}` : null)

  if (!authHeader) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const url = `${getApiBaseUrl()}${BACKEND.password.changeRequestOtp}`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && {
          Authorization: authHeader.startsWith("Bearer") ? authHeader : `Bearer ${authHeader}`,
        }),
      },
    })
    const data = await response.json().catch(() => ({ success: false, error: "Invalid JSON from backend" }))
    return NextResponse.json(data, { status: response.status || 502 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to request OTP"
    console.error("[password/change/request-otp]", message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
