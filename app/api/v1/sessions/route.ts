import { NextRequest, NextResponse } from "next/server"
import { BACKEND } from "@/lib/endpoints"
import { getPlataAuthApiBaseUrl } from "@/lib/plataAuthBaseUrl"

export const dynamic = "force-dynamic"

/**
 * GET /api/v1/sessions
 */
export async function GET(request: NextRequest) {
  let timeout: ReturnType<typeof setTimeout> | null = null
  try {
    const controller = new AbortController()
    timeout = setTimeout(() => controller.abort(), 8000)

    const cookieAccessToken = request.cookies.get("accessToken")?.value
    const authHeader =
      request.headers.get("authorization") ||
      request.headers.get("Authorization") ||
      (cookieAccessToken ? `Bearer ${cookieAccessToken}` : null)
    const url = `${getPlataAuthApiBaseUrl().replace(/\/+$/, "")}${BACKEND.sessions.list}`

    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }),
      },
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const backendError = String(data?.error || data?.message || "")
      if (response.status === 404 || backendError.toLowerCase().includes("route not found")) {
        return NextResponse.json({ success: true, data: { sessions: [] } }, { status: 200 })
      }
      // Avoid breaking the UI on backend downtime / missing endpoint.
      return NextResponse.json(
        { success: false, error: data.error || data.message || "Failed to fetch sessions", data: { sessions: [] } },
        { status: 200 },
      )
    }

    return NextResponse.json(data)
  } catch (error: unknown) {
    // Avoid breaking the UI on backend timeout.
    console.error("Sessions proxy error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch sessions", data: { sessions: [] } }, { status: 200 })
  } finally {
    // Ensure timer is cleared in both success and failure paths.
    // (This file is small; keeping it explicit avoids dangling timeouts.)
    if (timeout) clearTimeout(timeout)
  }
}

