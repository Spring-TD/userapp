import { NextRequest, NextResponse } from "next/server"
import { BACKEND } from "@/lib/endpoints"
import { getPlataAuthApiBaseUrl } from "@/lib/plataAuthBaseUrl"

export const dynamic = "force-dynamic"

/**
 * GET /api/v1/user/profile
 * PUT /api/v1/user/profile
 */
export async function GET(request: NextRequest) {
  try {
    const cookieAccessToken = request.cookies.get("accessToken")?.value
    const authHeader =
      request.headers.get("authorization") ||
      request.headers.get("Authorization") ||
      (cookieAccessToken ? `Bearer ${cookieAccessToken}` : null)
    const url = `${getPlataAuthApiBaseUrl().replace(/\/+$/, "")}${BACKEND.user.profile}`

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }),
      },
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || data.message || "Failed to fetch user profile" },
        { status: response.status || 502 },
      )
    }

    return NextResponse.json(data)
  } catch (error: unknown) {
    console.error("User profile proxy error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch user profile" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieAccessToken = request.cookies.get("accessToken")?.value
    const authHeader =
      request.headers.get("authorization") ||
      request.headers.get("Authorization") ||
      (cookieAccessToken ? `Bearer ${cookieAccessToken}` : null)
    const url = `${getPlataAuthApiBaseUrl().replace(/\/+$/, "")}${BACKEND.user.updateProfile}`
    const body = await request.json().catch(() => ({}))

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }),
      },
      body: JSON.stringify(body),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || data.message || "Failed to update user profile" },
        { status: response.status || 502 },
      )
    }

    return NextResponse.json(data)
  } catch (error: unknown) {
    console.error("User profile update proxy error:", error)
    return NextResponse.json({ success: false, error: "Failed to update user profile" }, { status: 500 })
  }
}

