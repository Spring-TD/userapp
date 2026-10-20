import { NextRequest, NextResponse } from "next/server"
import { BACKEND } from "@/lib/endpoints"

export const dynamic = "force-dynamic"

const AUTH_MS_URL = process.env.NEXT_PUBLIC_API_URL || "https://account-ms.fly.dev"

/**
 * DELETE /api/v1/sessions/{sessionId}
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> },
) {
  let timeout: ReturnType<typeof setTimeout> | null = null
  try {
    const controller = new AbortController()
    timeout = setTimeout(() => controller.abort(), 8000)

    const cookieAccessToken = request.cookies.get("accessToken")?.value
    const authHeader =
      request.headers.get("authorization") ||
      request.headers.get("Authorization") ||
      (cookieAccessToken ? `Bearer ${cookieAccessToken}` : null)
    const { sessionId } = await context.params
    const url = `${AUTH_MS_URL.replace(/\/+$/, "")}${BACKEND.sessions.revoke(sessionId)}`

    const response = await fetch(url, {
      method: "DELETE",
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
        return NextResponse.json({ success: true, data: {} }, { status: 200 })
      }
      return NextResponse.json(
        { success: false, error: data.error || data.message || "Failed to revoke session" },
        { status: response.status || 502 },
      )
    }

    return NextResponse.json(data)
  } catch (error: unknown) {
    console.error("Session revoke proxy error:", error)
    return NextResponse.json({ success: false, error: "Failed to revoke session", data: {} }, { status: 200 })
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

