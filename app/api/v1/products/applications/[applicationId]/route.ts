import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "https://account-ms.fly.dev")
  .replace(/\/+$/, "")
  .replace(/\/api\/v\d+$/i, "")
  .replace(/\/api$/i, "")
  .replace(/\/+$/, "")

// GET /api/v1/products/applications/:applicationId
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  try {
    const { applicationId } = await params
    const authHeader = request.headers.get("authorization")

    if (!authHeader) {
      return NextResponse.json({ success: false, error: "Authorization required" }, { status: 401 })
    }

    const response = await fetch(`${BASE_URL}/api/v1/products/applications/${encodeURIComponent(applicationId)}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || data.message || "Failed to fetch product application" },
        { status: response.status || 502 },
      )
    }

    return NextResponse.json(data)
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || "Failed to fetch product application" },
      { status: 500 },
    )
  }
}

