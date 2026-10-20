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

/** GET /api/v1/products/:id — product detail for the selected app product. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const authHeader = request.headers.get("authorization")
  const headers: Record<string, string> = { ...forwardStorefrontHeaders(request) }
  if (authHeader) headers.Authorization = authHeader

  const url = `${PRODUCT_SERVICE_URL}/api/v1/products/${encodeURIComponent(id)}`

  try {
    const response = await http.get(url, { headers })

    if (response.status >= 200 && response.status < 300) {
      return NextResponse.json(response.data)
    }

    const err = response.data
    return NextResponse.json(
      {
        success: false,
        error:
          (typeof err === "object" && err && "error" in err && (err as { error?: string }).error) ||
          (typeof err === "object" && err && "message" in err && (err as { message?: string }).message) ||
          "Product not found",
      },
      { status: response.status || 502 },
    )
  } catch (error: unknown) {
    console.error("[Product detail] GET error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch product detail",
      },
      { status: 502 },
    )
  }
}
