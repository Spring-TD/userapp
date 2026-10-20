import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "https://account-ms.fly.dev").replace(/\/$/, "")

/** PUT /api/v1/products/toggle/:appId/:productId — body `{ "activate": true | false }`. */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; productId: string }> },
) {
  try {
    const { appId, productId } = await params
    const authHeader = request.headers.get("authorization")

    if (!authHeader) {
      return NextResponse.json({ success: false, error: "Authorization required" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const activate = typeof body.activate === "boolean" ? body.activate : undefined

    if (typeof activate !== "boolean") {
      return NextResponse.json({ success: false, error: "activate must be a boolean" }, { status: 400 })
    }

    const response = await fetch(
      `${BASE_URL}/api/v1/products/toggle/${encodeURIComponent(appId)}/${encodeURIComponent(productId)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({ activate }),
      },
    )

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            (data as { error?: string }).error ||
            (data as { message?: string }).message ||
            "Failed to toggle product",
        },
        { status: response.status },
      )
    }

    return NextResponse.json(data)
  } catch (error: unknown) {
    console.error("[Products toggle] PUT error:", error)
    return NextResponse.json(
      { success: false, error: (error as Error).message || "Failed to toggle product" },
      { status: 500 },
    )
  }
}
