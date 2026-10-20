import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PRODUCT_SERVICE_URL = (process.env.NEXT_PUBLIC_API_URL || "https://account-ms.fly.dev").replace(
  /\/$/,
  "",
)

/** Storefront has no product-builder pool — proxy the app catalog instead. */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const appId = request.nextUrl.searchParams.get("appId")?.trim()
    if (!appId) {
      return NextResponse.json(
        { success: false, error: "appId is required — storefront catalog is GET /api/v1/products/app/{appId}" },
        { status: 400 },
      )
    }

    const pageRaw = Number(request.nextUrl.searchParams.get("page") || "1")
    const limitRaw = Number(request.nextUrl.searchParams.get("limit") || "20")
    const qs = new URLSearchParams()
    qs.set("page", String(Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1))
    qs.set(
      "limit",
      String(Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, Math.floor(limitRaw))) : 20),
    )
    const type = request.nextUrl.searchParams.get("type")?.trim()
    if (type && type.toLowerCase() !== "all") qs.set("type", type.toUpperCase())

    const response = await fetch(
      `${PRODUCT_SERVICE_URL}/api/v1/products/app/${encodeURIComponent(appId)}?${qs.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
      },
    )

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: (data as { error?: string }).error || "Failed to fetch products" },
        { status: response.status },
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching storefront products:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
