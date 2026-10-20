import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "https://account-ms.fly.dev").replace(/\/+$/, "")
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type JsonBody = Record<string, unknown>

function shouldTryConfigurationsFallback(response: Response, data: JsonBody): boolean {
  if (response.status === 404) return true
  const msg = String(data?.error ?? data?.message ?? "").toLowerCase()
  if (!msg) return false
  return (
    msg.includes("route not found") ||
    msg.includes("endpoint not found") ||
    msg.includes("path not found") ||
    msg === "not found"
  )
}

function isUsableOptionsPayload(response: Response, data: JsonBody): boolean {
  if (!response.ok) return false
  if (data.success === false) return false
  return Array.isArray(data.data)
}

async function fetchUpstreamJson(
  targetUrl: string,
  authHeader: string | null,
): Promise<{ response: Response; data: JsonBody }> {
  const withAuthHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(authHeader ? { Authorization: authHeader } : {}),
  }
  const withoutAuthHeaders = { "Content-Type": "application/json" }

  let response = await fetch(targetUrl, { headers: withAuthHeaders })
  if (response.status === 404 && authHeader) {
    response = await fetch(targetUrl, { headers: withoutAuthHeaders })
  }
  const data = (await response.json().catch(() => ({}))) as JsonBody
  return { response, data }
}

/**
 * GET /api/v1/products/options/:option
 * Proxies to backend GET /api/v1/products/options/:option.
 * Several option slugs are only (or primarily) exposed under /api/v1/configurations/options/:option;
 * on 404 / "Route not found" we fall back there so the UI can load dropdowns without errors.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ option: string }> },
) {
  try {
    const { option } = await context.params
    const authHeader = request.headers.get("authorization")
    const queryString = request.nextUrl.searchParams.toString()
    const qs = queryString ? `?${queryString}` : ""

    const productsUrl = `${BASE_URL}/api/v1/products/options/${encodeURIComponent(option)}${qs}`
    const configurationsUrl = `${BASE_URL}/api/v1/configurations/options/${encodeURIComponent(option)}${qs}`

    const maxAttempts = 3
    let lastError: unknown = null
    let primary: { response: Response; data: JsonBody } | null = null

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        primary = await fetchUpstreamJson(productsUrl, authHeader)
        break
      } catch (error) {
        lastError = error
        if (attempt < maxAttempts) {
          await sleep(attempt * 250)
          continue
        }
      }
    }

    if (!primary) {
      throw lastError instanceof Error ? lastError : new Error("Failed to fetch product options")
    }

    const { response, data } = primary

    if (isUsableOptionsPayload(response, data)) {
      return NextResponse.json(data)
    }

    if (shouldTryConfigurationsFallback(response, data)) {
      const fallback = await fetchUpstreamJson(configurationsUrl, authHeader)
      if (isUsableOptionsPayload(fallback.response, fallback.data)) {
        return NextResponse.json(fallback.data)
      }
      // Neither products nor configurations expose this slug; return empty options (no client error).
      return NextResponse.json({ success: true, data: [] })
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: (data.error as string) || (data.message as string) || `Failed to fetch ${option} options`,
        },
        { status: response.status || 502 },
      )
    }

    if (data.success === false) {
      return NextResponse.json(
        {
          success: false,
          error: (data.error as string) || (data.message as string) || `Failed to fetch ${option} options`,
        },
        { status: 502 },
      )
    }

    return NextResponse.json({ success: true, data: [] })
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || "Failed to fetch product options" },
      { status: 500 },
    )
  }
}
