import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "https://account-ms.fly.dev").replace(/\/+$/, "")

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Dynamic options proxy:
 * GET /api/configurations/options/:option
 * -> GET /api/v1/configurations/options/:option
 */
export async function GET(request: NextRequest, context: { params: Promise<{ option: string }> }) {
  try {
    const { option } = await context.params
    const authHeader = request.headers.get("authorization")
    const targetUrl = `${BASE_URL}/api/v1/configurations/options/${encodeURIComponent(option)}`
    const maxAttempts = 3
    let response: Response | null = null
    let lastError: unknown = null

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        response = await fetch(targetUrl, {
          headers: {
            "Content-Type": "application/json",
            ...(authHeader && { Authorization: authHeader }),
          },
        })
        break
      } catch (error) {
        lastError = error
        if (attempt < maxAttempts) {
          await sleep(attempt * 250)
          continue
        }
      }
    }

    if (!response) {
      throw lastError instanceof Error ? lastError : new Error("Failed to fetch options")
    }

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || data.message || `Failed to fetch ${option} options` },
        { status: response.status || 502 },
      )
    }

    return NextResponse.json(data)
  } catch (error: unknown) {
    console.error("Dynamic options proxy error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch options" }, { status: 500 })
  }
}
