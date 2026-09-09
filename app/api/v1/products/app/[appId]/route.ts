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
  timeout: 60000,
  httpsAgent: agent,
  validateStatus: () => true,
  headers: { "Content-Type": "application/json" },
})

/**
 * GET /api/v1/products/app/:appId — storefront catalog for this tenant app.
 * Query: page (default 1), limit (default 20, max 100), type (LOAN|MORTGAGE|SAVINGS|INVESTMENT|COMMODITY).
 * Does **not** fall back to GET /api/v1/products (not in storefront swagger).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  const { appId } = await params
  const authHeader = request.headers.get("authorization")
  const headers: Record<string, string> = { ...forwardStorefrontHeaders(request) }
  if (authHeader) headers.Authorization = authHeader

  const incoming = request.nextUrl.searchParams
  const pageRaw = Number(incoming.get("page") || "1")
  const limitRaw = Number(incoming.get("limit") || "20")
  const qs = new URLSearchParams()
  qs.set("page", String(Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1))
  qs.set("limit", String(Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, Math.floor(limitRaw))) : 20))
  const type = incoming.get("type")?.trim()
  if (type && type.toLowerCase() !== "all") qs.set("type", type.toUpperCase())
  const url = `${PRODUCT_SERVICE_URL}/api/v1/products/app/${encodeURIComponent(appId)}?${qs.toString()}`

  try {
    const appResp = await http.get(url, { headers })

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
