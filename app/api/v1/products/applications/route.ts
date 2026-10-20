import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "https://account-ms.fly.dev").replace(/\/+$/, "")

/**
 * GET /api/v1/products/applications?userId=&appId=&status=&productType=&productId=
 * Rewrites to documented GET /api/v1/applications/user/{userId}.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ success: false, error: "Authorization required" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")?.trim()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId is required — list applications via GET /api/v1/applications/user/{userId}" },
        { status: 400 },
      )
    }

    const qs = new URLSearchParams()
    for (const key of ["status", "productType", "productId", "appId"] as const) {
      const value = searchParams.get(key)?.trim()
      if (value) qs.set(key, value)
    }
    const target = `${BASE_URL}/api/v1/applications/user/${encodeURIComponent(userId)}${qs.toString() ? `?${qs}` : ""}`

    const response = await fetch(target, {
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || data.message || "Failed to fetch product applications" },
        { status: response.status || 502 },
      )
    }

    return NextResponse.json(data)
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: (error as Error)?.message || "Failed to fetch product applications" }, { status: 500 })
  }
}

/** POST is not a storefront catalog operation — map leftovers to POST /api/v1/applications/init. */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ success: false, error: "Authorization required" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))

    const response = await fetch(`${BASE_URL}/api/v1/applications/init`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || data.message || "Failed to initialize application" },
        { status: response.status || 502 },
      )
    }

    return NextResponse.json(data)
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: (error as Error)?.message || "Failed to initialize application" }, { status: 500 })
  }
}
