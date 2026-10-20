import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "https://account-ms.fly.dev").replace(/\/+$/, "")

// PUT /api/v1/products/:id/manage
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const authHeader = request.headers.get("authorization")

    if (!authHeader) {
      return NextResponse.json({ success: false, error: "Authorization required" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))

    const response = await fetch(`${BASE_URL}/api/v1/products/${encodeURIComponent(id)}/manage`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || data.message || "Failed to manage product" },
        { status: response.status || 502 },
      )
    }

    return NextResponse.json(data)
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: (error as Error)?.message || "Failed to manage product" }, { status: 500 })
  }
}

