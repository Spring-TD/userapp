import { NextRequest, NextResponse } from "next/server"

import { getApiBaseUrl } from "@/lib/apiBaseUrl"
import { forwardStorefrontHeaders } from "@/lib/server/forwardStorefrontHeaders"

export const dynamic = "force-dynamic"

/** POST /api/v1/investment-accounts — provision investment account (mirrors savings). */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...forwardStorefrontHeaders(request),
    ...(authHeader ? { Authorization: authHeader } : {}),
  }

  try {
    const body = await request.text()
    const response = await fetch(`${getApiBaseUrl()}/api/v1/investment-accounts`, {
      method: "POST",
      headers,
      body: body || "{}",
      cache: "no-store",
    })
    const data = await response.json().catch(() => ({}))
    return NextResponse.json(data, { status: response.status || 200 })
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Investment account request failed",
      },
      { status: 502 },
    )
  }
}
