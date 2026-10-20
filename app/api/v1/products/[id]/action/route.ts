import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// Product microservice base (proxy target)
const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "https://account-ms.fly.dev").replace(/\/+$/, "")

// GET /api/v1/products/:id/action
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const authHeader = request.headers.get("authorization")

    if (!authHeader) {
      return NextResponse.json({ success: false, error: "Authorization required" }, { status: 401 })
    }

    const response = await fetch(`${BASE_URL}/api/v1/products/${encodeURIComponent(id)}/action`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || data.message || "Failed to fetch product action" },
        { status: response.status || 502 },
      )
    }

    return NextResponse.json(data)
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: (error as Error)?.message || "Failed to fetch product action" }, { status: 500 })
  }
}

