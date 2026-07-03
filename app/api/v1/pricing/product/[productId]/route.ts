import { NextRequest, NextResponse } from "next/server"

import { getApiBaseUrl } from "@/lib/apiBaseUrl"
import { forwardStorefrontHeaders } from "@/lib/server/forwardStorefrontHeaders"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  const authHeader = request.headers.get("authorization")
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...forwardStorefrontHeaders(request),
    ...(authHeader ? { Authorization: authHeader } : {}),
  }

  try {
    const { productId } = await params
    const response = await fetch(
      `${getApiBaseUrl()}/api/v1/pricing/product/${encodeURIComponent(productId)}`,
      { method: "GET", headers, cache: "no-store" },
    )
    const data = await response.json().catch(() => ({}))
    return NextResponse.json(data, { status: response.status || 200 })
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load pricing" },
      { status: 502 },
    )
  }
}
