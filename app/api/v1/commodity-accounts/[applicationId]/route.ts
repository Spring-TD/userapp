import { NextRequest, NextResponse } from "next/server"

import { getApiBaseUrl } from "@/lib/apiBaseUrl"
import { forwardStorefrontHeaders } from "@/lib/server/forwardStorefrontHeaders"

export const dynamic = "force-dynamic"

function proxyHeaders(request: NextRequest): Record<string, string> {
  const authHeader = request.headers.get("authorization")
  return {
    "Content-Type": "application/json",
    ...forwardStorefrontHeaders(request),
    ...(authHeader ? { Authorization: authHeader } : {}),
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  try {
    const { applicationId } = await params
    const qs = request.nextUrl.searchParams.toString()
    const response = await fetch(
      `${getApiBaseUrl()}/api/v1/commodity-accounts/${encodeURIComponent(applicationId)}${qs ? `?${qs}` : ""}`,
      {
        method: "GET",
        headers: proxyHeaders(request),
        cache: "no-store",
      },
    )
    const data = await response.json().catch(() => ({}))
    return NextResponse.json(data, { status: response.status || 200 })
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load commodity holding" },
      { status: 502 },
    )
  }
}
