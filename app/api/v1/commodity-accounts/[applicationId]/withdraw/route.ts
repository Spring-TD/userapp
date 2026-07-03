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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  try {
    const { applicationId } = await params
    const body = await request.text()
    const response = await fetch(
      `${getApiBaseUrl()}/api/v1/commodity-accounts/${encodeURIComponent(applicationId)}/withdraw`,
      {
        method: "POST",
        headers: proxyHeaders(request),
        body: body || "{}",
        cache: "no-store",
      },
    )
    const data = await response.json().catch(() => ({}))
    return NextResponse.json(data, { status: response.status || 200 })
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Commodity withdrawal failed" },
      { status: 502 },
    )
  }
}
