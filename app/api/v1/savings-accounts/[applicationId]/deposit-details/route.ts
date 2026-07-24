import { NextRequest, NextResponse } from "next/server"

import { getApiBaseUrl } from "@/lib/apiBaseUrl"
import { forwardStorefrontHeaders } from "@/lib/server/forwardStorefrontHeaders"

export const dynamic = "force-dynamic"

type RouteParams = { params: Promise<{ applicationId: string }> }

/** GET /api/v1/savings-accounts/:id/deposit-details?userId= */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { applicationId } = await params
  const authHeader = request.headers.get("authorization")
  const userId = request.nextUrl.searchParams.get("userId") || ""
  const qs = userId ? `?userId=${encodeURIComponent(userId)}` : ""

  const headers: Record<string, string> = {
    ...forwardStorefrontHeaders(request),
    ...(authHeader ? { Authorization: authHeader } : {}),
  }

  try {
    const response = await fetch(
      `${getApiBaseUrl()}/api/v1/savings-accounts/${encodeURIComponent(applicationId)}/deposit-details${qs}`,
      { method: "GET", headers, cache: "no-store" },
    )
    const data = await response.json().catch(() => ({}))
    return NextResponse.json(data, { status: response.status || 200 })
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Could not load deposit details",
      },
      { status: 502 },
    )
  }
}
