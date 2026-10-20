import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// Proxies to backend GET /api/v1/keys
export async function GET(request: NextRequest) {
  try {
    const AUTH_MS_URL = process.env.NEXT_PUBLIC_API_URL || "https://account-ms.fly.dev"

    const cookieAccessToken = request.cookies.get("accessToken")?.value
    const authHeader =
      request.headers.get("authorization") ||
      request.headers.get("Authorization") ||
      (cookieAccessToken ? `Bearer ${cookieAccessToken}` : null)

    const url = `${AUTH_MS_URL.replace(/\/+$/, "")}/api/v1/keys`

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }),
      },
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status || 502 })
    }

    return NextResponse.json(data)
  } catch (error: unknown) {
    console.error("Keys proxy error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch keys" }, { status: 500 })
  }
}

