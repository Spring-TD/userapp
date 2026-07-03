import { NextRequest, NextResponse } from "next/server"

import { getApiBaseUrl } from "@/lib/apiBaseUrl"
import { forwardStorefrontHeaders } from "@/lib/server/forwardStorefrontHeaders"

export const dynamic = "force-dynamic"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  try {
    const { applicationId } = await params
    const cookieAccessToken = request.cookies.get("accessToken")?.value
    const authHeader =
      request.headers.get("authorization") ||
      request.headers.get("Authorization") ||
      (cookieAccessToken ? `Bearer ${cookieAccessToken}` : null)

    if (!authHeader) {
      return NextResponse.json({ success: false, error: "Authorization required" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const target = `${getApiBaseUrl()}/api/v1/products/applications/${encodeURIComponent(applicationId)}/loan-workflow`

    const response = await fetch(target, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader.startsWith("Bearer ") ? authHeader : `Bearer ${authHeader}`,
        ...forwardStorefrontHeaders(request),
      },
      body: JSON.stringify(body),
    })

    const data = await response.json().catch(() => ({}))
    return NextResponse.json(data, { status: response.status || 200 })
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || "Failed to update loan workflow" },
      { status: 500 },
    )
  }
}
