import { NextRequest, NextResponse } from "next/server"
import { BACKEND } from "@/lib/endpoints"

export const dynamic = "force-dynamic"

const AUTH_MS_URL = process.env.NEXT_PUBLIC_API_URL || "https://account-ms.fly.dev"

/**
 * POST /api/v1/user/deactivate
 */
export async function POST(request: NextRequest) {
  try {
    const cookieAccessToken = request.cookies.get("accessToken")?.value
    const authHeader =
      request.headers.get("authorization") ||
      request.headers.get("Authorization") ||
      (cookieAccessToken ? `Bearer ${cookieAccessToken}` : null)
    const url = `${AUTH_MS_URL.replace(/\/+$/, "")}${BACKEND.user.deactivate}`
    const body = await request.json().catch(() => ({}))

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }),
      },
      body: JSON.stringify(body),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || data.message || "Failed to deactivate account" },
        { status: response.status || 502 },
      )
    }

    return NextResponse.json(data)
  } catch (error: unknown) {
    console.error("User deactivate proxy error:", error)
    return NextResponse.json({ success: false, error: "Failed to deactivate account" }, { status: 500 })
  }
}

