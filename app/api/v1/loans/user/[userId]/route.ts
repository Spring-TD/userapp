import { NextRequest, NextResponse } from "next/server"

import { forwardStorefrontHeaders } from "@/lib/server/forwardStorefrontHeaders"
import { getApiBaseUrl } from "@/lib/apiBaseUrl"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params
  const authHeader = request.headers.get("authorization")
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...forwardStorefrontHeaders(request),
  }
  if (authHeader) headers.Authorization = authHeader

  try {
    const url = `${getApiBaseUrl()}/api/v1/loans/user/${encodeURIComponent(userId)}`
    const resp = await fetch(url, { method: "GET", headers })
    const data = await resp.json().catch(() => ({}))
    return NextResponse.json(data, { status: resp.status })
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: (error as Error).message || "Failed to fetch loan accounts" },
      { status: 502 },
    )
  }
}
