import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import https from "https"
import dns from "dns"

import { getApiBaseUrl } from "@/lib/apiBaseUrl"
import { forwardStorefrontHeaders } from "@/lib/server/forwardStorefrontHeaders"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PRODUCT_SERVICE_URL = getApiBaseUrl()

const agent = new https.Agent({
  keepAlive: true,
  family: 4,
  // @ts-ignore - Node lookup signature compatibility
  lookup: (hostname: string, _options: unknown, cb: (err: NodeJS.ErrnoException | null, address: string, family: number) => void) =>
    dns.lookup(hostname, { family: 4 }, cb),
})

const http = axios.create({
  timeout: 30000,
  httpsAgent: agent,
  validateStatus: () => true,
  headers: { "Content-Type": "application/json" },
})

/**
 * GET /api/v1/products/app/:appId — app-scoped products from Product MS.
 * The client filters `isActive === true`; this endpoint may include inactive rows.
 * Does **not** fall back to the full catalog; use GET /api/v1/products for all products.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  const { appId } = await params
  const authHeader = request.headers.get("authorization")
  const headers: Record<string, string> = { ...forwardStorefrontHeaders(request) }
  if (authHeader) headers.Authorization = authHeader

  const appUrl = `${PRODUCT_SERVICE_URL}/api/v1/products/app/${encodeURIComponent(appId)}`

  try {
    const appResp = await http.get(appUrl, { headers })

    if (appResp.status >= 200 && appResp.status < 300) {
      return NextResponse.json(appResp.data)
    }

    const err = appResp.data
    return NextResponse.json(
      {
        success: false,
        error:
          (typeof err === "object" && err && "error" in err && (err as { error?: string }).error) ||
          (typeof err === "object" && err && "message" in err && (err as { message?: string }).message) ||
          "Failed to fetch active products for app",
      },
      { status: appResp.status || 502 },
    )
  } catch (error: unknown) {
    console.error("[Products app] GET error:", error)
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message || "Failed to fetch active products for app",
      },
      { status: 502 },
    )
  }
}
