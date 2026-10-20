import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "https://account-ms.fly.dev").replace(/\/$/, "")

/**
 * Legacy alias: PUT /api/apps/:id/products/:productId
 * Forwards to Product MS PUT /api/v1/products/toggle/:appId/:productId with `{ activate }`
 * (accepts `isActive` or `activate` in body for backward compatibility).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> },
) {
  try {
    const { id: appId, productId } = await params
    const authHeader = request.headers.get("authorization")

    if (!authHeader) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const activate =
      typeof body.activate === "boolean"
        ? body.activate
        : typeof body.isActive === "boolean"
          ? body.isActive
          : undefined

    if (typeof activate !== "boolean") {
      return NextResponse.json(
        { success: false, error: "activate or isActive must be a boolean" },
        { status: 400 },
      )
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
            "Failed to toggle product activation",
        },
        { status: response.status },
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error toggling product activation:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
