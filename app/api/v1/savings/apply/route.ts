import { NextRequest, NextResponse } from "next/server"

import { forwardStorefrontHeaders } from "@/lib/server/forwardStorefrontHeaders"
import { getApiBaseUrl } from "@/lib/apiBaseUrl"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader) {
    return NextResponse.json({ success: false, error: "Authorization required" }, { status: 401 })
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...forwardStorefrontHeaders(request),
    Authorization: authHeader,
  }

  try {
    const body = await request.text()
    const url = `${getApiBaseUrl()}/api/v1/savings/apply`
    const resp = await fetch(url, { method: "POST", headers, body: body || "{}" })
    const data = await resp.json().catch(() => ({}))
    return NextResponse.json(data, { status: resp.status })
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: (error as Error).message || "Savings apply failed" },
      { status: 502 },
    )
  }
}
